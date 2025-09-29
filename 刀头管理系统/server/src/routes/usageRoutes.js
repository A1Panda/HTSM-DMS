const express = require('express');
const router = express.Router();
const UsageRecord = require('../models/UsageRecord');

// 获取使用记录列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, toolHeadId, operator, status } = req.query;
    
    const query = {};
    if (toolHeadId) query.toolHeadId = toolHeadId;
    if (operator) query.operator = { $regex: operator, $options: 'i' };
    if (status) query.status = status;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const result = await UsageRecord.paginate(query, options);
    
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
      message: '获取使用记录失败',
      error: error.message
    });
  }
});

// 创建使用记录
router.post('/', async (req, res) => {
  try {
    const record = await UsageRecord.create(req.body);
    res.status(201).json({
      success: true,
      message: '使用记录创建成功',
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '创建使用记录失败',
      error: error.message
    });
  }
});

// 更新使用记录
router.put('/:id', async (req, res) => {
  try {
    const record = await UsageRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: '使用记录不存在'
      });
    }

    res.json({
      success: true,
      message: '使用记录更新成功',
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新使用记录失败',
      error: error.message
    });
  }
});

// 删除使用记录
router.delete('/:id', async (req, res) => {
  try {
    const record = await UsageRecord.findByIdAndDelete(req.params.id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: '使用记录不存在'
      });
    }

    res.json({
      success: true,
      message: '使用记录删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除使用记录失败',
      error: error.message
    });
  }
});

module.exports = router;
