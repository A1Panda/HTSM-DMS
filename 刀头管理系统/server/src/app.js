const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config');

// 导入路由
const toolHeadRoutes = require('./routes/toolHeadRoutes');
const usageRoutes = require('./routes/usageRoutes');
const stockRoutes = require('./routes/stockRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const statsRoutes = require('./routes/statsRoutes');

const app = express();

// 安全中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 压缩中间件
app.use(compression());

// 跨域设置
app.use(cors(config.cors));

// 请求日志
if (config.logging.enabled) {
  app.use(morgan(config.logging.level));
}

// 限流中间件
const limiter = rateLimit(config.security.rateLimit);
app.use('/api/', limiter);

// 解析请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.server.env
  });
});

// API路由
app.use('/api/toolheads', toolHeadRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/stats', statsRoutes);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    path: req.originalUrl
  });
});

// 全局错误处理
app.use((error, req, res, next) => {
  console.error('全局错误处理:', error);
  
  // 处理特定类型的错误
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors: Object.values(error.errors).map(err => err.message)
    });
  }
  
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: '数据已存在，请检查唯一字段'
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: '无效的ID格式'
    });
  }

  // 默认错误响应
  res.status(error.status || 500).json({
    success: false,
    message: error.message || '服务器内部错误',
    ...(config.server.env === 'development' && { stack: error.stack })
  });
});

// 启动服务器
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`🚀 刀头管理系统服务器启动成功！`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`🌍 环境: ${config.server.env}`);
  console.log(`📊 API文档: http://localhost:${PORT}/api`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/health`);
  
  // 数据目录初始化提示
  if (config.storage.type === 'file') {
    console.log(`💾 数据存储: 文件系统 (${config.storage.dataPath})`);
  } else {
    console.log(`💾 数据存储: MongoDB (${config.storage.mongodb.uri})`);
  }
  
  console.log('='.repeat(50));
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在优雅关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在优雅关闭服务器...');
  process.exit(0);
});

module.exports = app;
