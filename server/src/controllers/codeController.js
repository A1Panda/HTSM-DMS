const Code = require('../models/Code');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const { extractNumericValue } = require('../utils/codeUtils');

// 获取所有编码（带分页）
exports.getAllCodes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const productId = req.query.productId;
    const { codeStart, codeEnd, startDate, endDate, keyword, includeDeleted } = req.query;
    
    const query = productId ? { productId } : {};
    
    // 编码范围搜索 — 不做 $gte/$lte 字符串比较（编码可能含前缀如"文版-123"），
    // 改为查询后按提取数字过滤
    const hasCodeRange = !!(codeStart || codeEnd);
    const numStart = codeStart ? parseInt(codeStart) : NaN;
    const numEnd = codeEnd ? parseInt(codeEnd) : NaN;
    
    // 日期范围搜索 (同时匹配 createdAt 或 date 字段)
    if (startDate || endDate) {
      const dateQuery = {};
      const createdAtQuery = {};
      
      if (startDate) {
        createdAtQuery.$gte = new Date(startDate);
        // date 字段是字符串 YYYY-MM-DD，所以我们截取 startDate 的日期部分
        dateQuery.$gte = startDate.split('T')[0];
      }
      if (endDate) {
        createdAtQuery.$lte = new Date(endDate);
        dateQuery.$lte = endDate.split('T')[0];
      }
      
      // 使用 $or 来匹配 createdAt 或 date
      const dateOrQuery = [
        { createdAt: createdAtQuery },
        { date: dateQuery }
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: dateOrQuery }];
        delete query.$or;
      } else {
        query.$or = dateOrQuery;
      }
    }
    
    // 关键字搜索 (在 code 和 description 中搜索)
    if (keyword) {
      const keywordQuery = [
        { code: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
      
      if (query.$and) {
        query.$and.push({ $or: keywordQuery });
      } else if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: keywordQuery }
        ];
        delete query.$or;
      } else {
        query.$or = keywordQuery;
      }
    }

    // 如果 includeDeleted 为 true，则不过滤已删除的
    if (includeDeleted !== 'true' && includeDeleted !== true) {
      query.deleted = false;
    }
    
    const result = await Code.paginate(query, { page, limit });
    
    // 编码范围后过滤：从编码中提取末尾数字进行数值比较
    if (hasCodeRange && result.codes) {
      result.codes = result.codes.filter(code => {
        const num = extractNumericValue(code.code);
        if (isNaN(num)) return false;
        if (!isNaN(numStart) && num < numStart) return false;
        if (!isNaN(numEnd) && num > numEnd) return false;
        return true;
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('获取所有编码失败:', error);
    res.status(500).json({ error: '获取所有编码失败' });
  }
};

// 获取产品的所有编码
exports.getProductCodes = async (req, res) => {
  try {
    const { productId } = req.params;
    const deleted = req.query.deleted === 'true';
    
    const codes = await Code.find({ productId, deleted });
    res.json(codes);
  } catch (error) {
    console.error('获取编码列表失败:', error);
    res.status(500).json({ error: '获取编码列表失败' });
  }
};

// 为产品添加编码
exports.addCode = async (req, res) => {
  // 验证请求
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { productId } = req.params;
    let { code, description, date } = req.body;
    
    // 清理编码，保留完整字符
    if (code) {
      code = code.trim();
    }
    
    // 检查产品是否存在
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }

    // 检查是否已存在（末尾数字相同即视为重复）
    const isMongoDB = !!process.env.MONGODB_URI;
    
    if (isMongoDB) {
      // 获取该产品所有编码，按末尾数字检查重复
      const allCodes = await Code.find({ productId });
      const newNum = extractNumericValue(code);
      
      if (!isNaN(newNum)) {
        // 检查未删除的编码中是否有末尾数字相同的
        const duplicateActive = allCodes.find(c => !c.deleted && extractNumericValue(c.code) === newNum);
        if (duplicateActive) {
          return res.status(400).json({ error: `编码已存在（末尾数字 ${newNum} 重复），请使用不同的编码` });
        }
        
        // 回收站中有末尾数字相同的编码 → 永久删除旧的，使用新的编码字符串录入
        const duplicateDeleted = allCodes.find(c => c.deleted && extractNumericValue(c.code) === newNum);
        if (duplicateDeleted) {
          await Code.findByIdAndDelete(duplicateDeleted._id);
        }
      }
    } else {
      // 文件系统环境 — 回收站中有末尾数字相同的编码 → 永久删除旧的
      const deletedCodes = await Code.find({ productId, deleted: true });
      const newNum = extractNumericValue(code);
      if (!isNaN(newNum)) {
        const duplicateDeleted = deletedCodes.find(c => extractNumericValue(c.code) === newNum);
        if (duplicateDeleted) {
          await Code.findByIdAndDelete(duplicateDeleted.id, productId);
        }
      }
    }
    
    // 创建新编码
    const newCode = await Code.create({
      code,
      description: description || '',
      date: date || '',
      productId
    });
    
    res.status(201).json(newCode);
  } catch (error) {
    if (error.message === '编码已存在') {
      return res.status(400).json({ error: '编码已存在，请使用不同的编码' });
    }
    console.error('添加编码失败:', error);
    res.status(500).json({ error: '添加编码失败' });
  }
};

// 删除编码 (软删除)
exports.deleteCode = async (req, res) => {
  try {
    const { productId, codeId } = req.params;
    
    // 如果是 MongoDB 环境，使用标准的 findByIdAndUpdate
    if (process.env.MONGODB_URI) {
      const deletedCode = await Code.findByIdAndUpdate(
        codeId, 
        { deleted: true, deletedAt: new Date() },
        { new: true } // 返回更新后的文档
      );
      
      if (!deletedCode) {
        return res.status(404).json({ error: '编码不存在' });
      }
    } else {
      // 文件系统环境
      const deletedCode = await Code.findByIdAndUpdate(
        codeId, 
        { deleted: true, deletedAt: new Date() },
        productId
      );
      
      if (!deletedCode) {
        return res.status(404).json({ error: '编码不存在' });
      }
    }
    
    res.json({ success: true, message: '编码已移入回收站' });
  } catch (error) {
    console.error('删除编码失败:', error);
    res.status(500).json({ error: '删除编码失败' });
  }
};

// 更新编码
exports.updateCode = async (req, res) => {
  // 验证请求
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { productId, codeId } = req.params;
    let { code, description, date } = req.body;
    
    // 清理编码，保留完整字符
    if (code) {
      code = code.trim();
    }
    
    // 检查产品是否存在
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: '产品不存在' });
    }

    if (!code) {
      return res.status(400).json({ error: '编码不能为空或格式错误' });
    }

    // 检查是否修改了编码且末尾数字与其他编码冲突
    const isMongoDB = !!process.env.MONGODB_URI;
    
    if (isMongoDB) {
      const allCodes = await Code.find({ productId, _id: { $ne: codeId } });
      const newNum = extractNumericValue(code);
      if (!isNaN(newNum)) {
        const duplicate = allCodes.find(c => extractNumericValue(c.code) === newNum);
        if (duplicate) {
          return res.status(400).json({ error: `编码已存在（末尾数字 ${newNum} 重复），请使用不同的编码` });
        }
      }
      
      const updatedCode = await Code.findByIdAndUpdate(
        codeId,
        { code, description: description || '', date: date || '' },
        { new: true }
      );
      
      if (!updatedCode) {
        return res.status(404).json({ error: '编码不存在' });
      }
      return res.json(updatedCode);
    } else {
      // 文件系统环境 — 检查末尾数字是否与其他编码冲突
      const allCodes = await Code.find({ productId });
      const newNum = extractNumericValue(code);
      if (!isNaN(newNum)) {
        const existingConflict = allCodes.find(c => 
          extractNumericValue(c.code) === newNum && String(c._id || c.id) !== String(codeId)
        );
        if (existingConflict) {
          return res.status(400).json({ error: `编码已存在（末尾数字 ${newNum} 重复），请使用不同的编码` });
        }
      }
      
      const updatedCode = await Code.findByIdAndUpdate(
        codeId,
        { code, description: description || '', date: date || '' },
        productId
      );
      
      if (!updatedCode) {
        return res.status(404).json({ error: '编码不存在' });
      }
      return res.json(updatedCode);
    }
  } catch (error) {
    console.error('更新编码失败:', error);
    res.status(500).json({ error: '更新编码失败' });
  }
};

// 恢复编码
exports.restoreCode = async (req, res) => {
  try {
    const { productId, codeId } = req.params;
    
    // 如果是 MongoDB 环境
    if (process.env.MONGODB_URI) {
      const restoredCode = await Code.findByIdAndUpdate(
        codeId,
        { deleted: false, deletedAt: null },
        { new: true }
      );
      
      if (!restoredCode) {
        return res.status(404).json({ error: '编码不存在' });
      }
    } else {
      // 文件系统环境
      const restoredCode = await Code.findByIdAndUpdate(
        codeId,
        { deleted: false, deletedAt: null },
        productId
      );
      
      if (!restoredCode) {
        return res.status(404).json({ error: '编码不存在' });
      }
    }
    
    res.json({ success: true, message: '编码恢复成功' });
  } catch (error) {
    console.error('恢复编码失败:', error);
    res.status(500).json({ error: '恢复编码失败' });
  }
};

// 永久删除编码
exports.permanentDeleteCode = async (req, res) => {
  try {
    const { productId, codeId } = req.params;
    
    // 如果是 MongoDB 环境
    if (process.env.MONGODB_URI) {
      const deletedCode = await Code.findByIdAndDelete(codeId);
      
      if (!deletedCode) {
        return res.status(404).json({ error: '编码不存在' });
      }
    } else {
      // 文件系统环境
      const deletedCode = await Code.findByIdAndDelete(codeId, productId);
      
      if (!deletedCode) {
        return res.status(404).json({ error: '编码不存在' });
      }
    }
    
    res.json({ success: true, message: '编码永久删除成功' });
  } catch (error) {
    console.error('永久删除编码失败:', error);
    res.status(500).json({ error: '永久删除编码失败' });
  }
};

// 批量移动编码到其他产品
exports.moveCodes = async (req, res) => {
  try {
    const { codeIds, sourceProductId, targetProductId } = req.body;

    if (!codeIds || !Array.isArray(codeIds) || codeIds.length === 0) {
      return res.status(400).json({ error: '请选择要移动的编码' });
    }

    if (!sourceProductId || !targetProductId) {
      return res.status(400).json({ error: '源产品和目标产品不能为空' });
    }

    if (sourceProductId === targetProductId) {
      return res.status(400).json({ error: '源产品和目标产品不能相同' });
    }

    // 检查目标产品是否存在
    const targetProduct = await Product.findById(targetProductId);
    if (!targetProduct) {
      return res.status(404).json({ error: '目标产品不存在' });
    }

    const isMongoDB = !!process.env.MONGODB_URI;
    let movedCount = 0;
    const failedCodes = [];

    if (isMongoDB) {
      // MongoDB 模式
      for (const codeId of codeIds) {
        try {
          const code = await Code.findById(codeId);
          if (!code) {
            failedCodes.push({ id: codeId, reason: '编码不存在' });
            continue;
          }

          if (String(code.productId) !== String(sourceProductId)) {
            failedCodes.push({ id: codeId, code: code.code, reason: '编码不属于源产品' });
            continue;
          }

          // 检查目标产品中是否已存在相同编码
          const existingInTarget = await Code.findOne({
            productId: targetProductId,
            code: code.code
          });

          if (existingInTarget) {
            failedCodes.push({ id: codeId, code: code.code, reason: `目标产品中已存在编码 "${code.code}"` });
            continue;
          }

          code.productId = targetProductId;
          await code.save();
          movedCount++;
        } catch (err) {
          failedCodes.push({ id: codeId, reason: err.message });
        }
      }
    } else {
      // 文件系统模式
      const fs = require('fs');
      const path = require('path');
      const DATA_DIR = path.join(__dirname, '../../../data');

      const sourceFile = path.join(DATA_DIR, `${sourceProductId}_codes.json`);
      const targetFile = path.join(DATA_DIR, `${targetProductId}_codes.json`);

      if (!fs.existsSync(sourceFile)) {
        return res.status(404).json({ error: '源产品编码文件不存在' });
      }

      const sourceCodes = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
      let targetCodes = [];
      if (fs.existsSync(targetFile)) {
        targetCodes = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
      }

      const targetCodeSet = new Set(targetCodes.map(c => c.code));

      for (const codeId of codeIds) {
        const codeIndex = sourceCodes.findIndex(c => c.id === codeId);
        if (codeIndex === -1) {
          failedCodes.push({ id: codeId, reason: '编码不存在' });
          continue;
        }

        const code = sourceCodes[codeIndex];

        if (targetCodeSet.has(code.code)) {
          failedCodes.push({ id: codeId, code: code.code, reason: `目标产品中已存在编码 "${code.code}"` });
          continue;
        }

        // 从源文件移除，添加到目标文件
        sourceCodes.splice(codeIndex, 1);
        targetCodes.push({ ...code, productId: targetProductId });
        targetCodeSet.add(code.code);
        movedCount++;
      }

      fs.writeFileSync(sourceFile, JSON.stringify(sourceCodes, null, 2));
      fs.writeFileSync(targetFile, JSON.stringify(targetCodes, null, 2));
    }

    res.json({
      success: true,
      movedCount,
      failedCount: failedCodes.length,
      failedCodes,
      message: `成功移动 ${movedCount} 个编码${failedCodes.length > 0 ? `，${failedCodes.length} 个失败` : ''}`
    });
  } catch (error) {
    console.error('移动编码失败:', error);
    res.status(500).json({ error: '移动编码失败' });
  }
};

// 批量检查重复编码
exports.batchCheckDuplicate = async (req, res) => {
  try {
    const { productIds } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length < 2) {
      return res.status(400).json({ error: '请至少选择 2 个产品进行查重' });
    }
    
    // 获取所有选中产品的编码
    const allCodes = [];
    const productMap = new Map();
    
    for (const productId of productIds) {
      const codes = await Code.find({ productId, deleted: false });
      const product = await Product.findById(productId);
      
      if (product) {
        productMap.set(productId, product.name);
      }
      
      codes.forEach(code => {
        allCodes.push({
          code: code.code,
          productId: productId,
          productName: product ? product.name : '未知产品'
        });
      });
    }
    
    // 使用 Map 按末尾数字找出重复项
    const codeMap = new Map(); // key: 末尾数字, value: { codes: [...], products: [...] }
    allCodes.forEach(item => {
      const num = extractNumericValue(item.code);
      if (isNaN(num)) return; // 无数字的编码不参与查重
      
      if (codeMap.has(num)) {
        const entry = codeMap.get(num);
        entry.products.push({
          id: item.productId,
          name: item.productName
        });
        // 收集不同的编码字符串用于展示
        if (!entry.codes.includes(item.code)) {
          entry.codes.push(item.code);
        }
      } else {
        codeMap.set(num, {
          codes: [item.code],
          products: [{
            id: item.productId,
            name: item.productName
          }]
        });
      }
    });
    
    // 筛选出重复的编码（末尾数字出现在多个产品中）
    const duplicates = [];
    codeMap.forEach((entry, num) => {
      // 去重：同一产品内可能有重复编码
      const uniqueProducts = [];
      const seenIds = new Set();
      entry.products.forEach(p => {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          uniqueProducts.push(p);
        }
      });
      
      if (uniqueProducts.length > 1) {
        duplicates.push({
          code: entry.codes.join(', '),  // 展示所有不同的编码字符串
          products: uniqueProducts
        });
      }
    });
    
    // 按编码排序
    duplicates.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    
    res.json({
      duplicates: duplicates,
      totalChecked: allCodes.length,
      duplicateCount: duplicates.length
    });
  } catch (error) {
    console.error('批量查重失败:', error);
    res.status(500).json({ error: '批量查重失败' });
  }
};
