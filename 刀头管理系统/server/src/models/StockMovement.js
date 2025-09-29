const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 定义库存变动记录模式
const stockMovementSchema = new mongoose.Schema({
  toolHeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ToolHead',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['入库', '出库', '盘点', '报废', '调拨', '退库', '借用', '归还'],
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true
  },
  currentStock: {
    type: Number,
    required: true,
    min: 0
  },
  operator: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  supplier: {
    type: String,
    trim: true,
    index: true
  },
  batchNumber: {
    type: String,
    trim: true,
    index: true
  },
  purchaseOrder: {
    type: String,
    trim: true,
    index: true
  },
  unitPrice: {
    type: Number,
    min: 0,
    default: 0
  },
  totalAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  fromLocation: {
    type: String,
    trim: true
  },
  toLocation: {
    type: String,
    trim: true
  },
  approver: {
    type: String,
    trim: true
  },
  approvedAt: {
    type: Date
  },
  documents: [{
    name: String,
    url: String,
    type: String
  }],
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['待审批', '已审批', '已完成', '已取消'],
    default: '已完成',
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
stockMovementSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // 自动计算总金额
  if (this.unitPrice && this.quantity) {
    this.totalAmount = Math.abs(this.unitPrice * this.quantity);
  }
  
  next();
});

// 虚拟属性：变动方向
stockMovementSchema.virtual('direction').get(function() {
  const inboundTypes = ['入库', '退库', '归还'];
  const outboundTypes = ['出库', '报废', '借用'];
  
  if (inboundTypes.includes(this.type)) {
    return 'in';
  } else if (outboundTypes.includes(this.type)) {
    return 'out';
  } else {
    return 'neutral';
  }
});

// 实例方法：审批
stockMovementSchema.methods.approve = function(approver) {
  this.status = '已审批';
  this.approver = approver;
  this.approvedAt = new Date();
  return this.save();
};

// 实例方法：完成
stockMovementSchema.methods.complete = function() {
  this.status = '已完成';
  return this.save();
};

// 静态方法：按类型统计
stockMovementSchema.statics.getStatsByType = async function(startDate, endDate) {
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
        totalQuantity: { $sum: { $abs: '$quantity' } },
        totalAmount: { $sum: '$totalAmount' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// 静态方法：按时间段统计
stockMovementSchema.statics.getStatsByPeriod = async function(period = 'day', startDate, endDate) {
  const matchCondition = {};
  if (startDate && endDate) {
    matchCondition.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  let dateFormat;
  switch (period) {
    case 'hour':
      dateFormat = { 
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
        hour: { $hour: '$createdAt' }
      };
      break;
    case 'day':
      dateFormat = { 
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      };
      break;
    case 'month':
      dateFormat = { 
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' }
      };
      break;
    default:
      dateFormat = { 
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      };
  }
  
  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: dateFormat,
        inboundCount: {
          $sum: {
            $cond: [
              { $in: ['$type', ['入库', '退库', '归还']] },
              1,
              0
            ]
          }
        },
        outboundCount: {
          $sum: {
            $cond: [
              { $in: ['$type', ['出库', '报废', '借用']] },
              1,
              0
            ]
          }
        },
        totalAmount: { $sum: '$totalAmount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
  ]);
};

// 如果MongoDB可用，使用Mongoose模型
let StockMovement;
if (process.env.MONGODB_URI) {
  StockMovement = mongoose.model('StockMovement', stockMovementSchema);
} else {
  // 否则使用文件系统存储
  const DATA_DIR = path.join(__dirname, '../../../data');
  
  // 文件系统版本的库存变动模型
  StockMovement = {
    // 获取所有库存变动记录
    find: async (query = {}) => {
      const movementsFile = path.join(DATA_DIR, 'stock_movements.json');
      if (fs.existsSync(movementsFile)) {
        const data = fs.readFileSync(movementsFile, 'utf8');
        let movements = JSON.parse(data);
        
        // 简单的查询过滤
        if (Object.keys(query).length > 0) {
          movements = movements.filter(movement => {
            return Object.keys(query).every(key => {
              if (typeof query[key] === 'object' && query[key].$regex) {
                const regex = new RegExp(query[key].$regex, query[key].$options || '');
                return regex.test(movement[key]);
              }
              return movement[key] === query[key];
            });
          });
        }
        
        return movements;
      }
      return [];
    },
    
    // 根据ID查找记录
    findById: async (id) => {
      const movementsFile = path.join(DATA_DIR, 'stock_movements.json');
      if (fs.existsSync(movementsFile)) {
        const data = fs.readFileSync(movementsFile, 'utf8');
        const movements = JSON.parse(data);
        return movements.find(m => m.id === id) || null;
      }
      return null;
    },
    
    // 创建新库存变动记录
    create: async (movementData) => {
      const movementsFile = path.join(DATA_DIR, 'stock_movements.json');
      let movements = [];
      
      if (fs.existsSync(movementsFile)) {
        const data = fs.readFileSync(movementsFile, 'utf8');
        movements = JSON.parse(data);
      }
      
      const newMovement = {
        id: Date.now().toString(),
        ...movementData,
        status: movementData.status || '已完成',
        totalAmount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // 自动计算总金额
      if (newMovement.unitPrice && newMovement.quantity) {
        newMovement.totalAmount = Math.abs(newMovement.unitPrice * newMovement.quantity);
      }
      
      movements.push(newMovement);
      fs.writeFileSync(movementsFile, JSON.stringify(movements, null, 2));
      
      return newMovement;
    },
    
    // 更新库存变动记录
    findByIdAndUpdate: async (id, updateData, options = {}) => {
      const movementsFile = path.join(DATA_DIR, 'stock_movements.json');
      if (!fs.existsSync(movementsFile)) {
        return null;
      }
      
      const data = fs.readFileSync(movementsFile, 'utf8');
      let movements = JSON.parse(data);
      
      const index = movements.findIndex(m => m.id === id);
      if (index === -1) {
        return null;
      }
      
      // 更新数据
      movements[index] = {
        ...movements[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      // 重新计算总金额
      if (movements[index].unitPrice && movements[index].quantity) {
        movements[index].totalAmount = Math.abs(movements[index].unitPrice * movements[index].quantity);
      }
      
      fs.writeFileSync(movementsFile, JSON.stringify(movements, null, 2));
      
      return movements[index];
    },
    
    // 删除库存变动记录
    findByIdAndDelete: async (id) => {
      const movementsFile = path.join(DATA_DIR, 'stock_movements.json');
      if (!fs.existsSync(movementsFile)) {
        return null;
      }
      
      const data = fs.readFileSync(movementsFile, 'utf8');
      let movements = JSON.parse(data);
      
      const movementToDelete = movements.find(m => m.id === id);
      if (!movementToDelete) {
        return null;
      }
      
      movements = movements.filter(m => m.id !== id);
      fs.writeFileSync(movementsFile, JSON.stringify(movements, null, 2));
      
      return movementToDelete;
    },
    
    // 分页查询
    paginate: async (query = {}, options = {}) => {
      const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
      const skip = (page - 1) * limit;
      
      const allMovements = await StockMovement.find(query);
      const total = allMovements.length;
      
      // 排序
      const sortKey = Object.keys(sort)[0];
      const sortOrder = sort[sortKey];
      allMovements.sort((a, b) => {
        if (sortOrder === 1) {
          return a[sortKey] > b[sortKey] ? 1 : -1;
        } else {
          return a[sortKey] < b[sortKey] ? 1 : -1;
        }
      });
      
      const paginatedMovements = allMovements.slice(skip, skip + limit);
      
      return {
        docs: paginatedMovements,
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
      let movements = await StockMovement.find();
      
      // 日期过滤
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        movements = movements.filter(movement => {
          const movementDate = new Date(movement.createdAt);
          return movementDate >= start && movementDate <= end;
        });
      }
      
      const stats = {};
      movements.forEach(movement => {
        const type = movement.type;
        if (!stats[type]) {
          stats[type] = {
            _id: type,
            count: 0,
            totalQuantity: 0,
            totalAmount: 0
          };
        }
        
        stats[type].count++;
        stats[type].totalQuantity += Math.abs(movement.quantity || 0);
        stats[type].totalAmount += movement.totalAmount || 0;
      });
      
      return Object.values(stats).sort((a, b) => b.count - a.count);
    },
    
    // 按时间段统计
    getStatsByPeriod: async (period = 'day', startDate, endDate) => {
      let movements = await StockMovement.find();
      
      // 日期过滤
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        movements = movements.filter(movement => {
          const movementDate = new Date(movement.createdAt);
          return movementDate >= start && movementDate <= end;
        });
      }
      
      const stats = {};
      const inboundTypes = ['入库', '退库', '归还'];
      const outboundTypes = ['出库', '报废', '借用'];
      
      movements.forEach(movement => {
        const date = new Date(movement.createdAt);
        let dateKey;
        
        switch (period) {
          case 'hour':
            dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
            break;
          case 'day':
            dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            break;
          case 'month':
            dateKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
            break;
          default:
            dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        }
        
        if (!stats[dateKey]) {
          stats[dateKey] = {
            _id: dateKey,
            inboundCount: 0,
            outboundCount: 0,
            totalAmount: 0
          };
        }
        
        if (inboundTypes.includes(movement.type)) {
          stats[dateKey].inboundCount++;
        } else if (outboundTypes.includes(movement.type)) {
          stats[dateKey].outboundCount++;
        }
        
        stats[dateKey].totalAmount += movement.totalAmount || 0;
      });
      
      return Object.values(stats).sort((a, b) => a._id.localeCompare(b._id));
    }
  };
}

module.exports = StockMovement;
