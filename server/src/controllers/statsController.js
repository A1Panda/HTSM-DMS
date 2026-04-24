const Product = require('../models/Product');
const Code = require('../models/Code');

// 获取统计数据
exports.getStats = async (req, res) => {
  try {
    const isMongo = typeof Product.countDocuments === 'function';
    let totalProducts, totalCodes, recentActivity;
    let categoryDistribution = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isMongo) {
      totalProducts = await Product.countDocuments();
      totalCodes = await Code.countDocuments();
      
      const todayProductsCount = await Product.countDocuments({ createdAt: { $gte: today } });
      const todayCodesCount = await Code.countDocuments({ createdAt: { $gte: today } });
      recentActivity = todayProductsCount + todayCodesCount;

      const aggResult = await Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $project: { category: { $ifNull: ['$_id', '未分类'] }, count: 1, _id: 0 } }
      ]);
      
      categoryDistribution = aggResult.map(item => ({
        category: item.category === '' ? '未分类' : item.category,
        count: item.count
      }));
    } else {
      const products = await Product.find();
      const allCodes = await Code.find();
      
      totalProducts = products.length;
      totalCodes = allCodes.length;
      
      const todayStr = new Date().toDateString();
      
      const todayCodes = allCodes.filter(code => 
        new Date(code.createdAt).toDateString() === todayStr
      );
      
      const todayProducts = products.filter(product => 
        new Date(product.createdAt).toDateString() === todayStr
      );
      
      recentActivity = todayCodes.length + todayProducts.length;

      const catMap = {};
      products.forEach(p => {
        const cat = p.category ? p.category : '未分类';
        catMap[cat] = (catMap[cat] || 0) + 1;
      });
      categoryDistribution = Object.keys(catMap).map(k => ({ category: k, count: catMap[k] }));
    }

    res.json({
      totalProducts,
      totalCodes,
      recentActivity,
      categoryDistribution
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
};

// 获取最近7天的活动数据
exports.getActivityData = async (req, res) => {
  try {
    const isMongo = typeof Product.countDocuments === 'function';
    const activityData = [];
    
    if (isMongo) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const products = await Product.find({ createdAt: { $gte: sevenDaysAgo } }, 'createdAt');
      const codes = await Code.find({ createdAt: { $gte: sevenDaysAgo } }, 'createdAt');

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
        
        const dayProducts = products.filter(p => p.createdAt >= dayStart && p.createdAt < dayEnd).length;
        const dayCodes = codes.filter(c => c.createdAt >= dayStart && c.createdAt < dayEnd).length;
        
        activityData.push({ date: dateStr, products: dayProducts, codes: dayCodes });
      }
    } else {
      const products = await Product.find();
      const allCodes = await Code.find();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
        
        const dayProducts = products.filter(product => {
          const createdAt = new Date(product.createdAt);
          return createdAt >= dayStart && createdAt < dayEnd;
        });
        
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
    const isMongo = typeof Product.countDocuments === 'function';
    const products = await Product.find();
    const totalCodesCount = isMongo ? await Code.countDocuments() : (await Code.find()).length;
    
    let totalMissingCodes = 0;
    let totalExcessCodes = 0;
    let productsWithMissing = 0;
    let productsWithExcess = 0;
    let totalCompleteness = 0;
    let validProducts = 0; // 有编码范围的产品数量
    
    // 按产品统计编码
    for (const product of products) {
      const productId = product._id ? product._id.toString() : product.id;
      const productCodes = await Code.find({ productId });
      
      // 使用 codeRanges，如果没有则退退到 codeStart/codeEnd
      const ranges = [];
      if (product.codeRanges && product.codeRanges.length > 0) {
        ranges.push(...product.codeRanges);
      } else if (product.codeStart && product.codeEnd) {
        ranges.push({ start: product.codeStart, end: product.codeEnd });
      }
      
      if (ranges.length > 0) {
        validProducts++;
        
        const existingCodes = productCodes.map(code => code.code);
        const existingCodesSet = new Set(existingCodes);
        
        let expectedCount = 0;
        let missingCount = 0;
        
        // 计算每个区间的缺失编码和期望总数
        for (const range of ranges) {
          const start = parseInt(range.start);
          const end = parseInt(range.end);
          
          const startStr = String(range.start).trim();
          const endStr = String(range.end).trim();
          const hasLeadingZero = startStr.startsWith('0') || endStr.startsWith('0');
          
          const width = Math.max(
            startStr.length,
            endStr.length
          );
          
          if (!isNaN(start) && !isNaN(end) && start <= end) {
            expectedCount += (end - start + 1);
            
            // 防止超大范围导致 Node.js 服务器卡死：放宽限制，以时间为主
            const MAX_ITERATIONS = 5000000; // 调高到 500万次
            const MAX_TIME_MS = 1500; // 后端允许 1.5 秒的计算时间
            const startTime = Date.now();
            let iterations = 0;

            for (let i = start; i <= end; i++) {
              iterations++;
              
              // 每 10000 次检查一次时间
              if (iterations % 10000 === 0) {
                if (Date.now() - startTime > MAX_TIME_MS) {
                  console.warn(`[Stats] Range checking stopped due to timeout (${MAX_TIME_MS}ms). iterations: ${iterations}`);
                  break;
                }
              }
              
              if (iterations > MAX_ITERATIONS) {
                console.warn(`[Stats] Range checking stopped due to max iterations (${MAX_ITERATIONS}).`);
                break;
              }

              let expected = i.toString();
              if (startStr.length === endStr.length) {
                expected = expected.padStart(startStr.length, '0');
              } else if (hasLeadingZero) {
                expected = expected.padStart(width, '0');
              }
              
              if (!existingCodesSet.has(expected)) {
                missingCount++;
              }
            }
          }
        }
        
        // 计算超出范围编码
        let excessCount = 0;
        let validCodesInRange = 0;
        
        existingCodes.forEach(code => {
          const str = String(code).trim();
          const codeNum = parseInt(str);
          
          let inAnyRange = false;
          let formatOk = false;
          
          for (const range of ranges) {
            const start = parseInt(range.start);
            const end = parseInt(range.end);
            
            const startStr = String(range.start).trim();
            const endStr = String(range.end).trim();
            const hasLeadingZero = startStr.startsWith('0') || endStr.startsWith('0');
            
            const width = Math.max(
              startStr.length,
              endStr.length
            );
            
            if (!isNaN(start) && !isNaN(end) && start <= end) {
              const inRange = !isNaN(codeNum) && codeNum >= start && codeNum <= end;
              
              let currentFormatOk = true;
              if (startStr.length === endStr.length) {
                currentFormatOk = str.length === startStr.length;
              } else if (hasLeadingZero) {
                currentFormatOk = str.length === width;
              } else {
                // 如果没有前导零（例如 1-100），那么输入的码也不应该有前导零
                if (str.length > 1 && str.startsWith('0')) {
                  currentFormatOk = false;
                }
              }
              
              if (inRange && currentFormatOk) {
                inAnyRange = true;
                formatOk = true;
                break; // 只要落入任意一个区间就算有效
              }
            }
          }
          
          if (!inAnyRange || !formatOk) {
            excessCount++;
          } else {
            validCodesInRange++;
          }
        });
        
        // 累计统计
        totalMissingCodes += missingCount;
        totalExcessCodes += excessCount;
        
        if (missingCount > 0) productsWithMissing++;
        if (excessCount > 0) productsWithExcess++;
        
        // 计算完整度 (实际有效编码数 / 期望编码数)
        const completeness = expectedCount > 0 ? Math.min(100, (validCodesInRange / expectedCount) * 100) : 0;
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
      const ratio = totalCodesCount > 0 ? totalExcessCodes / totalCodesCount : 0;
      qualityScore -= Math.min(20, ratio * 100 * 0.2);
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
      excessCodeRatio: totalCodesCount > 0 ? Math.round((totalExcessCodes / totalCodesCount) * 10000) / 100 : 0
    });
  } catch (error) {
    console.error('获取数据质量统计失败:', error);
    res.status(500).json({ error: '获取数据质量统计失败' });
  }
};

// 获取最近活动流
exports.getRecentActivity = async (req, res) => {
  try {
    const isMongo = typeof Product.countDocuments === 'function';
    let recentActivities = [];
    let todayStats = { totalToday: 0, productsToday: 0, codesToday: 0 };
    let hourlyDistribution = new Array(24).fill(0);
    
    if (isMongo) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const recentProducts = await Product.find().sort({ createdAt: -1 }).limit(5);
      const recentCodes = await Code.find().sort({ createdAt: -1 }).limit(5).populate('productId', 'name');

      const activities = [];
      recentProducts.forEach(product => {
        activities.push({
          id: `product_${product._id || product.id}`,
          type: 'product_created',
          title: '新增产品',
          description: `创建了产品"${product.name}"`,
          productName: product.name,
          productId: product._id || product.id,
          createdAt: product.createdAt,
          timestamp: new Date(product.createdAt).getTime()
        });
      });

      recentCodes.forEach(code => {
        const productName = code.productId ? code.productId.name : '未知产品';
        const pId = code.productId ? (code.productId._id || code.productId.id) : code.productId;
        activities.push({
          id: `code_${code._id || code.id}`,
          type: 'code_created',
          title: '新增编码',
          description: `为产品"${productName}"添加了编码"${code.code}"`,
          productName,
          productId: pId,
          code: code.code,
          createdAt: code.createdAt,
          timestamp: new Date(code.createdAt).getTime()
        });
      });

      recentActivities = activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

      const todayProducts = await Product.find({ createdAt: { $gte: today } }, 'createdAt');
      const todayCodes = await Code.find({ createdAt: { $gte: today } }, 'createdAt');

      todayStats = {
        totalToday: todayProducts.length + todayCodes.length,
        productsToday: todayProducts.length,
        codesToday: todayCodes.length
      };

      todayProducts.forEach(p => hourlyDistribution[new Date(p.createdAt).getHours()]++);
      todayCodes.forEach(c => hourlyDistribution[new Date(c.createdAt).getHours()]++);
    } else {
      const products = await Product.find();
      const allCodes = await Code.find();
      
      const activities = [];
      
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
      
      recentActivities = activities
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);
      
      const todayStr = new Date().toDateString();
      const todayActivities = activities.filter(activity => 
        new Date(activity.createdAt).toDateString() === todayStr
      );
      
      todayStats = {
        totalToday: todayActivities.length,
        productsToday: todayActivities.filter(a => a.type === 'product_created').length,
        codesToday: todayActivities.filter(a => a.type === 'code_created').length
      };
      
      todayActivities.forEach(activity => {
        const hour = new Date(activity.createdAt).getHours();
        hourlyDistribution[hour]++;
      });
    }

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
