const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

// 导入路由
const productRoutes = require('./routes/productRoutes');
const codeRoutes = require('./routes/codeRoutes');
const statsRoutes = require('./routes/statsRoutes');

// 初始化Express应用
const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(helmet());
app.use(morgan('dev'));

// 数据库连接
const connectDB = async () => {
  try {
    // 如果没有配置MongoDB，使用文件系统存储
    if (!process.env.MONGODB_URI) {
      console.log('未配置MongoDB，将使用文件系统存储数据');
      // 确保数据目录存在
      const dataDir = path.join(__dirname, '../../data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      return;
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB连接成功');
  } catch (error) {
    console.error('MongoDB连接失败:', error.message);
    process.exit(1);
  }
};

// 路由
app.use('/api/products', productRoutes);
app.use('/api/codes', codeRoutes);
app.use('/api/stats', statsRoutes);

// 生产环境下提供前端静态文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../client/build', 'index.html'));
  });
}

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
});

module.exports = app;