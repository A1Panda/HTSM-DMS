const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// 数据存储目录
const DATA_DIR = path.join(__dirname, 'data');

// 确保数据目录存在
fs.ensureDirSync(DATA_DIR);

// 获取所有产品列表
app.get('/api/products', async (req, res) => {
  try {
    const productsFile = path.join(DATA_DIR, 'products.json');
    let products = [];
    
    if (await fs.pathExists(productsFile)) {
      products = await fs.readJson(productsFile);
    }
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: '获取产品列表失败' });
  }
});

// 获取所有编码（优化版本）
app.get('/api/codes', async (req, res) => {
  try {
    const productsFile = path.join(DATA_DIR, 'products.json');
    let products = [];
    let allCodes = [];
    
    // 添加分页支持
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000; // 默认每页1000条
    const skip = (page - 1) * limit;
    
    // 添加筛选支持
    const productId = req.query.productId;
    
    if (await fs.pathExists(productsFile)) {
      products = await fs.readJson(productsFile);
      
      // 如果指定了产品ID，只加载该产品的编码
      if (productId) {
        const product = products.find(p => p.id === productId);
        if (product) {
          const codesFile = path.join(DATA_DIR, `${product.id}_codes.json`);
          if (await fs.pathExists(codesFile)) {
            const productCodes = await fs.readJson(codesFile);
            // 为每个编码添加产品ID
            const codesWithProductId = productCodes.map(code => ({
              ...code,
              productId: product.id
            }));
            allCodes = codesWithProductId;
          }
        }
      } else {
        // 否则，并行加载所有产品的编码
        const codePromises = products.map(async (product) => {
          const codesFile = path.join(DATA_DIR, `${product.id}_codes.json`);
          if (await fs.pathExists(codesFile)) {
            const productCodes = await fs.readJson(codesFile);
            return productCodes.map(code => ({
              ...code,
              productId: product.id
            }));
          }
          return [];
        });
        
        // 并行处理所有Promise
        const codesArrays = await Promise.all(codePromises);
        allCodes = codesArrays.flat();
      }
    }
    
    // 计算总数
    const total = allCodes.length;
    
    // 应用分页
    const paginatedCodes = allCodes.slice(skip, skip + limit);
    
    // 返回分页数据和元数据
    res.json({
      codes: paginatedCodes,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取所有编码失败:', error);
    res.status(500).json({ error: '获取所有编码失败' });
  }
});

// 获取单个产品详情
app.get('/api/products/:id', async (req, res) => {
    const productId = req.params.id;
    try {
        const productsFile = path.join(DATA_DIR, 'products.json');
        let products = [];
        
        if (await fs.pathExists(productsFile)) {
            products = await fs.readJson(productsFile);
        }
        
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            return res.status(404).json({ error: '产品不存在' });
        }
        
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: '获取产品详情失败' });
    }
});

// 添加新产品
app.post('/api/products', async (req, res) => {
  try {
    const { name, description, category } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: '产品名称不能为空' });
    }
    
    const productsFile = path.join(DATA_DIR, 'products.json');
    let products = [];
    
    if (await fs.pathExists(productsFile)) {
      products = await fs.readJson(productsFile);
    }
    
    // 检查产品是否已存在
    const existingProduct = products.find(p => p.name === name);
    if (existingProduct) {
      return res.status(400).json({ error: '产品已存在' });
    }
    
    const newProduct = {
      id: Date.now().toString(),
      name,
      description: description || '',
      category: category || '',
      requiredQuantity: req.body.requiredQuantity || 0,
      codeStart: req.body.codeStart || '',
      codeEnd: req.body.codeEnd || '',
      createdAt: new Date().toISOString()
    };
    
    products.push(newProduct);
    await fs.writeJson(productsFile, products, { spaces: 2 });
    
    // 为新产品创建编码文件
    const codesFile = path.join(DATA_DIR, `${newProduct.id}_codes.json`);
    await fs.writeJson(codesFile, [], { spaces: 2 });
    
    res.json(newProduct);
  } catch (error) {
    res.status(500).json({ error: '添加产品失败' });
  }
});

// 获取产品的所有编码
app.get('/api/products/:productId/codes', async (req, res) => {
  try {
    const { productId } = req.params;
    const codesFile = path.join(DATA_DIR, `${productId}_codes.json`);
    
    let codes = [];
    if (await fs.pathExists(codesFile)) {
      codes = await fs.readJson(codesFile);
    }
    
    res.json(codes);
  } catch (error) {
    res.status(500).json({ error: '获取编码列表失败' });
  }
});

// 为产品添加编码
app.post('/api/products/:productId/codes', async (req, res) => {
  try {
    const { productId } = req.params;
    const { code, description, date } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: '编码不能为空' });
    }
    
    const codesFile = path.join(DATA_DIR, `${productId}_codes.json`);
    let codes = [];
    
    if (await fs.pathExists(codesFile)) {
      codes = await fs.readJson(codesFile);
    }
    
    // 检查编码是否重复
    const existingCode = codes.find(c => c.code === code);
    if (existingCode) {
      return res.status(400).json({ error: '编码已存在，请使用不同的编码' });
    }
    
    const newCode = {
      id: Date.now().toString(),
      code,
      description: description || '',
      date: date || '',
      createdAt: new Date().toISOString()
    };
    
    codes.push(newCode);
    await fs.writeJson(codesFile, codes, { spaces: 2 });
    
    res.json(newCode);
  } catch (error) {
    res.status(500).json({ error: '添加编码失败' });
  }
});

// 获取统计数据
app.get('/api/stats', async (req, res) => {
  try {
    const productsFile = path.join(DATA_DIR, 'products.json');
    let products = [];
    
    if (await fs.pathExists(productsFile)) {
      products = await fs.readJson(productsFile);
    }
    
    let totalCodes = 0;
    let recentActivity = 0;
    const today = new Date().toDateString();
    
    // 计算总编码数和今日活动
    for (const product of products) {
      const codesFile = path.join(DATA_DIR, `${product.id}_codes.json`);
      if (await fs.pathExists(codesFile)) {
        const codes = await fs.readJson(codesFile);
        totalCodes += codes.length;
        
        // 计算今日新增的编码数
        const todayCodes = codes.filter(code => 
          new Date(code.createdAt).toDateString() === today
        );
        recentActivity += todayCodes.length;
      }
    }
    
    // 计算今日新增的产品数
    const todayProducts = products.filter(product => 
      new Date(product.createdAt).toDateString() === today
    );
    recentActivity += todayProducts.length;
    
    res.json({
      totalProducts: products.length,
      totalCodes,
      recentActivity
    });
  } catch (error) {
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// 删除产品编码
app.delete('/api/products/:productId/codes/:codeId', async (req, res) => {
  try {
    const { productId, codeId } = req.params;
    const codesFile = path.join(DATA_DIR, `${productId}_codes.json`);
    
    if (await fs.pathExists(codesFile)) {
      let codes = await fs.readJson(codesFile);
      codes = codes.filter(c => c.id !== codeId);
      await fs.writeJson(codesFile, codes, { spaces: 2 });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除编码失败' });
  }
});

// 删除产品
app.delete('/api/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // 删除产品记录
    const productsFile = path.join(DATA_DIR, 'products.json');
    if (await fs.pathExists(productsFile)) {
      let products = await fs.readJson(productsFile);
      products = products.filter(p => p.id !== productId);
      await fs.writeJson(productsFile, products, { spaces: 2 });
    }
    
    // 删除产品编码文件
    const codesFile = path.join(DATA_DIR, `${productId}_codes.json`);
    if (await fs.pathExists(codesFile)) {
      await fs.remove(codesFile);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除产品失败' });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});