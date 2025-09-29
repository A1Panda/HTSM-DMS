const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');

// 获取供应商列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, qualityGrade } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (qualityGrade) query.qualityGrade = qualityGrade;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const result = await Supplier.paginate(query, options);
    
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
      message: '获取供应商列表失败',
      error: error.message
    });
  }
});

// 创建供应商
router.post('/', async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json({
      success: true,
      message: '供应商创建成功',
      data: supplier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '创建供应商失败',
      error: error.message
    });
  }
});

module.exports = router;
