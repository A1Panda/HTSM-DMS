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
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 添加复合索引确保每个产品的编码唯一（仅针对未删除的）
// 注意：如果软删除后允许再次添加相同编码，索引需要调整。
// 这里暂时保持 unique: true，意味着即使软删除了，也不能添加重复的。
// 如果用户想要"删除后重新添加"，则需要永久删除或者修改索引条件。
// 为了简单起见，我们假设回收站里的东西也占位。
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
          
          // 过滤逻辑
          const showDeleted = query.deleted === true;
          
          return productCodes
            .map(code => ({ ...code, productId: query.productId }))
            .filter(code => !!code.deleted === showDeleted);
        }
        return [];
      }
      
      // 否则，加载所有产品的编码
      for (const product of products) {
        const codesFile = path.join(DATA_DIR, `${product.id}_codes.json`);
        if (fs.existsSync(codesFile)) {
          const codesData = fs.readFileSync(codesFile, 'utf8');
          const productCodes = JSON.parse(codesData);
          
           // 过滤逻辑
          const showDeleted = query.deleted === true;
          
          allCodes = allCodes.concat(
            productCodes
              .map(code => ({ ...code, productId: product.id }))
              .filter(code => !!code.deleted === showDeleted)
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
        deleted: false,
        createdAt: new Date().toISOString()
      };
      
      codes.push(newCode);
      fs.writeFileSync(codesFile, JSON.stringify(codes, null, 2));
      
      return { ...newCode, productId };
    },
    
    // 更新编码 (用于软删除/恢复)
    findByIdAndUpdate: async (id, updates, productId) => {
       const codesFile = path.join(DATA_DIR, `${productId}_codes.json`);
       if (!fs.existsSync(codesFile)) {
         return null;
       }

       const data = fs.readFileSync(codesFile, 'utf8');
       let codes = JSON.parse(data);
       
       const codeIndex = codes.findIndex(c => c.id === id);
       if (codeIndex === -1) {
         return null;
       }

       codes[codeIndex] = { ...codes[codeIndex], ...updates };
       fs.writeFileSync(codesFile, JSON.stringify(codes, null, 2));
       
       return { ...codes[codeIndex], productId };
    },

    // 永久删除编码
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
      
      // 使用上面定义的 find 方法，它已经处理了 query.deleted
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
