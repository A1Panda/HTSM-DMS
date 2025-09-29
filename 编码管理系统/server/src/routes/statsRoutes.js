const express = require('express');
const statsController = require('../controllers/statsController');

const router = express.Router();

// 获取统计数据
router.get('/', statsController.getStats);

// 获取最近7天活动数据
router.get('/activity', statsController.getActivityData);

// 获取数据质量统计
router.get('/quality', statsController.getQualityStats);

// 获取最近活动流
router.get('/recent-activity', statsController.getRecentActivity);

module.exports = router;