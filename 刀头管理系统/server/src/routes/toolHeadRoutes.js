const express = require('express');
const router = express.Router();
const toolHeadController = require('../controllers/toolHeadController');

// 刀头列表和创建
router.get('/', toolHeadController.getToolHeads);
router.post('/', toolHeadController.createToolHead);

// 统计信息
router.get('/stats', toolHeadController.getToolHeadStats);

// 库存预警
router.get('/alerts/low-stock', toolHeadController.getLowStockAlerts);

// 批量操作
router.delete('/batch', toolHeadController.batchDeleteToolHeads);

// 二维码查询
router.get('/qrcode/:qrCode', toolHeadController.getToolHeadByQRCode);

// 单个刀头操作
router.get('/:id', toolHeadController.getToolHeadById);
router.put('/:id', toolHeadController.updateToolHead);
router.delete('/:id', toolHeadController.deleteToolHead);

// 库存操作
router.post('/:id/stock', toolHeadController.updateStock);

module.exports = router;
