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

    // 构建产品数据
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

    // 批量插入产品
    if (productsToInsert.length > 0) {
      await Product.collection.insertMany(productsToInsert, { ordered: false });
    }

    // 收集本次导入中有效的 productId 集合（用于过滤孤立编码）
    const validProductIds = new Set(
      backupData.products.map(p => {
        const isIdValid = mongoose.Types.ObjectId.isValid(p.id);
        return isIdValid ? new mongoose.Types.ObjectId(p.id).toString() : (idMap[p.id] || '').toString();
      })
    );

    // 分批处理并插入编码（边处理边插入，避免中间数组占用双倍内存）
    const BATCH_SIZE = 10000;
    const MAX_RETRIES = 3;
    let orphanCount = 0;
    let insertedCount = 0;
    const totalCodes = backupData.codes.length;

    for (let i = 0; i < totalCodes; i += BATCH_SIZE) {
      const rawBatch = backupData.codes.slice(i, i + BATCH_SIZE);
      const docs = [];

      for (const c of rawBatch) {
        const isIdValid = mongoose.Types.ObjectId.isValid(c.id);
        const newId = isIdValid ? new mongoose.Types.ObjectId(c.id) : new mongoose.Types.ObjectId();

        let mappedProductId;
        if (idMap[c.productId]) {
          mappedProductId = idMap[c.productId];
        } else if (mongoose.Types.ObjectId.isValid(c.productId)) {
          mappedProductId = new mongoose.Types.ObjectId(c.productId);
        } else {
          mappedProductId = new mongoose.Types.ObjectId();
        }

        // 过滤孤立编码
        if (!validProductIds.has(mappedProductId.toString())) {
          orphanCount++;
          continue;
        }

        const doc = { ...c, _id: newId, productId: mappedProductId };
        delete doc.id;
        docs.push(doc);
      }

      if (docs.length === 0) continue;

      // 带重试的批量插入
      let inserted = false;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const result = await Code.collection.insertMany(docs, { ordered: false });
          insertedCount += result.insertedCount;
          inserted = true;
          break;
        } catch (batchError) {
          if (attempt < MAX_RETRIES) {
            console.warn(`[备份恢复] 第 ${Math.floor(i / BATCH_SIZE) + 1} 批插入失败，第 ${attempt} 次重试...`);
            await new Promise(r => setTimeout(r, 1000 * attempt)); // 退避重试
          } else {
            console.error(`[备份恢复] 第 ${Math.floor(i / BATCH_SIZE) + 1} 批插入失败（已重试 ${MAX_RETRIES} 次）:`, batchError.message);
            throw batchError; // 最终失败则抛出，停止导入
          }
        }
      }
      console.log(`[备份恢复] 编码导入进度: ${Math.min(i + BATCH_SIZE, totalCodes)}/${totalCodes} (已写入 ${insertedCount})`);
    }

    if (orphanCount > 0) {
      console.warn(`[备份恢复] 检测到 ${orphanCount} 条孤立编码（无对应产品），已自动跳过`);
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

    // 收集有效的 productId 集合（用于过滤孤立编码）
    const validProductIds = new Set(backupData.products.map(p => p.id));

    // 写入产品数据
    fs.writeFileSync(path.join(DATA_DIR, 'products.json'), JSON.stringify(backupData.products, null, 2));

    // 按产品分组写入编码数据，过滤孤立编码
    let orphanCount = 0;
    const codesByProduct = {};
    backupData.products.forEach(p => {
      codesByProduct[p.id] = [];
    });

    backupData.codes.forEach(c => {
      if (!validProductIds.has(c.productId)) {
        orphanCount++;
        return;
      }
      if (!codesByProduct[c.productId]) {
        codesByProduct[c.productId] = [];
      }
      // 移除附加的 productId 字段以匹配原始文件系统格式
      const { productId, ...codeData } = c;
      codesByProduct[c.productId].push(codeData);
    });

    if (orphanCount > 0) {
      console.warn(`[备份恢复] 检测到 ${orphanCount} 条孤立编码（无对应产品），已自动跳过`);
    }

    for (const [productId, codes] of Object.entries(codesByProduct)) {
      fs.writeFileSync(path.join(DATA_DIR, `${productId}_codes.json`), JSON.stringify(codes, null, 2));
    }
  }
};

module.exports = {
  generateBackupData,
  performRestore
};
