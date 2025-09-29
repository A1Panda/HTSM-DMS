const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 定义编码模式
const codeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  date: {
    type: String,
    default: ''
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 添加复合索引确保每个产品的编码唯一
codeSchema.index({ code: 1, productId: 1 }, { unique: true });

// 如果MongoDB可用，使用Mongoose模型
let Code;
if (process.env.MONGODB_URI) {
  Code = mongoose.model('Code', codeSchema);
} else {
  // 否则使用文件系统存储
  const DATA_DIR = path.join(__dirname, '../../../data');
  
  // 文件系统版本的编码模型
  Code = {
    // 获取所有编码
    find: async (query = {}) => {
      const productsFile = path.join(DATA_DIR, 'products.json');
      if (!fs.existsSync(productsFile)) {
        return [];
      }
      
      const data = fs.readFileSync(productsFile, 'utf8');
      const products = JSON.parse(data);
      let allCodes = [];
      
      // 如果指定了产品ID，只加载该产品的编码
      if (query.productId) {
        const codesFile = path.join(DATA_DIR, `${query.productId}_codes.json`);
        if (fs.existsSync(codesFile)) {
          const codesData = fs.readFileSync(codesFile, 'utf8');
          const productCodes = JSON.parse(codesData);
          return productCodes.map(code => ({
            ...code,
            productId: query.productId
          }));
        }
        return [];
      }
      
      // 否则，加载所有产品的编码
      for (const product of products) {
        const codesFile = path.join(DATA_DIR, `${product.id}_codes.json`);
        if (fs.existsSync(codesFile)) {
          const codesData = fs.readFileSync(codesFile, 'utf8');
          const productCodes = JSON.parse(codesData);
          allCodes = allCodes.concat(
            productCodes.map(code => ({
              ...code,
              productId: product.id
            }))
          );
        }
      }
      
      return allCodes;
    },
    
    // 创建新编码
    create: async (codeData) => {
      const { productId } = codeData;
      const codesFile = path.join(DATA_DIR, `${productId}_codes.json`);
      let codes = [];
      
      if (fs.existsSync(codesFile)) {
        const data = fs.readFileSync(codesFile, 'utf8');
        codes = JSON.parse(data);
      }
      
      // 检查编码是否已存在
      const existingCode = codes.find(c => c.code === codeData.code);
      if (existingCode) {
        throw new Error('编码已存在');
      }
      
      const newCode = {
        id: Date.now().toString(),
        code: codeData.code,
        description: codeData.description || '',
        date: codeData.date || '',
        createdAt: new Date().toISOString()
      };
      
      codes.push(newCode);
      fs.writeFileSync(codesFile, JSON.stringify(codes, null, 2));
      
      return { ...newCode, productId };
    },
    
    // 删除编码
    findByIdAndDelete: async (id, productId) => {
      const codesFile = path.join(DATA_DIR, `${productId}_codes.json`);
      if (!fs.existsSync(codesFile)) {
        return null;
      }
      
      const data = fs.readFileSync(codesFile, 'utf8');
      let codes = JSON.parse(data);
      
      const codeToDelete = codes.find(c => c.id === id);
      if (!codeToDelete) {
        return null;
      }
      
      codes = codes.filter(c => c.id !== id);
      fs.writeFileSync(codesFile, JSON.stringify(codes, null, 2));
      
      return { ...codeToDelete, productId };
    },
    
    // 分页查询
    paginate: async (query = {}, options = {}) => {
      const { page = 1, limit = 1000 } = options;
      const skip = (page - 1) * limit;
      
      const allCodes = await Code.find(query);
      const total = allCodes.length;
      const paginatedCodes = allCodes.slice(skip, skip + limit);
      
      return {
        codes: paginatedCodes,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    }
  };
}

module.exports = Code;