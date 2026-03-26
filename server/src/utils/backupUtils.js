const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const Code = require('../models/Code');

const DATA_DIR = path.join(__dirname, '../../../data');

/**
 * 生成包含所有产品和编码的全量备份数据
 * @returns {Promise<Object>} 包含 version, timestamp, products, codes 的对象
 */
const generateBackupData = async () => {
  let backupData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    products: [],
    codes: []
  };

  if (process.env.MONGODB_URI) {
    // MongoDB 模式
    const products = await Product.find({}).lean();
    const codes = await Code.find({}).lean();
    
    backupData.products = products.map(p => {
      const doc = { ...p, id: p._id.toString() };
      delete doc._id;
      delete doc.__v;
      return doc;
    });
    
    backupData.codes = codes.map(c => {
      const doc = { ...c, id: c._id.toString(), productId: c.productId.toString() };
      delete doc._id;
      delete doc.__v;
      return doc;
    });
  } else {
    // 文件系统模式
    const productsFile = path.join(DATA_DIR, 'products.json');
    if (fs.existsSync(productsFile)) {
      backupData.products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
    }
    
    if (fs.existsSync(DATA_DIR)) {
      const files = fs.readdirSync(DATA_DIR);
      const codeFiles = files.filter(f => f.endsWith('_codes.json'));
      for (const file of codeFiles) {
        const productId = file.replace('_codes.json', '');
        const codesData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
        // 补充 productId
        const codesWithProductId = codesData.map(c => ({ ...c, productId }));
        backupData.codes = backupData.codes.concat(codesWithProductId);
      }
    }
  }

  return backupData;
};

/**
 * 执行数据恢复（清空并覆盖）
 * @param {Object} backupData 包含 products 和 codes 的备份对象
 * @returns {Promise<void>}
 */
const performRestore = async (backupData) => {
  if (!backupData.version || !Array.isArray(backupData.products) || !Array.isArray(backupData.codes)) {
    throw new Error('无效的备份文件格式');
  }

  if (process.env.MONGODB_URI) {
    // MongoDB 模式
    await Product.deleteMany({});
    await Code.deleteMany({});

    const idMap = {}; // oldId -> new ObjectId mapping

    const productsToInsert = backupData.products.map(p => {
      const isIdValid = mongoose.Types.ObjectId.isValid(p.id);
      const newId = isIdValid ? new mongoose.Types.ObjectId(p.id) : new mongoose.Types.ObjectId();
      if (!isIdValid) {
        idMap[p.id] = newId;
      }
      const doc = { ...p, _id: newId };
      delete doc.id;
      return doc;
    });

    const codesToInsert = backupData.codes.map(c => {
      const isIdValid = mongoose.Types.ObjectId.isValid(c.id);
      const newId = isIdValid ? new mongoose.Types.ObjectId(c.id) : new mongoose.Types.ObjectId();
      
      let mappedProductId;
      if (idMap[c.productId]) {
        mappedProductId = idMap[c.productId];
      } else if (mongoose.Types.ObjectId.isValid(c.productId)) {
        mappedProductId = new mongoose.Types.ObjectId(c.productId);
      } else {
        mappedProductId = new mongoose.Types.ObjectId(); // Fallback
      }

      const doc = { ...c, _id: newId, productId: mappedProductId };
      delete doc.id;
      return doc;
    });

    if (productsToInsert.length > 0) {
      await Product.insertMany(productsToInsert);
    }
    if (codesToInsert.length > 0) {
      await Code.insertMany(codesToInsert);
    }
  } else {
    // 文件系统模式
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // 清空现有的数据（仅限 products.json 和 *_codes.json）
    const files = fs.readdirSync(DATA_DIR);
    for (const file of files) {
      if (file === 'products.json' || file.endsWith('_codes.json')) {
        fs.unlinkSync(path.join(DATA_DIR, file));
      }
    }

    // 写入产品数据
    fs.writeFileSync(path.join(DATA_DIR, 'products.json'), JSON.stringify(backupData.products, null, 2));

    // 按产品分组写入编码数据
    const codesByProduct = {};
    backupData.products.forEach(p => {
      codesByProduct[p.id] = [];
    });

    backupData.codes.forEach(c => {
      if (!codesByProduct[c.productId]) {
        codesByProduct[c.productId] = [];
      }
      // 移除附加的 productId 字段以匹配原始文件系统格式
      const { productId, ...codeData } = c;
      codesByProduct[c.productId].push(codeData);
    });

    for (const [productId, codes] of Object.entries(codesByProduct)) {
      fs.writeFileSync(path.join(DATA_DIR, `${productId}_codes.json`), JSON.stringify(codes, null, 2));
    }
  }
};

module.exports = {
  generateBackupData,
  performRestore
};
