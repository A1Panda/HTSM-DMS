const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 定义刀头模式
const toolHeadSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['铣刀', '钻头', '车刀', '镗刀', '丝锥', '铰刀', '锯片', '其他'],
    index: true
  },
  specification: {
    type: String,
    default: ''
  },
  material: {
    type: String,
    enum: ['HSS', '硬质合金', '陶瓷', 'CBN', 'PCD', '其他'],
    default: '硬质合金',
    index: true
  },
  diameter: {
    type: Number,
    min: 0,
    default: 0
  },
  length: {
    type: Number,
    min: 0,
    default: 0
  },
  brand: {
    type: String,
    default: '',
    index: true
  },
  supplier: {
    type: String,
    default: '',
    index: true
  },
  purchasePrice: {
    type: Number,
    min: 0,
    default: 0
  },
  maxUsageHours: {
    type: Number,
    min: 0,
    default: 0
  },
  maxUsageCount: {
    type: Number,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['库存', '使用中', '报废', '维修', '预订'],
    default: '库存',
    index: true
  },
  location: {
    type: String,
    default: ''
  },
  qrCode: {
    type: String,
    unique: true,
    sparse: true
  },
  image: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  // 库存相关
  currentStock: {
    type: Number,
    min: 0,
    default: 0
  },
  safetyStock: {
    type: Number,
    min: 0,
    default: 0
  },
  // 统计信息
  totalUsageHours: {
    type: Number,
    min: 0,
    default: 0
  },
  totalUsageCount: {
    type: Number,
    min: 0,
    default: 0
  },
  averageLifeHours: {
    type: Number,
    min: 0,
    default: 0
  },
  lastUsedAt: {
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
toolHeadSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // 自动生成二维码内容
  if (!this.qrCode) {
    this.qrCode = `TH_${this.code}_${Date.now()}`;
  }
  
  next();
});

// 虚拟属性：剩余使用小时数
toolHeadSchema.virtual('remainingHours').get(function() {
  if (this.maxUsageHours > 0) {
    return Math.max(0, this.maxUsageHours - this.totalUsageHours);
  }
  return null;
});

// 虚拟属性：剩余使用次数
toolHeadSchema.virtual('remainingCount').get(function() {
  if (this.maxUsageCount > 0) {
    return Math.max(0, this.maxUsageCount - this.totalUsageCount);
  }
  return null;
});

// 虚拟属性：使用率
toolHeadSchema.virtual('usageRate').get(function() {
  if (this.maxUsageHours > 0) {
    return Math.min(100, (this.totalUsageHours / this.maxUsageHours) * 100);
  }
  return 0;
});

// 实例方法：检查是否需要维护
toolHeadSchema.methods.needsMaintenance = function() {
  const usageRate = this.usageRate;
  return usageRate >= 80; // 使用率超过80%需要维护
};

// 实例方法：检查是否需要报废
toolHeadSchema.methods.needsRetirement = function() {
  const usageRate = this.usageRate;
  return usageRate >= 100; // 使用率达到100%需要报废
};

// 静态方法：按类型统计
toolHeadSchema.statics.getStatsByType = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalStock: { $sum: '$currentStock' },
        averagePrice: { $avg: '$purchasePrice' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// 如果MongoDB可用，使用Mongoose模型
let ToolHead;
if (process.env.MONGODB_URI) {
  ToolHead = mongoose.model('ToolHead', toolHeadSchema);
} else {
  // 否则使用文件系统存储
  const DATA_DIR = path.join(__dirname, '../../../data');
  
  // 确保数据目录存在
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  // 文件系统版本的刀头模型
  ToolHead = {
    // 获取所有刀头
    find: async (query = {}) => {
      const toolHeadsFile = path.join(DATA_DIR, 'toolheads.json');
      if (fs.existsSync(toolHeadsFile)) {
        const data = fs.readFileSync(toolHeadsFile, 'utf8');
        let toolheads = JSON.parse(data);
        
        // 简单的查询过滤
        if (Object.keys(query).length > 0) {
          toolheads = toolheads.filter(toolhead => {
            return Object.keys(query).every(key => {
              if (typeof query[key] === 'object' && query[key].$regex) {
                const regex = new RegExp(query[key].$regex, query[key].$options || '');
                return regex.test(toolhead[key]);
              }
              return toolhead[key] === query[key];
            });
          });
        }
        
        return toolheads;
      }
      return [];
    },
    
    // 根据ID查找刀头
    findById: async (id) => {
      const toolHeadsFile = path.join(DATA_DIR, 'toolheads.json');
      if (fs.existsSync(toolHeadsFile)) {
        const data = fs.readFileSync(toolHeadsFile, 'utf8');
        const toolheads = JSON.parse(data);
        return toolheads.find(t => t.id === id) || null;
      }
      return null;
    },
    
    // 根据编码查找刀头
    findOne: async (query) => {
      const toolHeadsFile = path.join(DATA_DIR, 'toolheads.json');
      if (fs.existsSync(toolHeadsFile)) {
        const data = fs.readFileSync(toolHeadsFile, 'utf8');
        const toolheads = JSON.parse(data);
        return toolheads.find(t => {
          return Object.keys(query).every(key => t[key] === query[key]);
        }) || null;
      }
      return null;
    },
    
    // 创建新刀头
    create: async (toolheadData) => {
      const toolHeadsFile = path.join(DATA_DIR, 'toolheads.json');
      let toolheads = [];
      
      if (fs.existsSync(toolHeadsFile)) {
        const data = fs.readFileSync(toolHeadsFile, 'utf8');
        toolheads = JSON.parse(data);
      }
      
      // 检查编码是否已存在
      const existingToolhead = toolheads.find(t => t.code === toolheadData.code);
      if (existingToolhead) {
        throw new Error('刀头编码已存在');
      }
      
      const newToolhead = {
        id: Date.now().toString(),
        ...toolheadData,
        status: toolheadData.status || '库存',
        currentStock: toolheadData.currentStock || 0,
        safetyStock: toolheadData.safetyStock || 0,
        totalUsageHours: 0,
        totalUsageCount: 0,
        averageLifeHours: 0,
        qrCode: toolheadData.qrCode || `TH_${toolheadData.code}_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      toolheads.push(newToolhead);
      fs.writeFileSync(toolHeadsFile, JSON.stringify(toolheads, null, 2));
      
      return newToolhead;
    },
    
    // 更新刀头
    findByIdAndUpdate: async (id, updateData, options = {}) => {
      const toolHeadsFile = path.join(DATA_DIR, 'toolheads.json');
      if (!fs.existsSync(toolHeadsFile)) {
        return null;
      }
      
      const data = fs.readFileSync(toolHeadsFile, 'utf8');
      let toolheads = JSON.parse(data);
      
      const index = toolheads.findIndex(t => t.id === id);
      if (index === -1) {
        return null;
      }
      
      // 更新数据
      toolheads[index] = {
        ...toolheads[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(toolHeadsFile, JSON.stringify(toolheads, null, 2));
      
      return options.new ? toolheads[index] : toolheads[index];
    },
    
    // 删除刀头
    findByIdAndDelete: async (id) => {
      const toolHeadsFile = path.join(DATA_DIR, 'toolheads.json');
      if (!fs.existsSync(toolHeadsFile)) {
        return null;
      }
      
      const data = fs.readFileSync(toolHeadsFile, 'utf8');
      let toolheads = JSON.parse(data);
      
      const toolheadToDelete = toolheads.find(t => t.id === id);
      if (!toolheadToDelete) {
        return null;
      }
      
      toolheads = toolheads.filter(t => t.id !== id);
      fs.writeFileSync(toolHeadsFile, JSON.stringify(toolheads, null, 2));
      
      return toolheadToDelete;
    },
    
    // 分页查询
    paginate: async (query = {}, options = {}) => {
      const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
      const skip = (page - 1) * limit;
      
      const allToolheads = await ToolHead.find(query);
      const total = allToolheads.length;
      
      // 排序
      const sortKey = Object.keys(sort)[0];
      const sortOrder = sort[sortKey];
      allToolheads.sort((a, b) => {
        if (sortOrder === 1) {
          return a[sortKey] > b[sortKey] ? 1 : -1;
        } else {
          return a[sortKey] < b[sortKey] ? 1 : -1;
        }
      });
      
      const paginatedToolheads = allToolheads.slice(skip, skip + limit);
      
      return {
        docs: paginatedToolheads,
        totalDocs: total,
        limit,
        page,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      };
    },
    
    // 按类型统计
    getStatsByType: async () => {
      const toolheads = await ToolHead.find();
      const stats = {};
      
      toolheads.forEach(toolhead => {
        const type = toolhead.type || '其他';
        if (!stats[type]) {
          stats[type] = {
            _id: type,
            count: 0,
            totalStock: 0,
            totalValue: 0
          };
        }
        stats[type].count++;
        stats[type].totalStock += toolhead.currentStock || 0;
        stats[type].totalValue += (toolhead.purchasePrice || 0) * (toolhead.currentStock || 0);
      });
      
      return Object.values(stats).sort((a, b) => b.count - a.count);
    }
  };
}

module.exports = ToolHead;
