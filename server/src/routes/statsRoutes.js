const express = require('express');
const statsController = require('../controllers/statsController');

const router = express.Router();

// 获取统计数据
router.get('/', statsController.getStats);

// 获取最近7天活动数据
router.get('/activity', statsController.getActivityData);

module.exports = router;