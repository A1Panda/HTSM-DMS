const express = require('express');
const kgdController = require('../controllers/kgdController');

const router = express.Router();

// 商品列表（代理快工单开放接口，作为产品名称来源）
router.get('/goods', kgdController.getGoods);

// 加工单数量（按商品名精确匹配，供前端选商品后按最新订单自动填需求数量）
router.get('/bill-num', kgdController.getBillNum);

module.exports = router;
