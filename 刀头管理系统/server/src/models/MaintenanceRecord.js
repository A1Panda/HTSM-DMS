const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 定义维护记录模式
const maintenanceRecordSchema = new mongoose.Schema({
  toolHeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ToolHead',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['磨刀', '重磨', '涂层修复', '清洁', '检查', '校正', '换刃', '其他'],
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  cost: {
    type: Number,
    min: 0,
    default: 0
  },
  technician: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  vendor: {
    type: String,
    trim: true,
    index: true
  },
  beforeCondition: {
    type: String,
    trim: true
  },
  afterCondition: {
    type: String,
    trim: true
  },
  beforeImages: [{
    type: String
  }],
  afterImages: [{
    type: String
  }],
  measurementsBefore: {
    diameter: Number,
    length: Number,
    sharpness: Number,
    wear: String
  },
  measurementsAfter: {
    diameter: Number,
    length: Number,
    sharpness: Number,
    wear: String
  },
  nextMaintenanceDate: {
    type: Date,
    index: true
  },
  warrantyPeriod: {
    type: Number,
    min: 0,
    default: 0
  },
  qualityCheck: {
    passed: { type: Boolean, default: true },
    inspector: String,
    inspectionDate: Date,
    notes: String
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['计划中', '进行中', '已完成', '质检中', '质检通过', '质检失败'],
    default: '计划中',
    index: true
  },
  priority: {
    type: String,
    enum: ['低', '中', '高', '紧急'],
    default: '中',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间中间件
maintenanceRecordSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // 如果状态变为已完成，设置完成时间
  if (this.status === '已完成' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  next();
});

// 虚拟属性：维护时长
maintenanceRecordSchema.virtual('duration').get(function() {
  if (this.completedAt && this.createdAt) {
    return Math.ceil((this.completedAt - this.createdAt) / (1000 * 60 * 60)); // 小时
  }
  return null;
});

// 虚拟属性：是否过期
maintenanceRecordSchema.virtual('isOverdue').get(function() {
  if (this.nextMaintenanceDate && this.status !== '已完成') {
    return new Date() > this.nextMaintenanceDate;
  }
  return false;
});

// 实例方法：开始维护
maintenanceRecordSchema.methods.start = function(technician) {
  this.status = '进行中';
  this.technician = technician || this.technician;
  return this.save();
};

// 实例方法：完成维护
maintenanceRecordSchema.methods.complete = function(afterCondition, cost) {
  this.status = '已完成';
  this.completedAt = new Date();
  if (afterCondition) this.afterCondition = afterCondition;
  if (cost !== undefined) this.cost = cost;
  return this.save();
};

// 静态方法：按类型统计
maintenanceRecordSchema.statics.getStatsByType = async function(startDate, endDate) {
  const matchCondition = {};
  if (startDate && endDate) {
    matchCondition.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalCost: { $sum: '$cost' },
        averageCost: { $avg: '$cost' },
        completedCount: {
          $sum: {
            $cond: [{ $eq: ['$status', '已完成'] }, 1, 0]
          }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// 静态方法：按技术员统计
maintenanceRecordSchema.statics.getStatsByTechnician = async function(startDate, endDate) {
  const matchCondition = {};
  if (startDate && endDate) {
    matchCondition.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$technician',
        count: { $sum: 1 },
        totalCost: { $sum: '$cost' },
        completedCount: {
          $sum: {
            $cond: [{ $eq: ['$status', '已完成'] }, 1, 0]
          }
        }
      }
    },
    {
      $addFields: {
        completionRate: {
          $multiply: [
            { $divide: ['$completedCount', '$count'] },
            100
          ]
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// 如果MongoDB可用，使用Mongoose模型
let MaintenanceRecord;
if (process.env.MONGODB_URI) {
  MaintenanceRecord = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);
} else {
  // 否则使用文件系统存储
  const DATA_DIR = path.join(__dirname, '../../../data');
  
  // 文件系统版本的维护记录模型
  MaintenanceRecord = {
    // 获取所有维护记录
    find: async (query = {}) => {
      const recordsFile = path.join(DATA_DIR, 'maintenance_records.json');
      if (fs.existsSync(recordsFile)) {
        const data = fs.readFileSync(recordsFile, 'utf8');
        let records = JSON.parse(data);
        
        // 简单的查询过滤
        if (Object.keys(query).length > 0) {
          records = records.filter(record => {
            return Object.keys(query).every(key => {
              if (typeof query[key] === 'object' && query[key].$regex) {
                const regex = new RegExp(query[key].$regex, query[key].$options || '');
                return regex.test(record[key]);
              }
              return record[key] === query[key];
            });
          });
        }
        
        return records;
      }
      return [];
    },
    
    // 根据ID查找记录
    findById: async (id) => {
      const recordsFile = path.join(DATA_DIR, 'maintenance_records.json');
      if (fs.existsSync(recordsFile)) {
        const data = fs.readFileSync(recordsFile, 'utf8');
        const records = JSON.parse(data);
        return records.find(r => r.id === id) || null;
      }
      return null;
    },
    
    // 创建新维护记录
    create: async (recordData) => {
      const recordsFile = path.join(DATA_DIR, 'maintenance_records.json');
      let records = [];
      
      if (fs.existsSync(recordsFile)) {
        const data = fs.readFileSync(recordsFile, 'utf8');
        records = JSON.parse(data);
      }
      
      const newRecord = {
        id: Date.now().toString(),
        ...recordData,
        status: recordData.status || '计划中',
        priority: recordData.priority || '中',
        cost: recordData.cost || 0,
        warrantyPeriod: recordData.warrantyPeriod || 0,
        qualityCheck: recordData.qualityCheck || { passed: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      records.push(newRecord);
      fs.writeFileSync(recordsFile, JSON.stringify(records, null, 2));
      
      return newRecord;
    },
    
    // 更新维护记录
    findByIdAndUpdate: async (id, updateData, options = {}) => {
      const recordsFile = path.join(DATA_DIR, 'maintenance_records.json');
      if (!fs.existsSync(recordsFile)) {
        return null;
      }
      
      const data = fs.readFileSync(recordsFile, 'utf8');
      let records = JSON.parse(data);
      
      const index = records.findIndex(r => r.id === id);
      if (index === -1) {
        return null;
      }
      
      // 更新数据
      const oldStatus = records[index].status;
      records[index] = {
        ...records[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      // 如果状态变为已完成，设置完成时间
      if (records[index].status === '已完成' && oldStatus !== '已完成') {
        records[index].completedAt = new Date().toISOString();
      }
      
      fs.writeFileSync(recordsFile, JSON.stringify(records, null, 2));
      
      return records[index];
    },
    
    // 删除维护记录
    findByIdAndDelete: async (id) => {
      const recordsFile = path.join(DATA_DIR, 'maintenance_records.json');
      if (!fs.existsSync(recordsFile)) {
        return null;
      }
      
      const data = fs.readFileSync(recordsFile, 'utf8');
      let records = JSON.parse(data);
      
      const recordToDelete = records.find(r => r.id === id);
      if (!recordToDelete) {
        return null;
      }
      
      records = records.filter(r => r.id !== id);
      fs.writeFileSync(recordsFile, JSON.stringify(records, null, 2));
      
      return recordToDelete;
    },
    
    // 分页查询
    paginate: async (query = {}, options = {}) => {
      const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
      const skip = (page - 1) * limit;
      
      const allRecords = await MaintenanceRecord.find(query);
      const total = allRecords.length;
      
      // 排序
      const sortKey = Object.keys(sort)[0];
      const sortOrder = sort[sortKey];
      allRecords.sort((a, b) => {
        if (sortOrder === 1) {
          return a[sortKey] > b[sortKey] ? 1 : -1;
        } else {
          return a[sortKey] < b[sortKey] ? 1 : -1;
        }
      });
      
      const paginatedRecords = allRecords.slice(skip, skip + limit);
      
      return {
        docs: paginatedRecords,
        totalDocs: total,
        limit,
        page,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      };
    },
    
    // 按类型统计
    getStatsByType: async (startDate, endDate) => {
      let records = await MaintenanceRecord.find();
      
      // 日期过滤
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        records = records.filter(record => {
          const recordDate = new Date(record.createdAt);
          return recordDate >= start && recordDate <= end;
        });
      }
      
      const stats = {};
      records.forEach(record => {
        const type = record.type;
        if (!stats[type]) {
          stats[type] = {
            _id: type,
            count: 0,
            totalCost: 0,
            completedCount: 0
          };
        }
        
        stats[type].count++;
        stats[type].totalCost += record.cost || 0;
        
        if (record.status === '已完成') {
          stats[type].completedCount++;
        }
      });
      
      // 计算平均成本
      Object.values(stats).forEach(stat => {
        stat.averageCost = stat.count > 0 ? stat.totalCost / stat.count : 0;
      });
      
      return Object.values(stats).sort((a, b) => b.count - a.count);
    },
    
    // 按技术员统计
    getStatsByTechnician: async (startDate, endDate) => {
      let records = await MaintenanceRecord.find();
      
      // 日期过滤
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        records = records.filter(record => {
          const recordDate = new Date(record.createdAt);
          return recordDate >= start && recordDate <= end;
        });
      }
      
      const stats = {};
      records.forEach(record => {
        const technician = record.technician;
        if (!stats[technician]) {
          stats[technician] = {
            _id: technician,
            count: 0,
            totalCost: 0,
            completedCount: 0
          };
        }
        
        stats[technician].count++;
        stats[technician].totalCost += record.cost || 0;
        
        if (record.status === '已完成') {
          stats[technician].completedCount++;
        }
      });
      
      // 计算完成率
      Object.values(stats).forEach(stat => {
        stat.completionRate = stat.count > 0 ? (stat.completedCount / stat.count) * 100 : 0;
      });
      
      return Object.values(stats).sort((a, b) => b.count - a.count);
    }
  };
}

module.exports = MaintenanceRecord;
