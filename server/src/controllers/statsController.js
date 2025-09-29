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

// 获取数据质量统计
exports.getQualityStats = async (req, res) => {
  try {
    const products = await Product.find();
    const allCodes = await Code.find();
    
    let totalMissingCodes = 0;
    let totalExcessCodes = 0;
    let productsWithMissing = 0;
    let productsWithExcess = 0;
    let totalCompleteness = 0;
    let validProducts = 0; // 有编码范围的产品数量
    
    // 按产品统计编码
    for (const product of products) {
      const productCodes = allCodes.filter(code => code.productId === product.id);
      
      // 检查是否有有效的编码范围
      const start = parseInt(product.codeStart);
      const end = parseInt(product.codeEnd);
      
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        validProducts++;
        
        const existingCodes = productCodes.map(code => code.code);
        const existingCodesSet = new Set(existingCodes);
        
        // 计算缺失编码
        const expectedCount = end - start + 1;
        let missingCount = 0;
        for (let i = start; i <= end; i++) {
          if (!existingCodesSet.has(i.toString())) {
            missingCount++;
          }
        }
        
        // 计算超出范围编码
        let excessCount = 0;
        existingCodes.forEach(code => {
          const codeNum = parseInt(code);
          if (!isNaN(codeNum) && (codeNum < start || codeNum > end)) {
            excessCount++;
          } else if (isNaN(codeNum)) {
            // 非数字编码也算超出范围
            excessCount++;
          }
        });
        
        // 累计统计
        totalMissingCodes += missingCount;
        totalExcessCodes += excessCount;
        
        if (missingCount > 0) productsWithMissing++;
        if (excessCount > 0) productsWithExcess++;
        
        // 计算完整度 (实际有效编码数 / 期望编码数)
        const validCodesInRange = existingCodes.filter(code => {
          const codeNum = parseInt(code);
          return !isNaN(codeNum) && codeNum >= start && codeNum <= end;
        }).length;
        
        const completeness = Math.min(100, (validCodesInRange / expectedCount) * 100);
        totalCompleteness += completeness;
      }
    }
    
    // 计算平均完整度
    const avgCompleteness = validProducts > 0 ? totalCompleteness / validProducts : 0;
    
    // 计算数据质量评分 (0-100)
    let qualityScore = 100;
    
    // 缺失编码扣分
    if (totalMissingCodes > 0) {
      qualityScore -= Math.min(30, (totalMissingCodes / (validProducts * 10)) * 30);
    }
    
    // 超出范围编码扣分
    if (totalExcessCodes > 0) {
      qualityScore -= Math.min(20, (totalExcessCodes / allCodes.length) * 100 * 0.2);
    }
    
    // 完整度影响
    qualityScore = (qualityScore * 0.7) + (avgCompleteness * 0.3);
    
    res.json({
      totalMissingCodes,
      totalExcessCodes,
      productsWithMissing,
      productsWithExcess,
      totalProducts: products.length,
      validProducts,
      avgCompleteness: Math.round(avgCompleteness * 100) / 100,
      qualityScore: Math.round(qualityScore * 100) / 100,
      excessCodeRatio: allCodes.length > 0 ? Math.round((totalExcessCodes / allCodes.length) * 10000) / 100 : 0
    });
  } catch (error) {
    console.error('获取数据质量统计失败:', error);
    res.status(500).json({ error: '获取数据质量统计失败' });
  }
};

// 获取最近活动流
exports.getRecentActivity = async (req, res) => {
  try {
    const products = await Product.find();
    const allCodes = await Code.find();
    
    // 合并所有活动并按时间排序
    const activities = [];
    
    // 添加产品活动
    products.forEach(product => {
      activities.push({
        id: `product_${product.id}`,
        type: 'product_created',
        title: '新增产品',
        description: `创建了产品"${product.name}"`,
        productName: product.name,
        productId: product.id,
        createdAt: product.createdAt,
        timestamp: new Date(product.createdAt).getTime()
      });
    });
    
    // 添加编码活动
    allCodes.forEach(code => {
      const product = products.find(p => p.id === code.productId);
      activities.push({
        id: `code_${code.id}`,
        type: 'code_created',
        title: '新增编码',
        description: `为产品"${product ? product.name : '未知产品'}"添加了编码"${code.code}"`,
        productName: product ? product.name : '未知产品',
        productId: code.productId,
        code: code.code,
        createdAt: code.createdAt,
        timestamp: new Date(code.createdAt).getTime()
      });
    });
    
    // 按时间倒序排序，取最近5条
    const recentActivities = activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
    
    // 今日活动统计
    const today = new Date().toDateString();
    const todayActivities = activities.filter(activity => 
      new Date(activity.createdAt).toDateString() === today
    );
    
    const todayStats = {
      totalToday: todayActivities.length,
      productsToday: todayActivities.filter(a => a.type === 'product_created').length,
      codesToday: todayActivities.filter(a => a.type === 'code_created').length
    };
    
    // 今日时间分布 (按小时统计)
    const hourlyDistribution = new Array(24).fill(0);
    todayActivities.forEach(activity => {
      const hour = new Date(activity.createdAt).getHours();
      hourlyDistribution[hour]++;
    });
    
    res.json({
      recentActivities,
      todayStats,
      hourlyDistribution: hourlyDistribution.map((count, hour) => ({
        hour: `${hour}:00`,
        count
      }))
    });
  } catch (error) {
    console.error('获取最近活动失败:', error);
    res.status(500).json({ error: '获取最近活动失败' });
  }
};