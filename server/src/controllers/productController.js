const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// 获取所有产品
exports.getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const sortField = req.query.sortField || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // 构建查询条件
    const query = {};
    
    // 搜索条件
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex }
      ];
    }
    
    // 分类筛选
    if (category && category !== 'all') {
      query.category = category;
    }

    // 检查是否使用MongoDB (通过检查 Product 是否有 countDocuments 方法来判断是否为 Mongoose 模型)
    if (Product.countDocuments) {
      // MongoDB 分页实现
      const skip = (page - 1) * limit;
      
      const sort = {};
      sort[sortField] = sortOrder;
      
      const total = await Product.countDocuments(query);
      const products = await Product.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      // 获取所有分类
      const categories = await Product.distinct('category');
      
      res.json({
        products,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        categories: categories.filter(c => c && c.trim() !== '')
      });
    } else {
      // 文件系统模式 - 获取所有数据后在内存中处理
      // Product.find() 在文件模式下返回所有数据，不支持查询参数
      let allProducts = await Product.find();
      
      // 获取所有分类
      const categories = [...new Set(allProducts.map(p => p.category).filter(c => c && c.trim() !== ''))];

      let products = allProducts;
      
      // 1. 过滤
      if (search) {
        const searchLower = search.toLowerCase();
        products = products.filter(p => 
          (p.name && p.name.toLowerCase().includes(searchLower)) ||
          (p.description && p.description.toLowerCase().includes(searchLower)) ||
          (p.category && p.category.toLowerCase().includes(searchLower))
        );
      }
      
      if (category && category !== 'all') {
        products = products.filter(p => p.category === category);
      }
      
      // 2. 排序
      products.sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        
        if (sortField === 'createdAt') {
            aValue = new Date(aValue || 0).getTime();
            bValue = new Date(bValue || 0).getTime();
        } else {
            aValue = (aValue || '').toString().toLowerCase();
            bValue = (bValue || '').toString().toLowerCase();
        }
        
        if (aValue < bValue) return sortOrder === 1 ? -1 : 1;
        if (aValue > bValue) return sortOrder === 1 ? 1 : -1;
        return 0;
      });
      
      // 3. 分页
      const total = products.length;
      const startIndex = (page - 1) * limit;
      const paginatedProducts = products.slice(startIndex, startIndex + limit);
      
      res.json({
        products: paginatedProducts,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        categories
      });
    }
  } catch (error) {
    console.error('获取产品列表失败:', error);
    res.status(500).json({ error: '获取产品列表失败' });
  }
};

// 获取单个产品
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('获取产品详情失败:', error);
    res.status(500).json({ error: '获取产品详情失败' });
  }
};

// 创建新产品
exports.createProduct = async (req, res) => {
  // 验证请求
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { name, description, category, requiredQuantity, codeStart, codeEnd, codeRanges } = req.body;
    
    // 验证 codeRanges
    if (codeRanges && codeRanges.length > 0) {
      let validRanges = codeRanges.filter(r => r && r.start && r.end);
      
      // 验证起始值不能大于结束值
      for (let range of validRanges) {
        if (parseInt(range.start) > parseInt(range.end)) {
          return res.status(400).json({ error: '起始值不能大于结束值' });
        }
      }

      // 验证是否重叠
      let hasOverlap = false;
      for (let i = 0; i < validRanges.length; i++) {
        for (let j = i + 1; j < validRanges.length; j++) {
          const start1 = parseInt(validRanges[i].start);
          const end1 = parseInt(validRanges[i].end);
          const start2 = parseInt(validRanges[j].start);
          const end2 = parseInt(validRanges[j].end);
          
          if (!isNaN(start1) && !isNaN(end1) && !isNaN(start2) && !isNaN(end2)) {
            if (
              (start1 >= start2 && start1 <= end2) || 
              (start2 >= start1 && start2 <= end1)
            ) {
              hasOverlap = true;
              break;
            }
          }
        }
        if (hasOverlap) break;
      }
      
      if (hasOverlap) {
        return res.status(400).json({ error: '号码段之间不能有包含或重叠关系' });
      }
    }

    // 创建新产品
    const newProduct = await Product.create({
      name,
      description: description || '',
      category: category || '',
      requiredQuantity: requiredQuantity || 0,
      codeStart: codeStart || '',
      codeEnd: codeEnd || '',
      codeRanges: codeRanges || []
    });
    
    res.status(201).json(newProduct);
  } catch (error) {
    if (error.message === '产品已存在' || error.code === 11000) {
      return res.status(400).json({ error: '产品已存在' });
    }
    console.error('添加产品失败:', error);
    res.status(500).json({ error: '添加产品失败' });
  }
};

// 删除产品
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }
    
    res.json({ success: true, message: '产品删除成功' });
  } catch (error) {
    console.error('删除产品失败:', error);
    res.status(500).json({ error: '删除产品失败' });
  }
};

// 更新产品
exports.updateProduct = async (req, res) => {
  // 验证请求
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { name, description, category, requiredQuantity, codeStart, codeEnd, codeRanges } = req.body;
    
    // 验证 codeRanges
    if (codeRanges && codeRanges.length > 0) {
      let validRanges = codeRanges.filter(r => r && r.start && r.end);
      
      // 验证起始值不能大于结束值
      for (let range of validRanges) {
        if (parseInt(range.start) > parseInt(range.end)) {
          return res.status(400).json({ error: '起始值不能大于结束值' });
        }
      }

      // 验证是否重叠
      let hasOverlap = false;
      for (let i = 0; i < validRanges.length; i++) {
        for (let j = i + 1; j < validRanges.length; j++) {
          const start1 = parseInt(validRanges[i].start);
          const end1 = parseInt(validRanges[i].end);
          const start2 = parseInt(validRanges[j].start);
          const end2 = parseInt(validRanges[j].end);
          
          if (!isNaN(start1) && !isNaN(end1) && !isNaN(start2) && !isNaN(end2)) {
            if (
              (start1 >= start2 && start1 <= end2) || 
              (start2 >= start1 && start2 <= end1)
            ) {
              hasOverlap = true;
              break;
            }
          }
        }
        if (hasOverlap) break;
      }
      
      if (hasOverlap) {
        return res.status(400).json({ error: '号码段之间不能有包含或重叠关系' });
      }
    }

    // 查找并更新产品
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description: description || '',
        category: category || '',
        requiredQuantity: requiredQuantity || 0,
        codeStart: codeStart || '',
        codeEnd: codeEnd || '',
        codeRanges: codeRanges || []
      },
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }
    
    res.json(product);
  } catch (error) {
    if (error.code === 11000 || error.message === '产品已存在') {
      return res.status(400).json({ error: '产品名称已存在' });
    }
    console.error('更新产品失败:', error);
    res.status(500).json({ error: '更新产品失败' });
  }
};