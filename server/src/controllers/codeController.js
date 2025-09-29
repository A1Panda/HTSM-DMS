const Code = require('../models/Code');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// 获取所有编码（带分页）
exports.getAllCodes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const productId = req.query.productId;
    
    const query = productId ? { productId } : {};
    const result = await Code.paginate(query, { page, limit });
    
    res.json(result);
  } catch (error) {
    console.error('获取所有编码失败:', error);
    res.status(500).json({ error: '获取所有编码失败' });
  }
};

// 获取产品的所有编码
exports.getProductCodes = async (req, res) => {
  try {
    const { productId } = req.params;
    const codes = await Code.find({ productId });
    res.json(codes);
  } catch (error) {
    console.error('获取编码列表失败:', error);
    res.status(500).json({ error: '获取编码列表失败' });
  }
};

// 为产品添加编码
exports.addCode = async (req, res) => {
  // 验证请求
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { productId } = req.params;
    const { code, description, date } = req.body;
    
    // 检查产品是否存在
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }
    
    // 创建新编码
    const newCode = await Code.create({
      code,
      description: description || '',
      date: date || '',
      productId
    });
    
    res.status(201).json(newCode);
  } catch (error) {
    if (error.message === '编码已存在') {
      return res.status(400).json({ error: '编码已存在，请使用不同的编码' });
    }
    console.error('添加编码失败:', error);
    res.status(500).json({ error: '添加编码失败' });
  }
};

// 删除编码
exports.deleteCode = async (req, res) => {
  try {
    const { productId, codeId } = req.params;
    
    const deletedCode = await Code.findByIdAndDelete(codeId, productId);
    
    if (!deletedCode) {
      return res.status(404).json({ error: '编码不存在' });
    }
    
    res.json({ success: true, message: '编码删除成功' });
  } catch (error) {
    console.error('删除编码失败:', error);
    res.status(500).json({ error: '删除编码失败' });
  }
};