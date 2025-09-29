const express = require('express');
const router = express.Router();
const StockMovement = require('../models/StockMovement');

// 获取库存变动记录
router.get('/movements', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, operator } = req.query;
    
    const query = {};
    if (type) query.type = type;
    if (operator) query.operator = { $regex: operator, $options: 'i' };

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const result = await StockMovement.paginate(query, options);
    
    res.json({
      success: true,
      data: result.docs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.totalDocs,
        pages: result.totalPages
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取库存变动记录失败',
      error: error.message
    });
  }
});

// 创建库存变动记录
router.post('/movements', async (req, res) => {
  try {
    const movement = await StockMovement.create(req.body);
    res.status(201).json({
      success: true,
      message: '库存变动记录创建成功',
      data: movement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '创建库存变动记录失败',
      error: error.message
    });
  }
});

module.exports = router;
