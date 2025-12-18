const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const crypto = require('crypto');
const fetch = require('node-fetch');
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
// 默认 json 限制只有 100KB，OCR 的 base64 图片会超过，放宽到 2MB（同时仍然小于讯飞 4MB 的要求）
app.use(bodyParser.json({ limit: '2mb' }));
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

// OCR 代理路由（科大讯飞通用文字识别）
// 前端传入 base64 图片（dataURL），后端转发到讯飞 OCR API，规避浏览器跨域和签名暴露问题
app.post('/api/ocr/iflytek', async (req, res, next) => {
  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: '缺少 imageBase64 参数' });
    }

    const appId = process.env.IFLYTEK_OCR_APPID;
    const apiKey = process.env.IFLYTEK_OCR_API_KEY;
    const apiSecret = process.env.IFLYTEK_OCR_API_SECRET;
    const host = 'api.xf-yun.com';
    const pathStr = process.env.IFLYTEK_OCR_PATH || '/v1/private/sf8e6aca1';

    if (!appId || !apiKey || !apiSecret) {
      return res.status(500).json({ error: '服务器未配置讯飞 OCR 凭证，请在 .env 中设置 IFLYTEK_OCR_APPID / IFLYTEK_OCR_API_KEY / IFLYTEK_OCR_API_SECRET' });
    }

    // 去掉 data:image/jpeg;base64, 前缀，只保留纯 base64 数据
    const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // 构造鉴权参数（参考讯飞文档）
    const date = new Date().toUTCString(); // Wed, 11 Aug 2021 06:55:18 GMT
    const requestLine = `POST ${pathStr} HTTP/1.1`;
    const signatureOrigin = `host: ${host}\ndate: ${date}\n${requestLine}`;
    const signatureSha = crypto
      .createHmac('sha256', apiSecret)
      .update(signatureOrigin)
      .digest('base64');

    const authorizationOrigin = `api_key="${apiKey}",algorithm="hmac-sha256",headers="host date request-line",signature="${signatureSha}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');

    const url = `https://${host}${pathStr}?authorization=${encodeURIComponent(
      authorization
    )}&host=${encodeURIComponent(host)}&date=${encodeURIComponent(date)}`;

    const body = {
      header: {
        app_id: appId,
        status: 3
      },
      parameter: {
        sf8e6aca1: {
          category: 'ch_en_public_cloud',
          result: {
            encoding: 'utf8',
            compress: 'raw',
            format: 'json'
          }
        }
      },
      payload: {
        sf8e6aca1_data_1: {
          encoding: 'jpg',
          status: 3,
          image: imageData
        }
      }
    };

    const xfResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const xfResult = await xfResponse.json();

    if (!xfResponse.ok || xfResult.header?.code !== 0) {
      console.error('讯飞 OCR 返回错误:', xfResult);
      return res.status(500).json({
        error: '讯飞 OCR 调用失败',
        detail: xfResult.header || xfResult
      });
    }

    // 解析返回的 text 字段（base64 编码的 JSON）
    const textBase64 = xfResult.payload?.result?.text;
    if (!textBase64) {
      return res.status(500).json({ error: '讯飞 OCR 返回结果中缺少 text 字段' });
    }

    const decodedJson = Buffer.from(textBase64, 'base64').toString('utf8');
    const parsed = JSON.parse(decodedJson);

    // 简化返回：把所有识别到的内容拼成一个字符串返回给前端
    const lines =
      parsed.pages?.flatMap((p) =>
        p.lines?.flatMap((line) =>
          line.words?.map((w) => w.content || '') || []
        ) || []
      ) || [];
    const content = lines.join('');

    res.json({
      content,
      raw: parsed
    });
  } catch (err) {
    console.error('调用讯飞 OCR 失败:', err);
    next(err);
  }
});

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