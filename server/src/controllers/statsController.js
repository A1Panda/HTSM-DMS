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

// 获取最近7天的活动数据
exports.getActivityData = async (req, res) => {
  try {
    // 获取所有产品和编码
    const products = await Product.find();
    const allCodes = await Code.find();
    
    // 生成最近7天的日期
    const activityData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      // 统计当天新增的产品数
      const dayProducts = products.filter(product => {
        const createdAt = new Date(product.createdAt);
        return createdAt >= dayStart && createdAt < dayEnd;
      });
      
      // 统计当天新增的编码数
      const dayCodes = allCodes.filter(code => {
        const createdAt = new Date(code.createdAt);
        return createdAt >= dayStart && createdAt < dayEnd;
      });
      
      activityData.push({
        date: dateStr,
        products: dayProducts.length,
        codes: dayCodes.length
      });
    }
    
    res.json(activityData);
  } catch (error) {
    console.error('获取活动数据失败:', error);
    res.status(500).json({ error: '获取活动数据失败' });
  }
};