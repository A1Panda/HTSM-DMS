const express = require('express');
const { body } = require('express-validator');
const productController = require('../controllers/productController');

const router = express.Router();

// 获取所有产品
router.get('/', productController.getAllProducts);

// 获取单个产品
router.get('/:id', productController.getProductById);

// 创建新产品
router.post('/',
  [
    body('name').notEmpty().withMessage('产品名称不能为空')
  ],
  productController.createProduct
);

// 更新产品
router.put('/:id',
  [
    body('name').notEmpty().withMessage('产品名称不能为空')
  ],
  productController.updateProduct
);

// 删除产品
router.delete('/:id', productController.deleteProduct);

module.exports = router;