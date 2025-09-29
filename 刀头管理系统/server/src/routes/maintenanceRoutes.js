const express = require('express');
const router = express.Router();
const MaintenanceRecord = require('../models/MaintenanceRecord');

// 获取维护记录列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, technician } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (technician) query.technician = { $regex: technician, $options: 'i' };

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const result = await MaintenanceRecord.paginate(query, options);
    
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
      message: '获取维护记录失败',
      error: error.message
    });
  }
});

// 创建维护记录
router.post('/', async (req, res) => {
  try {
    const record = await MaintenanceRecord.create(req.body);
    res.status(201).json({
      success: true,
      message: '维护记录创建成功',
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '创建维护记录失败',
      error: error.message
    });
  }
});

module.exports = router;
