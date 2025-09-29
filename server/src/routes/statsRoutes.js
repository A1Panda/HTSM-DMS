const express = require('express');
const statsController = require('../controllers/statsController');

const router = express.Router();

// 获取统计数据
router.get('/', statsController.getStats);

module.exports = router;