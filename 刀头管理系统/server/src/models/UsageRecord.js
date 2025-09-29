const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 定义使用记录模式
const usageRecordSchema = new mongoose.Schema({
  toolHeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ToolHead',
    required: true,
    index: true
  },
  operator: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  operatorId: {
    type: String,
    trim: true,
    index: true
  },
  machine: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  workpiece: {
    type: String,
    required: true,
    trim: true
  },
  workOrder: {
    type: String,
    trim: true,
    index: true
  },
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: {
    type: Date,
    index: true
  },
  usageHours: {
    type: Number,
    min: 0,
    default: 0
  },
  cuttingSpeed: {
    type: Number,
    min: 0,
    default: 0
  },
  feedRate: {
    type: Number,
    min: 0,
    default: 0
  },
  cuttingDepth: {
    type: Number,
    min: 0,
    default: 0
  },
  coolantType: {
    type: String,
    enum: ['无', '水溶性', '油性', '气体', '其他'],
    default: '无'
  },
  wearLevel: {
    type: String,
    enum: ['无磨损', '轻微', '中等', '严重', '报废'],
    default: '无磨损',
    index: true
  },
  qualityRating: {
    type: String,
    enum: ['优', '良', '中', '差'],
    default: '良',
    index: true
  },
  surfaceFinish: {
    type: Number,
    min: 0,
    default: 0
  },
  dimensionalAccuracy: {
    type: String,
    enum: ['IT6', 'IT7', 'IT8', 'IT9', 'IT10', 'IT11', 'IT12', '其他'],
    default: 'IT8'
  },
  notes: {
    type: String,
    default: ''
  },
  images: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['使用中', '已完成', '异常中断'],
    default: '使用中',
    index: true
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
usageRecordSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // 自动计算使用时长
  if (this.startTime && this.endTime) {
    const diffMs = this.endTime - this.startTime;
    this.usageHours = Math.max(0, diffMs / (1000 * 60 * 60)); // 转换为小时
    this.status = '已完成';
  }
  
  next();
});

// 虚拟属性：使用效率
usageRecordSchema.virtual('efficiency').get(function() {
  if (this.usageHours > 0 && this.qualityRating) {
    const qualityScore = { '优': 4, '良': 3, '中': 2, '差': 1 }[this.qualityRating] || 1;
    return qualityScore / this.usageHours;
  }
  return 0;
});

// 实例方法：结束使用
usageRecordSchema.methods.endUsage = function(endData = {}) {
  this.endTime = endData.endTime || new Date();
  this.wearLevel = endData.wearLevel || this.wearLevel;
  this.qualityRating = endData.qualityRating || this.qualityRating;
  this.notes = endData.notes || this.notes;
  this.status = '已完成';
  
  // 计算使用时长
  const diffMs = this.endTime - this.startTime;
  this.usageHours = Math.max(0, diffMs / (1000 * 60 * 60));
  
  return this.save();
};

// 静态方法：按操作员统计
usageRecordSchema.statics.getStatsByOperator = async function(startDate, endDate) {
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
        _id: '$operator',
        totalUsage: { $sum: 1 },
        totalHours: { $sum: '$usageHours' },
        averageQuality: { $avg: { $switch: {
          branches: [
            { case: { $eq: ['$qualityRating', '优'] }, then: 4 },
            { case: { $eq: ['$qualityRating', '良'] }, then: 3 },
            { case: { $eq: ['$qualityRating', '中'] }, then: 2 },
            { case: { $eq: ['$qualityRating', '差'] }, then: 1 }
          ],
          default: 0
        }}}
      }
    },
    { $sort: { totalUsage: -1 } }
  ]);
};

// 静态方法：按机器统计
usageRecordSchema.statics.getStatsByMachine = async function(startDate, endDate) {
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
        _id: '$machine',
        totalUsage: { $sum: 1 },
        totalHours: { $sum: '$usageHours' },
        uniqueOperators: { $addToSet: '$operator' }
      }
    },
    {
      $addFields: {
        operatorCount: { $size: '$uniqueOperators' }
      }
    },
    { $sort: { totalUsage: -1 } }
  ]);
};

// 如果MongoDB可用，使用Mongoose模型
let UsageRecord;
if (process.env.MONGODB_URI) {
  UsageRecord = mongoose.model('UsageRecord', usageRecordSchema);
} else {
  // 否则使用文件系统存储
  const DATA_DIR = path.join(__dirname, '../../../data');
  
  // 文件系统版本的使用记录模型
  UsageRecord = {
    // 获取所有使用记录
    find: async (query = {}) => {
      const recordsFile = path.join(DATA_DIR, 'usage_records.json');
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
      const recordsFile = path.join(DATA_DIR, 'usage_records.json');
      if (fs.existsSync(recordsFile)) {
        const data = fs.readFileSync(recordsFile, 'utf8');
        const records = JSON.parse(data);
        return records.find(r => r.id === id) || null;
      }
      return null;
    },
    
    // 创建新使用记录
    create: async (recordData) => {
      const recordsFile = path.join(DATA_DIR, 'usage_records.json');
      let records = [];
      
      if (fs.existsSync(recordsFile)) {
        const data = fs.readFileSync(recordsFile, 'utf8');
        records = JSON.parse(data);
      }
      
      const newRecord = {
        id: Date.now().toString(),
        ...recordData,
        status: recordData.status || '使用中',
        usageHours: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // 自动计算使用时长
      if (newRecord.startTime && newRecord.endTime) {
        const startTime = new Date(newRecord.startTime);
        const endTime = new Date(newRecord.endTime);
        const diffMs = endTime - startTime;
        newRecord.usageHours = Math.max(0, diffMs / (1000 * 60 * 60));
        newRecord.status = '已完成';
      }
      
      records.push(newRecord);
      fs.writeFileSync(recordsFile, JSON.stringify(records, null, 2));
      
      return newRecord;
    },
    
    // 更新使用记录
    findByIdAndUpdate: async (id, updateData, options = {}) => {
      const recordsFile = path.join(DATA_DIR, 'usage_records.json');
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
      records[index] = {
        ...records[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      // 重新计算使用时长
      if (records[index].startTime && records[index].endTime) {
        const startTime = new Date(records[index].startTime);
        const endTime = new Date(records[index].endTime);
        const diffMs = endTime - startTime;
        records[index].usageHours = Math.max(0, diffMs / (1000 * 60 * 60));
        records[index].status = '已完成';
      }
      
      fs.writeFileSync(recordsFile, JSON.stringify(records, null, 2));
      
      return records[index];
    },
    
    // 删除使用记录
    findByIdAndDelete: async (id) => {
      const recordsFile = path.join(DATA_DIR, 'usage_records.json');
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
      
      const allRecords = await UsageRecord.find(query);
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
    
    // 按操作员统计
    getStatsByOperator: async (startDate, endDate) => {
      let records = await UsageRecord.find();
      
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
        const operator = record.operator;
        if (!stats[operator]) {
          stats[operator] = {
            _id: operator,
            totalUsage: 0,
            totalHours: 0,
            qualityScores: []
          };
        }
        
        stats[operator].totalUsage++;
        stats[operator].totalHours += record.usageHours || 0;
        
        const qualityScore = { '优': 4, '良': 3, '中': 2, '差': 1 }[record.qualityRating] || 0;
        stats[operator].qualityScores.push(qualityScore);
      });
      
      // 计算平均质量评分
      Object.values(stats).forEach(stat => {
        if (stat.qualityScores.length > 0) {
          stat.averageQuality = stat.qualityScores.reduce((a, b) => a + b, 0) / stat.qualityScores.length;
        } else {
          stat.averageQuality = 0;
        }
        delete stat.qualityScores;
      });
      
      return Object.values(stats).sort((a, b) => b.totalUsage - a.totalUsage);
    },
    
    // 按机器统计
    getStatsByMachine: async (startDate, endDate) => {
      let records = await UsageRecord.find();
      
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
        const machine = record.machine;
        if (!stats[machine]) {
          stats[machine] = {
            _id: machine,
            totalUsage: 0,
            totalHours: 0,
            operators: new Set()
          };
        }
        
        stats[machine].totalUsage++;
        stats[machine].totalHours += record.usageHours || 0;
        stats[machine].operators.add(record.operator);
      });
      
      // 转换Set为数量
      Object.values(stats).forEach(stat => {
        stat.operatorCount = stat.operators.size;
        stat.uniqueOperators = Array.from(stat.operators);
        delete stat.operators;
      });
      
      return Object.values(stats).sort((a, b) => b.totalUsage - a.totalUsage);
    }
  };
}

module.exports = UsageRecord;
