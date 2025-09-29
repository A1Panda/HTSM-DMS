const ToolHead = require('../models/ToolHead');
const StockMovement = require('../models/StockMovement');

// 获取刀头列表
exports.getToolHeads = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      status,
      brand,
      supplier,
      location,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    // 构建查询条件
    const query = {};
    
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { specification: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (brand) query.brand = brand;
    if (supplier) query.supplier = supplier;
    if (location) query.location = { $regex: location, $options: 'i' };

    // 构建排序条件
    const sortObj = {};
    sortObj[sort] = order === 'asc' ? 1 : -1;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortObj
    };

    const result = await ToolHead.paginate(query, options);
    
    res.json({
      success: true,
      data: result.docs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.totalDocs,
        pages: result.totalPages,
        hasNext: result.hasNextPage,
        hasPrev: result.hasPrevPage
      }
    });
  } catch (error) {
    console.error('获取刀头列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取刀头列表失败',
      error: error.message
    });
  }
};

// 获取单个刀头详情
exports.getToolHeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const toolhead = await ToolHead.findById(id);
    
    if (!toolhead) {
      return res.status(404).json({
        success: false,
        message: '刀头不存在'
      });
    }

    res.json({
      success: true,
      data: toolhead
    });
  } catch (error) {
    console.error('获取刀头详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取刀头详情失败',
      error: error.message
    });
  }
};

// 创建新刀头
exports.createToolHead = async (req, res) => {
  try {
    const toolheadData = req.body;
    
    // 验证必填字段
    if (!toolheadData.code || !toolheadData.name || !toolheadData.type) {
      return res.status(400).json({
        success: false,
        message: '编码、名称和类型为必填字段'
      });
    }

    // 检查编码是否已存在
    const existingToolhead = await ToolHead.findOne({ code: toolheadData.code });
    if (existingToolhead) {
      return res.status(409).json({
        success: false,
        message: '刀头编码已存在'
      });
    }

    const newToolhead = await ToolHead.create(toolheadData);
    
    // 如果有初始库存，创建入库记录
    if (newToolhead.currentStock > 0) {
      await StockMovement.create({
        toolHeadId: newToolhead.id,
        type: '入库',
        quantity: newToolhead.currentStock,
        currentStock: newToolhead.currentStock,
        operator: req.body.operator || '系统',
        reason: '初始库存',
        unitPrice: newToolhead.purchasePrice || 0
      });
    }

    res.status(201).json({
      success: true,
      message: '刀头创建成功',
      data: newToolhead
    });
  } catch (error) {
    console.error('创建刀头失败:', error);
    res.status(500).json({
      success: false,
      message: '创建刀头失败',
      error: error.message
    });
  }
};

// 更新刀头
exports.updateToolHead = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // 如果更新编码，检查是否与其他刀头冲突
    if (updateData.code) {
      const existingToolhead = await ToolHead.findOne({ 
        code: updateData.code,
        _id: { $ne: id }
      });
      if (existingToolhead) {
        return res.status(409).json({
          success: false,
          message: '刀头编码已存在'
        });
      }
    }

    const updatedToolhead = await ToolHead.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedToolhead) {
      return res.status(404).json({
        success: false,
        message: '刀头不存在'
      });
    }

    res.json({
      success: true,
      message: '刀头更新成功',
      data: updatedToolhead
    });
  } catch (error) {
    console.error('更新刀头失败:', error);
    res.status(500).json({
      success: false,
      message: '更新刀头失败',
      error: error.message
    });
  }
};

// 删除刀头
exports.deleteToolHead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedToolhead = await ToolHead.findByIdAndDelete(id);
    
    if (!deletedToolhead) {
      return res.status(404).json({
        success: false,
        message: '刀头不存在'
      });
    }

    res.json({
      success: true,
      message: '刀头删除成功',
      data: deletedToolhead
    });
  } catch (error) {
    console.error('删除刀头失败:', error);
    res.status(500).json({
      success: false,
      message: '删除刀头失败',
      error: error.message
    });
  }
};

// 批量删除刀头
exports.batchDeleteToolHeads = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的刀头ID列表'
      });
    }

    const deletePromises = ids.map(id => ToolHead.findByIdAndDelete(id));
    const results = await Promise.allSettled(deletePromises);
    
    const deleted = results.filter(result => result.status === 'fulfilled' && result.value !== null);
    const failed = results.filter(result => result.status === 'rejected' || result.value === null);

    res.json({
      success: true,
      message: `成功删除 ${deleted.length} 个刀头`,
      data: {
        deleted: deleted.length,
        failed: failed.length,
        total: ids.length
      }
    });
  } catch (error) {
    console.error('批量删除刀头失败:', error);
    res.status(500).json({
      success: false,
      message: '批量删除刀头失败',
      error: error.message
    });
  }
};

// 获取刀头统计信息
exports.getToolHeadStats = async (req, res) => {
  try {
    const allToolheads = await ToolHead.find();
    
    const stats = {
      total: allToolheads.length,
      byStatus: {},
      byType: {},
      byBrand: {},
      lowStock: 0,
      totalValue: 0,
      averagePrice: 0
    };

    allToolheads.forEach(toolhead => {
      // 按状态统计
      stats.byStatus[toolhead.status] = (stats.byStatus[toolhead.status] || 0) + 1;
      
      // 按类型统计
      stats.byType[toolhead.type] = (stats.byType[toolhead.type] || 0) + 1;
      
      // 按品牌统计
      if (toolhead.brand) {
        stats.byBrand[toolhead.brand] = (stats.byBrand[toolhead.brand] || 0) + 1;
      }
      
      // 低库存统计
      if (toolhead.currentStock <= toolhead.safetyStock) {
        stats.lowStock++;
      }
      
      // 价值统计
      const value = (toolhead.purchasePrice || 0) * (toolhead.currentStock || 0);
      stats.totalValue += value;
    });

    stats.averagePrice = stats.total > 0 ? stats.totalValue / stats.total : 0;

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取刀头统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取刀头统计失败',
      error: error.message
    });
  }
};

// 根据二维码获取刀头
exports.getToolHeadByQRCode = async (req, res) => {
  try {
    const { qrCode } = req.params;
    
    const toolhead = await ToolHead.findOne({ qrCode });
    
    if (!toolhead) {
      return res.status(404).json({
        success: false,
        message: '二维码对应的刀头不存在'
      });
    }

    res.json({
      success: true,
      data: toolhead
    });
  } catch (error) {
    console.error('根据二维码获取刀头失败:', error);
    res.status(500).json({
      success: false,
      message: '根据二维码获取刀头失败',
      error: error.message
    });
  }
};

// 更新刀头库存
exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, type, operator, reason } = req.body;
    
    if (!quantity || !type || !operator) {
      return res.status(400).json({
        success: false,
        message: '数量、类型和操作员为必填字段'
      });
    }

    const toolhead = await ToolHead.findById(id);
    if (!toolhead) {
      return res.status(404).json({
        success: false,
        message: '刀头不存在'
      });
    }

    // 计算新库存
    const inboundTypes = ['入库', '退库', '归还'];
    const outboundTypes = ['出库', '报废', '借用'];
    
    let newStock = toolhead.currentStock;
    if (inboundTypes.includes(type)) {
      newStock += Math.abs(quantity);
    } else if (outboundTypes.includes(type)) {
      newStock -= Math.abs(quantity);
    }

    // 检查库存不能为负
    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        message: '库存不足，无法执行此操作'
      });
    }

    // 更新刀头库存
    await ToolHead.findByIdAndUpdate(id, { currentStock: newStock });

    // 创建库存变动记录
    await StockMovement.create({
      toolHeadId: id,
      type,
      quantity: inboundTypes.includes(type) ? Math.abs(quantity) : -Math.abs(quantity),
      currentStock: newStock,
      operator,
      reason: reason || type,
      unitPrice: toolhead.purchasePrice || 0
    });

    res.json({
      success: true,
      message: '库存更新成功',
      data: {
        previousStock: toolhead.currentStock,
        newStock,
        change: newStock - toolhead.currentStock
      }
    });
  } catch (error) {
    console.error('更新库存失败:', error);
    res.status(500).json({
      success: false,
      message: '更新库存失败',
      error: error.message
    });
  }
};

// 获取库存预警列表
exports.getLowStockAlerts = async (req, res) => {
  try {
    const toolheads = await ToolHead.find();
    
    const alerts = toolheads.filter(toolhead => {
      return toolhead.currentStock <= toolhead.safetyStock;
    }).map(toolhead => ({
      id: toolhead.id,
      code: toolhead.code,
      name: toolhead.name,
      currentStock: toolhead.currentStock,
      safetyStock: toolhead.safetyStock,
      shortage: toolhead.safetyStock - toolhead.currentStock,
      type: toolhead.type,
      location: toolhead.location
    }));

    res.json({
      success: true,
      data: alerts,
      total: alerts.length
    });
  } catch (error) {
    console.error('获取库存预警失败:', error);
    res.status(500).json({
      success: false,
      message: '获取库存预警失败',
      error: error.message
    });
  }
};
