const Product = require('../models/Product');
const Code = require('../models/Code');

// 获取统计数据
exports.getStats = async (req, res) => {
  try {
    // 获取所有产品
    const products = await Product.find();
    const totalProducts = products.length;
    
    // 获取所有编码
    const allCodes = await Code.find();
    const totalCodes = allCodes.length;
    
    // 计算今日活动（今日新增的产品和编码数）
    const today = new Date().toDateString();
    
    // 今日新增的编码数
    const todayCodes = allCodes.filter(code => 
      new Date(code.createdAt).toDateString() === today
    );
    
    // 今日新增的产品数
    const todayProducts = products.filter(product => 
      new Date(product.createdAt).toDateString() === today
    );
    
    const recentActivity = todayCodes.length + todayProducts.length;
    
    res.json({
      totalProducts,
      totalCodes,
      recentActivity
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
};