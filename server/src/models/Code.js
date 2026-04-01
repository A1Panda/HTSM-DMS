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

// 确保在转换为 JSON 时包含 id 字段（将 _id 映射为 id）
codeSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
    return ret;
  }
});

// 添加分页静态方法
codeSchema.statics.paginate = async function(query = {}, options = {}) {
  const { page = 1, limit = 1000 } = options;
  const skip = (page - 1) * limit;
  const [codes, total] = await Promise.all([
    this.find(query).skip(skip).limit(limit).exec(),
    this.countDocuments(query).exec()
  ]);
  return {
    codes,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

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

      // 辅助过滤函数
      const matchQuery = (code) => {
        // 1. deleted 状态匹配
        if (query.deleted !== undefined) {
          if (!!code.deleted !== query.deleted) return false;
        }

        // 2. code 范围匹配 (字符串比较)
        if (query.code) {
          if (query.code.$gte && code.code < query.code.$gte) return false;
          if (query.code.$lte && code.code > query.code.$lte) return false;
        }

        // 3. 日期范围匹配 (createdAt 或 date)
        if (query.$or && query.$or.length > 0 && query.$or[0].createdAt) {
          const dateFilters = query.$or;
          let dateMatch = false;
          
          for (const filter of dateFilters) {
            if (filter.createdAt) {
              const codeDate = new Date(code.createdAt);
              let match = true;
              if (filter.createdAt.$gte && codeDate < filter.createdAt.$gte) match = false;
              if (filter.createdAt.$lte && codeDate > filter.createdAt.$lte) match = false;
              if (match) {
                dateMatch = true;
                break;
              }
            } else if (filter.date) {
              let match = true;
              if (filter.date.$gte && code.date < filter.date.$gte) match = false;
              if (filter.date.$lte && code.date > filter.date.$lte) match = false;
              if (match) {
                dateMatch = true;
                break;
              }
            }
          }
          if (!dateMatch) return false;
        }

        // 4. $or 关键字匹配 (正则表达式) 或者 $and 组合匹配
        let keywordFilters = null;
        if (query.$and) {
          // 如果使用了 $and，找到包含关键字 $regex 的那个 $or
          const keywordOrObj = query.$and.find(cond => 
            cond.$or && cond.$or.length > 0 && cond.$or[0].code && cond.$or[0].code.$regex
          );
          if (keywordOrObj) keywordFilters = keywordOrObj.$or;
        } else if (query.$or && query.$or.length > 0 && query.$or[0].code && query.$or[0].code.$regex) {
          keywordFilters = query.$or;
        }

        if (keywordFilters) {
          const keyword = keywordFilters[0].code.$regex;
          if (keyword) {
            const regex = new RegExp(keyword, 'i');
            if (!regex.test(code.code) && !regex.test(code.description)) {
              return false;
            }
          }
        }

        return true;
      };
      
      // 如果指定了产品ID，只加载该产品的编码
      if (query.productId) {
        const codesFile = path.join(DATA_DIR, `${query.productId}_codes.json`);
        if (fs.existsSync(codesFile)) {
          const codesData = fs.readFileSync(codesFile, 'utf8');
          const productCodes = JSON.parse(codesData);
          
          return productCodes
            .map(code => ({ ...code, productId: query.productId }))
            .filter(matchQuery);
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
            productCodes
              .map(code => ({ ...code, productId: product.id }))
              .filter(matchQuery)
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
