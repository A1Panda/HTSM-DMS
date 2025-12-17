const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// 获取所有产品
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error('获取产品列表失败:', error);
    res.status(500).json({ error: '获取产品列表失败' });
  }
};

// 获取单个产品
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('获取产品详情失败:', error);
    res.status(500).json({ error: '获取产品详情失败' });
  }
};

// 创建新产品
exports.createProduct = async (req, res) => {
  // 验证请求
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { name, description, category, requiredQuantity, codeStart, codeEnd } = req.body;
    
    // 创建新产品
    const newProduct = await Product.create({
      name,
      description: description || '',
      category: category || '',
      requiredQuantity: requiredQuantity || 0,
      codeStart: codeStart || '',
      codeEnd: codeEnd || ''
    });
    
    res.status(201).json(newProduct);
  } catch (error) {
    if (error.message === '产品已存在') {
      return res.status(400).json({ error: '产品已存在' });
    }
    console.error('添加产品失败:', error);
    res.status(500).json({ error: '添加产品失败' });
  }
};

// 删除产品
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }
    
    res.json({ success: true, message: '产品删除成功' });
  } catch (error) {
    console.error('删除产品失败:', error);
    res.status(500).json({ error: '删除产品失败' });
  }
};

// 更新产品
exports.updateProduct = async (req, res) => {
  // 验证请求
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { name, description, category, requiredQuantity, codeStart, codeEnd } = req.body;
    
    // 查找并更新产品
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description: description || '',
        category: category || '',
        requiredQuantity: requiredQuantity || 0,
        codeStart: codeStart || '',
        codeEnd: codeEnd || ''
      },
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('更新产品失败:', error);
    res.status(500).json({ error: '更新产品失败' });
  }
};