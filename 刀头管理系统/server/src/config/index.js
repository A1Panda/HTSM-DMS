module.exports = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development'
  },

  // 跨域配置
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  },

  // 数据存储配置
  storage: {
    type: process.env.STORAGE_TYPE || 'file', // 'file' or 'mongodb'
    dataPath: process.env.DATA_PATH || './data',
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/toolhead_management',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    }
  },

  // 文件上传配置
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    uploadPath: './uploads'
  },

  // 安全配置
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100 // 限制每个IP 15分钟内最多100个请求
    }
  },

  // 分页配置
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'combined',
    enabled: process.env.LOGGING_ENABLED !== 'false'
  },

  // 缓存配置
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    ttl: 300 // 5分钟
  }
};
