const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 定义供应商模式
const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  contact: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    trim: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  paymentTerms: {
    type: String,
    enum: ['现金', '月结', '季结', '半年结', '年结', '其他'],
    default: '月结'
  },
  deliveryTime: {
    type: Number,
    min: 0,
    default: 7
  },
  qualityGrade: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    default: 'B',
    index: true
  },
  certifications: [{
    name: String,
    number: String,
    validUntil: Date
  }],
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['活跃', '暂停', '黑名单'],
    default: '活跃',
    index: true
  },
  // 统计信息
  totalOrders: {
    type: Number,
    min: 0,
    default: 0
  },
  totalAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  onTimeDeliveryRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  qualityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  lastOrderDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间中间件
supplierSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 虚拟属性：综合评分
supplierSchema.virtual('overallScore').get(function() {
  const ratingScore = (this.rating / 5) * 30;
  const qualityScore = (this.qualityScore / 100) * 40;
  const deliveryScore = (this.onTimeDeliveryRate / 100) * 30;
  
  return Math.round(ratingScore + qualityScore + deliveryScore);
});

// 实例方法：更新评分
supplierSchema.methods.updateRating = function(newRating) {
  this.rating = Math.max(1, Math.min(5, newRating));
  return this.save();
};

// 实例方法：记录订单
supplierSchema.methods.recordOrder = function(amount, onTime = true) {
  this.totalOrders += 1;
  this.totalAmount += amount;
  this.lastOrderDate = new Date();
  
  // 更新准时交货率
  const oldRate = this.onTimeDeliveryRate;
  const oldTotal = this.totalOrders - 1;
  const onTimeCount = Math.round((oldRate / 100) * oldTotal) + (onTime ? 1 : 0);
  this.onTimeDeliveryRate = (onTimeCount / this.totalOrders) * 100;
  
  return this.save();
};

// 静态方法：按等级统计
supplierSchema.statics.getStatsByGrade = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$qualityGrade',
        count: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        totalAmount: { $sum: '$totalAmount' }
      }
    },
    { $sort: { '_id': 1 } }
  ]);
};

// 静态方法：获取TOP供应商
supplierSchema.statics.getTopSuppliers = async function(limit = 10) {
  return this.find({ status: '活跃' })
    .sort({ totalAmount: -1, rating: -1 })
    .limit(limit);
};

// 如果MongoDB可用，使用Mongoose模型
let Supplier;
if (process.env.MONGODB_URI) {
  Supplier = mongoose.model('Supplier', supplierSchema);
} else {
  // 否则使用文件系统存储
  const DATA_DIR = path.join(__dirname, '../../../data');
  
  // 文件系统版本的供应商模型
  Supplier = {
    // 获取所有供应商
    find: async (query = {}) => {
      const suppliersFile = path.join(DATA_DIR, 'suppliers.json');
      if (fs.existsSync(suppliersFile)) {
        const data = fs.readFileSync(suppliersFile, 'utf8');
        let suppliers = JSON.parse(data);
        
        // 简单的查询过滤
        if (Object.keys(query).length > 0) {
          suppliers = suppliers.filter(supplier => {
            return Object.keys(query).every(key => {
              if (typeof query[key] === 'object' && query[key].$regex) {
                const regex = new RegExp(query[key].$regex, query[key].$options || '');
                return regex.test(supplier[key]);
              }
              return supplier[key] === query[key];
            });
          });
        }
        
        return suppliers;
      }
      return [];
    },
    
    // 根据ID查找供应商
    findById: async (id) => {
      const suppliersFile = path.join(DATA_DIR, 'suppliers.json');
      if (fs.existsSync(suppliersFile)) {
        const data = fs.readFileSync(suppliersFile, 'utf8');
        const suppliers = JSON.parse(data);
        return suppliers.find(s => s.id === id) || null;
      }
      return null;
    },
    
    // 根据条件查找单个供应商
    findOne: async (query) => {
      const suppliersFile = path.join(DATA_DIR, 'suppliers.json');
      if (fs.existsSync(suppliersFile)) {
        const data = fs.readFileSync(suppliersFile, 'utf8');
        const suppliers = JSON.parse(data);
        return suppliers.find(s => {
          return Object.keys(query).every(key => s[key] === query[key]);
        }) || null;
      }
      return null;
    },
    
    // 创建新供应商
    create: async (supplierData) => {
      const suppliersFile = path.join(DATA_DIR, 'suppliers.json');
      let suppliers = [];
      
      if (fs.existsSync(suppliersFile)) {
        const data = fs.readFileSync(suppliersFile, 'utf8');
        suppliers = JSON.parse(data);
      }
      
      // 检查名称和编码是否已存在
      const existingByName = suppliers.find(s => s.name === supplierData.name);
      const existingByCode = suppliers.find(s => s.code === supplierData.code);
      
      if (existingByName) {
        throw new Error('供应商名称已存在');
      }
      if (existingByCode) {
        throw new Error('供应商编码已存在');
      }
      
      const newSupplier = {
        id: Date.now().toString(),
        ...supplierData,
        status: supplierData.status || '活跃',
        rating: supplierData.rating || 3,
        paymentTerms: supplierData.paymentTerms || '月结',
        deliveryTime: supplierData.deliveryTime || 7,
        qualityGrade: supplierData.qualityGrade || 'B',
        totalOrders: 0,
        totalAmount: 0,
        onTimeDeliveryRate: 0,
        qualityScore: 0,
        certifications: supplierData.certifications || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      suppliers.push(newSupplier);
      fs.writeFileSync(suppliersFile, JSON.stringify(suppliers, null, 2));
      
      return newSupplier;
    },
    
    // 更新供应商
    findByIdAndUpdate: async (id, updateData, options = {}) => {
      const suppliersFile = path.join(DATA_DIR, 'suppliers.json');
      if (!fs.existsSync(suppliersFile)) {
        return null;
      }
      
      const data = fs.readFileSync(suppliersFile, 'utf8');
      let suppliers = JSON.parse(data);
      
      const index = suppliers.findIndex(s => s.id === id);
      if (index === -1) {
        return null;
      }
      
      // 更新数据
      suppliers[index] = {
        ...suppliers[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(suppliersFile, JSON.stringify(suppliers, null, 2));
      
      return suppliers[index];
    },
    
    // 删除供应商
    findByIdAndDelete: async (id) => {
      const suppliersFile = path.join(DATA_DIR, 'suppliers.json');
      if (!fs.existsSync(suppliersFile)) {
        return null;
      }
      
      const data = fs.readFileSync(suppliersFile, 'utf8');
      let suppliers = JSON.parse(data);
      
      const supplierToDelete = suppliers.find(s => s.id === id);
      if (!supplierToDelete) {
        return null;
      }
      
      suppliers = suppliers.filter(s => s.id !== id);
      fs.writeFileSync(suppliersFile, JSON.stringify(suppliers, null, 2));
      
      return supplierToDelete;
    },
    
    // 分页查询
    paginate: async (query = {}, options = {}) => {
      const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
      const skip = (page - 1) * limit;
      
      const allSuppliers = await Supplier.find(query);
      const total = allSuppliers.length;
      
      // 排序
      const sortKey = Object.keys(sort)[0];
      const sortOrder = sort[sortKey];
      allSuppliers.sort((a, b) => {
        if (sortOrder === 1) {
          return a[sortKey] > b[sortKey] ? 1 : -1;
        } else {
          return a[sortKey] < b[sortKey] ? 1 : -1;
        }
      });
      
      const paginatedSuppliers = allSuppliers.slice(skip, skip + limit);
      
      return {
        docs: paginatedSuppliers,
        totalDocs: total,
        limit,
        page,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      };
    },
    
    // 按等级统计
    getStatsByGrade: async () => {
      const suppliers = await Supplier.find();
      const stats = {};
      
      suppliers.forEach(supplier => {
        const grade = supplier.qualityGrade || 'B';
        if (!stats[grade]) {
          stats[grade] = {
            _id: grade,
            count: 0,
            ratingSum: 0,
            totalAmount: 0
          };
        }
        
        stats[grade].count++;
        stats[grade].ratingSum += supplier.rating || 3;
        stats[grade].totalAmount += supplier.totalAmount || 0;
      });
      
      // 计算平均评分
      Object.values(stats).forEach(stat => {
        stat.averageRating = stat.count > 0 ? stat.ratingSum / stat.count : 0;
        delete stat.ratingSum;
      });
      
      return Object.values(stats).sort((a, b) => a._id.localeCompare(b._id));
    },
    
    // 获取TOP供应商
    getTopSuppliers: async (limit = 10) => {
      const suppliers = await Supplier.find({ status: '活跃' });
      
      return suppliers
        .sort((a, b) => {
          // 先按总金额排序，再按评分排序
          if (b.totalAmount !== a.totalAmount) {
            return b.totalAmount - a.totalAmount;
          }
          return b.rating - a.rating;
        })
        .slice(0, limit);
    }
  };
}

module.exports = Supplier;
