const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 定义产品模式
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: ''
  },
  requiredQuantity: {
    type: Number,
    default: 0
  },
  codeStart: {
    type: String,
    default: ''
  },
  codeEnd: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 如果MongoDB可用，使用Mongoose模型
let Product;
if (process.env.MONGODB_URI) {
  Product = mongoose.model('Product', productSchema);
} else {
  // 否则使用文件系统存储
  const DATA_DIR = path.join(__dirname, '../../../data');
  
  // 文件系统版本的产品模型
  Product = {
    // 获取所有产品
    find: async () => {
      const productsFile = path.join(DATA_DIR, 'products.json');
      if (fs.existsSync(productsFile)) {
        const data = fs.readFileSync(productsFile, 'utf8');
        return JSON.parse(data);
      }
      return [];
    },
    
    // 根据ID查找产品
    findById: async (id) => {
      const productsFile = path.join(DATA_DIR, 'products.json');
      if (fs.existsSync(productsFile)) {
        const data = fs.readFileSync(productsFile, 'utf8');
        const products = JSON.parse(data);
        return products.find(p => p.id === id) || null;
      }
      return null;
    },
    
    // 创建新产品
    create: async (productData) => {
      const productsFile = path.join(DATA_DIR, 'products.json');
      let products = [];
      
      if (fs.existsSync(productsFile)) {
        const data = fs.readFileSync(productsFile, 'utf8');
        products = JSON.parse(data);
      }
      
      // 检查产品是否已存在
      const existingProduct = products.find(p => p.name === productData.name);
      if (existingProduct) {
        throw new Error('产品已存在');
      }
      
      const newProduct = {
        id: Date.now().toString(),
        ...productData,
        createdAt: new Date().toISOString()
      };
      
      products.push(newProduct);
      fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
      
      // 为新产品创建编码文件
      const codesFile = path.join(DATA_DIR, `${newProduct.id}_codes.json`);
      fs.writeFileSync(codesFile, JSON.stringify([], null, 2));
      
      return newProduct;
    },
    
    // 删除产品
    findByIdAndDelete: async (id) => {
      const productsFile = path.join(DATA_DIR, 'products.json');
      if (!fs.existsSync(productsFile)) {
        return null;
      }
      
      const data = fs.readFileSync(productsFile, 'utf8');
      let products = JSON.parse(data);
      
      const productToDelete = products.find(p => p.id === id);
      if (!productToDelete) {
        return null;
      }
      
      products = products.filter(p => p.id !== id);
      fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
      
      // 删除产品编码文件
      const codesFile = path.join(DATA_DIR, `${id}_codes.json`);
      if (fs.existsSync(codesFile)) {
        fs.unlinkSync(codesFile);
      }
      
      return productToDelete;
    }
  };
}

module.exports = Product;