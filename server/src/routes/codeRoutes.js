const express = require('express');
const { body } = require('express-validator');
const codeController = require('../controllers/codeController');

const router = express.Router();

// 获取所有编码（带分页）
router.get('/', codeController.getAllCodes);

// 获取产品的所有编码
router.get('/product/:productId', codeController.getProductCodes);

// 为产品添加编码
router.post('/product/:productId',
  [
    body('code').notEmpty().withMessage('编码不能为空')
  ],
  codeController.addCode
);

// 删除编码
router.delete('/product/:productId/:codeId', codeController.deleteCode);

module.exports = router;