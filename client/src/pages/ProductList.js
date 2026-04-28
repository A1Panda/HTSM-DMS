import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Button, 
  Input, 
  Select, 
  Modal, 
  message, 
  Typography,
  Empty,
  Checkbox,
  Space,
  Skeleton,
  Pagination
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  ExclamationCircleOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  FileSearchOutlined
} from '@ant-design/icons';
import { productAPI, codeAPI } from '../services/api';
import ProductCard from '../components/ProductCard';
import ProductForm from '../components/ProductForm';

const { Title } = Typography;
const { Option } = Select;
const { confirm } = Modal;

// 防抖函数
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [productCodes, setProductCodes] = useState({});
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [batchMode, setBatchMode] = useState(false);
  const [codesModalVisible, setCodesModalVisible] = useState(false);
  const [codesModalTitle, setCodesModalTitle] = useState('');
  const [codesModalList, setCodesModalList] = useState([]);
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const modalPageSize = 100;
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [sortField, setSortField] = useState('createdAt'); // 'createdAt' | 'name'
  const searchInputRef = useRef(null);
  
  // 批量查重相关状态
  const [duplicateCheckModalVisible, setDuplicateCheckModalVisible] = useState(false);
  const [duplicateCheckLoading, setDuplicateCheckLoading] = useState(false);
  const [duplicateCheckResult, setDuplicateCheckResult] = useState(null);

  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 12, // 默认每页12个，适合 2, 3, 4, 6 列布局
    total: 0
  });

  // 加载产品编码
  const loadProductCodes = useCallback(async (productsData) => {
    try {
      const codesPromises = productsData.map(product => {
        // 如果产品ID无效，直接返回空数组
        if (!product.id || product.id === 'undefined') {
          return Promise.resolve({
            productId: product.id,
            codes: []
          });
        }
        return codeAPI.getProductCodes(product.id)
          .then(response => ({
            productId: product.id,
            codes: response.data
          }))
          .catch(() => ({
            productId: product.id,
            codes: []
          }));
      });
      
      const codesResults = await Promise.all(codesPromises);
      const codesMap = {};
      
      codesResults.forEach(result => {
        if (result && result.productId) {
          codesMap[result.productId] = result.codes;
        }
      });
      
      setProductCodes(codesMap);
    } catch (error) {
      console.error('加载产品编码失败:', error);
    }
  }, []);

  // 加载产品列表
  const loadProducts = useCallback(async (page = pagination.current, pageSize = pagination.pageSize, search = searchText, filter = currentFilter, sort = sortField, order = sortOrder) => {
    try {
      setLoading(true);
      
      const params = {
        page,
        limit: pageSize,
        search,
        category: filter,
        sortField: sort,
        sortOrder: order
      };

      const response = await productAPI.getAllProducts(params);
      
      // 处理新旧API响应格式兼容
      const data = response.data;
      let productsData = [];
      let totalCount = 0;
      let availableCategories = [];

      if (Array.isArray(data)) {
        // 旧API格式兼容 (虽然我们已经更新了后端，但为了安全起见)
        productsData = data;
        totalCount = data.length;
      } else {
        // 新API格式
        productsData = data.products || [];
        totalCount = data.total || 0;
        availableCategories = data.categories || [];
      }
      
      setProducts(productsData);
      setPagination(prev => ({
        ...prev,
        current: page,
        pageSize: pageSize,
        total: totalCount
      }));
      
      // 更新分类列表
      if (availableCategories.length > 0) {
        setCategories(availableCategories);
      } else if (productsData.length > 0 && categories.length === 0) {
         // 如果后端没返回categories且我们还没有分类，尝试从当前数据提取（降级方案）
         const uniqueCategories = [...new Set(productsData
          .map(product => product.category)
          .filter(category => category && category.trim() !== '')
        )];
        setCategories(uniqueCategories);
      }
      
      // 加载每个产品的编码数量 (仅加载当前页)
      loadProductCodes(productsData);
    } catch (error) {
      console.error('加载产品列表失败:', error);
      message.error('加载产品列表失败');
    } finally {
      setLoading(false);
    }
  }, [loadProductCodes, pagination.current, pagination.pageSize, searchText, currentFilter, sortField, sortOrder, categories.length]);

  // 初始加载
  useEffect(() => {
    // 使用默认参数加载
    loadProducts(1, 12, '', 'all', 'createdAt', 'desc');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 仅挂载时执行一次

  // 处理页码改变
  const handlePageChange = (page, pageSize) => {
    loadProducts(page, pageSize);
  };

  // 添加产品
  const handleAddProduct = async (values) => {
    try {
      setFormLoading(true);
      await productAPI.createProduct(values);
      message.success(`产品 "${values.name}" 添加成功`);
      setModalVisible(false);
      // 重新加载第一页
      loadProducts(1);
    } catch (error) {
      console.error('添加产品失败:', error);
      message.error('添加产品失败: ' + (error.response?.data?.error || '未知错误'));
    } finally {
      setFormLoading(false);
    }
  };

  // 编辑产品
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setEditModalVisible(true);
  };

  // 更新产品
  const handleUpdateProduct = async (values) => {
    try {
      setFormLoading(true);
      await productAPI.updateProduct(editingProduct.id, values);
      message.success(`产品 "${values.name}" 更新成功`);
      setEditModalVisible(false);
      setEditingProduct(null);
      // 重新加载当前页
      loadProducts();
    } catch (error) {
      console.error('更新产品失败:', error);
      message.error('更新产品失败: ' + (error.response?.data?.error || '未知错误'));
    } finally {
      setFormLoading(false);
    }
  };

  // 删除产品
  const handleDeleteProduct = async (id, name) => {
    try {
      await productAPI.deleteProduct(id);
      message.success('产品删除成功');
      // 重新加载当前页
      loadProducts();
    } catch (error) {
      console.error('删除产品失败:', error);
      message.error('删除产品失败');
    }
  };

  // 批量删除产品
  const confirmBatchDeleteProducts = () => {
    if (selectedProducts.length === 0) {
      message.warning('请先选择要删除的产品');
      return;
    }
    
    confirm({
      title: `确定要删除这 ${selectedProducts.length} 个产品吗？`,
      icon: <ExclamationCircleOutlined />,
      content: '这将同时删除这些产品的所有编码，此操作不可恢复。',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 批量删除
          await Promise.all(selectedProducts.map(id => productAPI.deleteProduct(id)));
          message.success(`成功删除 ${selectedProducts.length} 个产品`);
          setSelectedProducts([]);
          setBatchMode(false);
          loadProducts();
        } catch (error) {
          console.error('批量删除产品失败:', error);
          message.error('批量删除产品失败');
        }
      }
    });
  };

  // 处理产品选择
  const handleProductSelect = useCallback((productId, checked) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  }, []);

  // 全选/取消全选 (仅针对当前页)
  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedProducts(products.map(product => product.id));
    } else {
      setSelectedProducts([]);
    }
  }, [products]);

  // 切换批量模式
  const toggleBatchMode = useCallback(() => {
    setBatchMode(!batchMode);
    setSelectedProducts([]);
  }, [batchMode]);

  // 批量查重
  const handleBatchCheckDuplicate = useCallback(async () => {
    if (selectedProducts.length < 2) {
      message.warning('请至少选择 2 个产品进行查重');
      return;
    }
    
    try {
      setDuplicateCheckLoading(true);
      const response = await codeAPI.batchCheckDuplicate(selectedProducts);
      setDuplicateCheckResult(response.data);
      setDuplicateCheckModalVisible(true);
    } catch (error) {
      console.error('批量查重失败:', error);
      message.error(error.response?.data?.error || '批量查重失败');
    } finally {
      setDuplicateCheckLoading(false);
    }
  }, [selectedProducts]);

  // 引用最新的 loadProducts 函数，解决闭包问题
  const loadProductsRef = useRef(loadProducts);
  useEffect(() => {
    loadProductsRef.current = loadProducts;
  }, [loadProducts]);

  // 搜索产品（防抖）
  const debouncedSearch = useRef(
    debounce((value) => {
      setSearchText(value);
      // 使用最新的 loadProducts 函数
      // 传递 value 作为 search 参数，其他参数使用默认值（即当前的 state）
      // 注意：我们需要显式传递 undefined 以触发默认参数
      loadProductsRef.current(1, undefined, value);
    }, 500)
  ).current;

  const handleSearch = useCallback((value) => {
    debouncedSearch(value);
  }, [debouncedSearch, pagination.pageSize, currentFilter, sortField, sortOrder, loadProducts]);

  // 按分类筛选
  const handleCategoryFilter = useCallback((category) => {
    setCurrentFilter(category);
    // 筛选时重置到第一页
    loadProducts(1, pagination.pageSize, searchText, category, sortField, sortOrder);
  }, [pagination.pageSize, searchText, sortField, sortOrder, loadProducts]);

  // 切换排序
  const handleSort = useCallback((field) => {
    let newOrder = 'desc';
    if (sortField === field) {
      newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      setSortOrder(newOrder);
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    // 排序时重置到第一页
    loadProducts(1, pagination.pageSize, searchText, currentFilter, field, newOrder);
  }, [sortField, sortOrder, pagination.pageSize, searchText, currentFilter, loadProducts]);

  // 检查范围内缺失编码和超出范围的编码（使用useCallback优化）
  const checkCodeRangeStatus = useCallback((product) => {
    if (!product) {
      return { 
        hasMissing: false, 
        missingCodes: [], 
        hasExcess: false, 
        excessCodes: [] 
      };
    }
    
    // 获取所有的编码区间
    const ranges = [];
    if (product.codeRanges && product.codeRanges.length > 0) {
      ranges.push(...product.codeRanges);
    } else if (product.codeStart && product.codeEnd) {
      ranges.push({ start: product.codeStart, end: product.codeEnd });
    }
    
    if (ranges.length === 0) {
      return { 
        hasMissing: false, 
        missingCodes: [], 
        hasExcess: false, 
        excessCodes: [] 
      };
    }
    
    const codes = productCodes[product.id] || [];
    const existingCodes = codes.map(code => code.code);
    const existingCodesSet = new Set(existingCodes);
    
    const missingCodes = [];
    
    // 检查缺失的编码
    for (const range of ranges) {
      const start = parseInt(range.start);
      const end = parseInt(range.end);
      
      // 检查原字符串是否包含前导零
      const startStr = String(range.start).trim();
      const endStr = String(range.end).trim();
      const hasLeadingZero = startStr.startsWith('0') || endStr.startsWith('0');
      
      const width = Math.max(
        startStr.length, 
        endStr.length
      );
      
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        // 防止超大范围导致页面卡死：放宽限制，以时间为主
        const MAX_ITERATIONS = 5000000; // 调高到 500万 次
        const MAX_TIME_MS = 800; // 调高到 800ms，不到 1 秒的卡顿用户可接受，同时能处理极大范围
        const startTime = Date.now();
        let iterations = 0;

        for (let i = start; i <= end; i++) {
          iterations++;
          
          // 每 10000 次检查一次时间，减少 Date.now() 调用开销
          if (iterations % 10000 === 0) {
            if (Date.now() - startTime > MAX_TIME_MS) {
              console.warn(`[ProductList] Range checking stopped due to timeout (${MAX_TIME_MS}ms). iterations: ${iterations}`);
              break;
            }
          }
          
          if (iterations > MAX_ITERATIONS) {
            console.warn(`[ProductList] Range checking stopped due to max iterations (${MAX_ITERATIONS}).`);
            break;
          }

          let expected = i.toString();
          
          if (startStr.length === endStr.length) {
            expected = expected.padStart(startStr.length, '0');
          } else if (hasLeadingZero) {
            expected = expected.padStart(width, '0');
          }
          
          if (!existingCodesSet.has(expected)) {
            missingCodes.push(expected);
          }
        }
      }
    }
    
    // 检查超出范围的编码
    const excessCodes = [];
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
            break;
          }
        }
      }
      
      if (!inAnyRange || !formatOk) {
        excessCodes.push(code);
      } 
    });
    
    return { 
      hasMissing: missingCodes.length > 0,
      missingCodes,
      hasExcess: excessCodes.length > 0,
      excessCodes
    };
  }, [productCodes]);

  const openCodesModal = (product, type, list) => {
    setCodesModalTitle(`${product.name} - ${type === 'missing' ? '缺失编码' : '超出范围编码'}`);
    setCodesModalList(list || []);
    setModalCurrentPage(1);
    setCodesModalVisible(true);
  };

  return (
    <div className="product-list-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>产品管理</Title>
        <Space>
          {batchMode ? (
            <>
              <Button 
                icon={<CloseOutlined />} 
                onClick={toggleBatchMode}
              >
                取消批量
              </Button>
              <Button 
                icon={<FileSearchOutlined />} 
                onClick={handleBatchCheckDuplicate}
                disabled={selectedProducts.length < 2}
                loading={duplicateCheckLoading}
              >
                批量查重
              </Button>
              <Button 
                type="primary" 
                danger
                icon={<DeleteOutlined />} 
                onClick={confirmBatchDeleteProducts}
                disabled={selectedProducts.length === 0}
              >
                删除选中 ({selectedProducts.length})
              </Button>
            </>
          ) : (
            <>
              <Button 
                icon={<CheckOutlined />} 
                onClick={toggleBatchMode}
                disabled={products.length === 0}
              >
                批量选择
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setModalVisible(true)}
              >
                添加产品
              </Button>
            </>
          )}
        </Space>
      </div>
      
      {/* 筛选和排序工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
          {batchMode && (
            <Checkbox
              indeterminate={selectedProducts.length > 0 && selectedProducts.length < products.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
              checked={selectedProducts.length === products.length && products.length > 0}
            >
              全选 ({selectedProducts.length}/{products.length})
            </Checkbox>
          )}
          
          <Input.Search
            ref={searchInputRef}
            placeholder="搜索产品名称、描述或分类..."
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={(value) => handleSearch(value)}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, maxWidth: 400 }}
          />
          
          <Select 
            value={currentFilter}
            style={{ width: 150 }} 
            onChange={handleCategoryFilter}
            placeholder="选择分类"
          >
            <Option value="all">所有分类</Option>
            {categories.map(category => (
              <Option key={category} value={category}>{category}</Option>
            ))}
          </Select>

          <Space>
            <span style={{ color: '#666', fontSize: 14 }}>排序:</span>
            <Button
              size="small"
              icon={sortField === 'createdAt' ? (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />) : null}
              onClick={() => handleSort('createdAt')}
              type={sortField === 'createdAt' ? 'primary' : 'default'}
            >
              创建时间
            </Button>
            <Button
              size="small"
              icon={sortField === 'name' ? (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />) : null}
              onClick={() => handleSort('name')}
              type={sortField === 'name' ? 'primary' : 'default'}
            >
              名称
            </Button>
            {/* 已移除按编码数排序的功能，因为不支持服务端排序 */}
          </Space>
        </div>
      </Card>
      
      {loading ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Col xs={24} sm={12} md={8} lg={6} key={i}>
              <Card>
                <Skeleton active avatar paragraph={{ rows: 4 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : products.length === 0 ? (
        <Card>
          <Empty 
            description={
              searchText || currentFilter !== 'all' 
                ? `没有找到匹配的产品${searchText ? ` "${searchText}"` : ''}${currentFilter !== 'all' ? ` (分类: ${currentFilter})` : ''}`
                : "暂无产品"
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {searchText || currentFilter !== 'all' ? (
              <Button onClick={() => {
                setSearchText('');
                setCurrentFilter('all');
                if (searchInputRef.current) {
                  searchInputRef.current.input.value = '';
                }
                loadProducts(1, pagination.pageSize, '', 'all', sortField, sortOrder);
              }}>
                清除筛选
              </Button>
            ) : (
              <Button type="primary" onClick={() => setModalVisible(true)}>
                添加产品
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {products.map(product => {
              const codes = productCodes[product.id] || [];
              const codeCount = codes.length;
              const codeRangeStatus = checkCodeRangeStatus(product);
              
              return (
                <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                  <ProductCard 
                    product={product}
                    codeCount={codeCount}
                    onDelete={handleDeleteProduct}
                    codeRangeStatus={codeRangeStatus}
                    batchMode={batchMode}
                    selected={selectedProducts.includes(product.id)}
                    onSelect={(checked) => handleProductSelect(product.id, checked)}
                    onViewMissing={(list) => openCodesModal(product, 'missing', list)}
                    onViewExcess={(list) => openCodesModal(product, 'excess', list)}
                    onEdit={handleEditProduct}
                  />
                </Col>
              );
            })}
          </Row>
          
          <div style={{ marginTop: 24, paddingBottom: 24 }}>
            <Pagination
              className="full-width-pagination"
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onChange={handlePageChange}
              showSizeChanger
              showQuickJumper
              showTotal={(total) => `共 ${total} 个产品`}
              pageSizeOptions={['12', '24', '36', '48']}
            />
          </div>
        </>
      )}
      
      {/* 添加产品表单 */}
      <Modal
        title="添加产品"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <ProductForm 
          onFinish={handleAddProduct}
          onCancel={() => setModalVisible(false)}
          categories={categories}
          loading={formLoading}
        />
      </Modal>

      {/* 编辑产品模态框 */}
      <Modal
        title="编辑产品"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingProduct(null);
        }}
        footer={null}
        destroyOnHidden
      >
        <ProductForm 
          initialValues={editingProduct}
          onSubmit={handleUpdateProduct} 
          loading={formLoading} 
          submitText="更新产品"
        />
      </Modal>

      <Modal
        title={codesModalTitle}
        open={codesModalVisible}
        onCancel={() => setCodesModalVisible(false)}
        footer={null}
        width={700}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, maxHeight: '400px', overflowY: 'auto', padding: '4px' }}>
          {codesModalList && codesModalList.length > 0 ? (
            codesModalList.slice((modalCurrentPage - 1) * modalPageSize, modalCurrentPage * modalPageSize).map((c) => (
              <div key={c} style={{ padding: '6px 8px', background: '#fafafa', borderRadius: 4 }}>{c}</div>
            ))
          ) : (
            <div style={{ gridColumn: 'span 4', color: '#999', textAlign: 'center', padding: '20px' }}>暂无数据</div>
          )}
        </div>
        {codesModalList && codesModalList.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Pagination
              current={modalCurrentPage}
              pageSize={modalPageSize}
              total={codesModalList.length}
              onChange={(page) => setModalCurrentPage(page)}
              showSizeChanger={false}
              size="small"
              className="full-width-pagination"
            />
          </div>
        )}
      </Modal>

      {/* 批量查重结果模态框 */}
      <Modal
        title="批量查重结果"
        open={duplicateCheckModalVisible}
        onCancel={() => setDuplicateCheckModalVisible(false)}
        footer={null}
        width={800}
      >
        {duplicateCheckResult && (
          <div>
            <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
              <span style={{ color: '#52c41a' }}>
                共检查了 <strong>{duplicateCheckResult.totalChecked}</strong> 个编码，
                发现 <strong>{duplicateCheckResult.duplicateCount}</strong> 个重复编码
              </span>
            </div>
            
            {duplicateCheckResult.duplicates.length > 0 ? (
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafafa' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', fontWeight: 600 }}>重复编码</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', fontWeight: 600 }}>所在产品</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicateCheckResult.duplicates.map((item, index) => (
                      <tr key={item.code} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 14, color: '#cf1322', fontWeight: 500 }}>
                          {item.code}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {item.products.map((product) => (
                              <span
                                key={product.id}
                                style={{
                                  padding: '4px 8px',
                                  background: '#fff2f0',
                                  border: '1px solid #ffccc7',
                                  borderRadius: 4,
                                  fontSize: 12,
                                  color: '#cf1322'
                                }}
                              >
                                {product.name}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 16, color: '#52c41a', fontWeight: 500 }}>未发现重复编码</div>
                <div style={{ fontSize: 14, color: '#999', marginTop: 8 }}>选中的产品之间没有重复的编码</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductList;