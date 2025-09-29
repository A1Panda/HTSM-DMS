const ToolHead = require('../models/ToolHead');
const UsageRecord = require('../models/UsageRecord');
const StockMovement = require('../models/StockMovement');
const MaintenanceRecord = require('../models/MaintenanceRecord');

// 获取仪表盘统计数据
exports.getDashboardStats = async (req, res) => {
  try {
    // 基础统计
    const totalToolheads = await ToolHead.find();
    const totalUsageRecords = await UsageRecord.find();
    const totalStockMovements = await StockMovement.find();
    const totalMaintenanceRecords = await MaintenanceRecord.find();

    // 计算基础指标
    const totalStock = totalToolheads.reduce((sum, th) => sum + (th.currentStock || 0), 0);
    const inUseCount = totalToolheads.filter(th => th.status === '使用中').length;
    const needMaintenanceCount = totalToolheads.filter(th => {
      const usageRate = th.maxUsageHours > 0 ? (th.totalUsageHours / th.maxUsageHours) * 100 : 0;
      return usageRate >= 80;
    }).length;

    // 今日统计
    const today = new Date().toDateString();
    const todayStockMovements = totalStockMovements.filter(sm => 
      new Date(sm.createdAt).toDateString() === today
    );
    const todayUsage = totalUsageRecords.filter(ur => 
      new Date(ur.createdAt).toDateString() === today
    );

    // 按类型统计
    const typeStats = {};
    totalToolheads.forEach(th => {
      const type = th.type || '其他';
      if (!typeStats[type]) {
        typeStats[type] = { count: 0, stock: 0 };
      }
      typeStats[type].count++;
      typeStats[type].stock += th.currentStock || 0;
    });

    // 库存预警
    const lowStockItems = totalToolheads.filter(th => 
      th.currentStock <= th.safetyStock
    ).length;

    const stats = {
      overview: {
        totalToolheads: totalToolheads.length,
        totalStock,
        inUseCount,
        needMaintenanceCount,
        lowStockItems
      },
      today: {
        stockMovements: todayStockMovements.length,
        usageRecords: todayUsage.length,
        inbound: todayStockMovements.filter(sm => ['入库', '退库', '归还'].includes(sm.type)).length,
        outbound: todayStockMovements.filter(sm => ['出库', '报废', '借用'].includes(sm.type)).length
      },
      typeDistribution: Object.keys(typeStats).map(type => ({
        type,
        count: typeStats[type].count,
        stock: typeStats[type].stock
      })),
      recentActivity: []
    };

    // 最近活动（最近5条记录）
    const recentMovements = totalStockMovements
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(sm => {
        const toolhead = totalToolheads.find(th => th.id === sm.toolHeadId);
        return {
          id: sm.id,
          type: 'stock_movement',
          action: sm.type,
          description: `${sm.type}: ${toolhead ? toolhead.name : '未知刀头'} (${sm.quantity})`,
          operator: sm.operator,
          createdAt: sm.createdAt
        };
      });

    stats.recentActivity = recentMovements;

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取仪表盘统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败',
      error: error.message
    });
  }
};

// 获取使用统计
exports.getUsageStats = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    let usageRecords = await UsageRecord.find();
    
    // 日期过滤
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      usageRecords = usageRecords.filter(record => {
        const recordDate = new Date(record.createdAt);
        return recordDate >= start && recordDate <= end;
      });
    }

    // 按操作员统计
    const operatorStats = await UsageRecord.getStatsByOperator ? 
      await UsageRecord.getStatsByOperator(startDate, endDate) : [];

    // 按机器统计
    const machineStats = await UsageRecord.getStatsByMachine ? 
      await UsageRecord.getStatsByMachine(startDate, endDate) : [];

    // 使用时长趋势
    const usageTrend = {};
    usageRecords.forEach(record => {
      const date = new Date(record.createdAt);
      let dateKey;
      
      switch (groupBy) {
        case 'hour':
          dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'month':
          dateKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
          break;
        default:
          dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      }
      
      if (!usageTrend[dateKey]) {
        usageTrend[dateKey] = { date: dateKey, hours: 0, count: 0 };
      }
      
      usageTrend[dateKey].hours += record.usageHours || 0;
      usageTrend[dateKey].count++;
    });

    res.json({
      success: true,
      data: {
        total: usageRecords.length,
        totalHours: usageRecords.reduce((sum, r) => sum + (r.usageHours || 0), 0),
        operatorStats,
        machineStats,
        usageTrend: Object.values(usageTrend).sort((a, b) => a.date.localeCompare(b.date))
      }
    });
  } catch (error) {
    console.error('获取使用统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取使用统计失败',
      error: error.message
    });
  }
};

// 获取库存统计
exports.getStockStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let stockMovements = await StockMovement.find();
    
    // 日期过滤
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      stockMovements = stockMovements.filter(movement => {
        const movementDate = new Date(movement.createdAt);
        return movementDate >= start && movementDate <= end;
      });
    }

    // 按类型统计
    const typeStats = await StockMovement.getStatsByType ? 
      await StockMovement.getStatsByType(startDate, endDate) : [];

    // 按时间段统计
    const periodStats = await StockMovement.getStatsByPeriod ? 
      await StockMovement.getStatsByPeriod('day', startDate, endDate) : [];

    // 库存价值统计
    const toolheads = await ToolHead.find();
    const totalValue = toolheads.reduce((sum, th) => {
      return sum + ((th.purchasePrice || 0) * (th.currentStock || 0));
    }, 0);

    res.json({
      success: true,
      data: {
        totalMovements: stockMovements.length,
        totalValue,
        typeStats,
        periodStats
      }
    });
  } catch (error) {
    console.error('获取库存统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取库存统计失败',
      error: error.message
    });
  }
};

// 获取维护统计
exports.getMaintenanceStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let maintenanceRecords = await MaintenanceRecord.find();
    
    // 日期过滤
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      maintenanceRecords = maintenanceRecords.filter(record => {
        const recordDate = new Date(record.createdAt);
        return recordDate >= start && recordDate <= end;
      });
    }

    // 按类型统计
    const typeStats = await MaintenanceRecord.getStatsByType ? 
      await MaintenanceRecord.getStatsByType(startDate, endDate) : [];

    // 按技术员统计
    const technicianStats = await MaintenanceRecord.getStatsByTechnician ? 
      await MaintenanceRecord.getStatsByTechnician(startDate, endDate) : [];

    // 总成本
    const totalCost = maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
    const completedCount = maintenanceRecords.filter(r => r.status === '已完成').length;

    res.json({
      success: true,
      data: {
        total: maintenanceRecords.length,
        completed: completedCount,
        completionRate: maintenanceRecords.length > 0 ? (completedCount / maintenanceRecords.length) * 100 : 0,
        totalCost,
        averageCost: maintenanceRecords.length > 0 ? totalCost / maintenanceRecords.length : 0,
        typeStats,
        technicianStats
      }
    });
  } catch (error) {
    console.error('获取维护统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取维护统计失败',
      error: error.message
    });
  }
};
