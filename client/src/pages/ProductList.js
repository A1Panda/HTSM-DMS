import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Spin,
  Checkbox,
  Space,
  Statistic,
  Skeleton
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  ExclamationCircleOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  AppstoreOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined
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
  const [filteredProducts, setFilteredProducts] = useState([]);
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
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [sortField, setSortField] = useState('createdAt'); // 'createdAt' | 'name' | 'codeCount'
  const searchInputRef = useRef(null);

  // 加载产品编码
  const loadProductCodes = useCallback(async (productsData) => {
    try {
      const codesPromises = productsData.map(product => 
        codeAPI.getProductCodes(product.id)
          .then(response => ({
            productId: product.id,
            codes: response.data
          }))
          .catch(() => ({
            productId: product.id,
            codes: []
          }))
      );
      
      const codesResults = await Promise.all(codesPromises);
      const codesMap = {};
      
      codesResults.forEach(result => {
        codesMap[result.productId] = result.codes;
      });
      
      setProductCodes(codesMap);
    } catch (error) {
      console.error('加载产品编码失败:', error);
    }
  }, []);

  // 加载产品列表
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productAPI.getAllProducts();
      const productsData = response.data;
      
      setProducts(productsData);
      
      // 提取所有唯一的分类
      const uniqueCategories = [...new Set(productsData
        .map(product => product.category)
        .filter(category => category && category.trim() !== '')
      )];
      setCategories(uniqueCategories);
      
      // 加载每个产品的编码数量
      loadProductCodes(productsData);
    } catch (error) {
      console.error('加载产品列表失败:', error);
      message.error('加载产品列表失败');
    } finally {
      setLoading(false);
    }
  }, [loadProductCodes]);

  // 初始加载
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // 添加产品
  const handleAddProduct = async (values) => {
    try {
      setFormLoading(true);
      await productAPI.createProduct(values);
      message.success(`产品 "${values.name}" 添加成功`);
      setModalVisible(false);
      loadProducts();
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
      loadProducts();
    } catch (error) {
      console.error('更新产品失败:', error);
      message.error('更新产品失败: ' + (error.response?.data?.error || '未知错误'));
    } finally {
      setFormLoading(false);
    }
  };

  // 删除产品
  const confirmDeleteProduct = (id, name) => {
    confirm({
      title: '确定要删除这个产品吗？',
      icon: <ExclamationCircleOutlined />,
      content: '这将同时删除该产品的所有编码，此操作不可恢复。',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await productAPI.deleteProduct(id);
          message.success('产品删除成功');
          loadProducts();
        } catch (error) {
          console.error('删除产品失败:', error);
          message.error('删除产品失败');
        }
      }
    });
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

  // 筛选和排序产品（使用useMemo优化）- 需要在使用它的函数之前定义
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];
    
    // 应用分类筛选
    if (currentFilter !== 'all') {
      filtered = filtered.filter(product => product.category === currentFilter);
    }
    
    // 应用搜索筛选
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.category?.toLowerCase().includes(searchLower)
      );
    }
    
    // 应用排序
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'codeCount':
          aValue = (productCodes[a.id] || []).length;
          bValue = (productCodes[b.id] || []).length;
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
      }
      
      if (sortField === 'name') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' 
          ? (aValue > bValue ? 1 : -1)
          : (aValue < bValue ? 1 : -1);
      }
    });
    
    return filtered;
  }, [products, currentFilter, searchText, sortOrder, sortField, productCodes]);

  // 处理产品选择
  const handleProductSelect = useCallback((productId, checked) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  }, []);

  // 全选/取消全选
  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedProducts(filteredAndSortedProducts.map(product => product.id));
    } else {
      setSelectedProducts([]);
    }
  }, [filteredAndSortedProducts]);

  // 切换批量模式
  const toggleBatchMode = useCallback(() => {
    setBatchMode(!batchMode);
    setSelectedProducts([]);
  }, [batchMode]);

  // 搜索产品（防抖）
  const debouncedSearch = useRef(
    debounce((value) => {
      setSearchText(value);
    }, 300)
  ).current;

  const handleSearch = useCallback((value) => {
    debouncedSearch(value);
  }, [debouncedSearch]);

  // 按分类筛选
  const handleCategoryFilter = useCallback((category) => {
    setCurrentFilter(category);
  }, []);

  // 切换排序
  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  }, [sortField, sortOrder]);

  // 检查范围内缺失编码和超出范围的编码（使用useCallback优化）
  const checkCodeRangeStatus = useCallback((product) => {
    if (!product.codeStart || !product.codeEnd) {
      return { 
        hasMissing: false, 
        missingCodes: [], 
        hasExcess: false, 
        excessCodes: [] 
      };
    }
    
    const start = parseInt(product.codeStart);
    const end = parseInt(product.codeEnd);
    if (isNaN(start) || isNaN(end)) {
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
    const width = Math.max(
      String(product.codeStart).trim().length, 
      String(product.codeEnd).trim().length
    );
    
    // 检查缺失的编码
    const missingCodes = [];
    for (let i = start; i <= end; i++) {
      const expected = i.toString().padStart(width, '0');
      if (!existingCodesSet.has(expected)) {
        missingCodes.push(expected);
      }
    }
    
    // 检查超出范围的编码
    const excessCodes = [];
    existingCodes.forEach(code => {
      const str = String(code).trim();
      const codeNum = parseInt(str);
      const inRange = !isNaN(codeNum) && codeNum >= start && codeNum <= end;
      const formatOk = str.length === width;
      if (!inRange || !formatOk) {
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
    setCodesModalVisible(true);
  };

  // 统计信息
  const stats = useMemo(() => {
    const totalCodes = Object.values(productCodes).reduce((sum, codes) => sum + codes.length, 0);
    const totalRequired = filteredAndSortedProducts.reduce((sum, p) => sum + (p.requiredQuantity || 0), 0);
    const totalEntered = filteredAndSortedProducts.reduce((sum, p) => {
      const codes = productCodes[p.id] || [];
      return sum + codes.length;
    }, 0);
    
    return {
      total: products.length,
      filtered: filteredAndSortedProducts.length,
      totalCodes,
      totalRequired,
      totalEntered,
      avgCompletion: filteredAndSortedProducts.length > 0 
        ? Math.round((totalEntered / totalRequired) * 100) || 0
        : 0
    };
  }, [products, filteredAndSortedProducts, productCodes]);

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
                disabled={filteredAndSortedProducts.length === 0}
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

      {/* 统计信息卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总产品数"
              value={stats.total}
              prefix={<AppstoreOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="当前显示"
              value={stats.filtered}
              suffix={`/ ${stats.total}`}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总编码数"
              value={stats.totalCodes}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均完成度"
              value={stats.avgCompletion}
              suffix="%"
              valueStyle={{ color: stats.avgCompletion >= 80 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
      </Row>
      
      {/* 筛选和排序工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
          {batchMode && (
            <Checkbox
              indeterminate={selectedProducts.length > 0 && selectedProducts.length < filteredAndSortedProducts.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
              checked={selectedProducts.length === filteredAndSortedProducts.length && filteredAndSortedProducts.length > 0}
            >
              全选 ({selectedProducts.length}/{filteredAndSortedProducts.length})
            </Checkbox>
          )}
          
          <Input.Search
            ref={searchInputRef}
            placeholder="搜索产品名称、描述或分类..."
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={handleSearch}
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
            <Button
              size="small"
              icon={sortField === 'codeCount' ? (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />) : null}
              onClick={() => handleSort('codeCount')}
              type={sortField === 'codeCount' ? 'primary' : 'default'}
            >
              编码数
            </Button>
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
      ) : filteredAndSortedProducts.length === 0 ? (
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
        <Row gutter={[16, 16]}>
          {filteredAndSortedProducts.map(product => {
            const codes = productCodes[product.id] || [];
            const codeCount = codes.length;
            const codeRangeStatus = checkCodeRangeStatus(product);
            
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                <ProductCard 
                  product={product}
                  codeCount={codeCount}
                  onDelete={confirmDeleteProduct}
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
        destroyOnClose
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {codesModalList && codesModalList.length > 0 ? (
            codesModalList.map((c) => (
              <div key={c} style={{ padding: '6px 8px', background: '#fafafa', borderRadius: 4 }}>{c}</div>
            ))
          ) : (
            <div style={{ gridColumn: 'span 4', color: '#999' }}>暂无数据</div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ProductList;
