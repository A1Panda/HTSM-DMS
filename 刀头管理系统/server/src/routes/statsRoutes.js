const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// 获取仪表盘统计数据
router.get('/dashboard', statsController.getDashboardStats);

// 获取使用统计
router.get('/usage', statsController.getUsageStats);

// 获取库存统计
router.get('/stock', statsController.getStockStats);

// 获取维护统计
router.get('/maintenance', statsController.getMaintenanceStats);

module.exports = router;
