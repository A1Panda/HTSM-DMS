import React, { useState, useEffect } from 'react';
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
  Spin
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { productAPI, codeAPI } from '../services/api';
import ProductCard from '../components/ProductCard';
import ProductForm from '../components/ProductForm';

const { Title } = Typography;
const { Option } = Select;
const { confirm } = Modal;

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

  // 加载产品列表
  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getAllProducts();
      const productsData = response.data;
      
      // 按创建时间降序排序
      productsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setProducts(productsData);
      setFilteredProducts(productsData);
      
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
  };

  // 加载产品编码
  const loadProductCodes = async (productsData) => {
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
  };

  // 初始加载
  useEffect(() => {
    loadProducts();
  }, []);

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

  // 搜索产品
  const handleSearch = (value) => {
    setSearchText(value);
    filterProducts(value, currentFilter);
  };

  // 按分类筛选
  const handleCategoryFilter = (category) => {
    setCurrentFilter(category);
    filterProducts(searchText, category);
  };

  // 筛选产品
  const filterProducts = (search, category) => {
    let filtered = [...products];
    
    // 应用分类筛选
    if (category !== 'all') {
      filtered = filtered.filter(product => product.category === category);
    }
    
    // 应用搜索筛选
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredProducts(filtered);
  };

  // 检查范围内是否有缺失编码
  const checkMissingCodes = (product) => {
    if (!product.codeStart || !product.codeEnd) return { hasMissing: false, missingCodes: [] };
    
    const start = parseInt(product.codeStart);
    const end = parseInt(product.codeEnd);
    if (isNaN(start) || isNaN(end)) return { hasMissing: false, missingCodes: [] };
    
    const codes = productCodes[product.id] || [];
    const existingCodes = new Set(codes.map(code => code.code));
    
    const missingCodes = [];
    for (let i = start; i <= end; i++) {
      if (!existingCodes.has(i.toString())) {
        missingCodes.push(i);
      }
    }
    
    return { 
      hasMissing: missingCodes.length > 0,
      missingCodes
    };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>产品管理</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => setModalVisible(true)}
        >
          添加产品
        </Button>
      </div>
      
      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索产品..."
          allowClear
          enterButton={<SearchOutlined />}
          onSearch={handleSearch}
          style={{ width: 300, marginRight: 16 }}
        />
        
        <Select 
          defaultValue="all" 
          style={{ width: 200 }} 
          onChange={handleCategoryFilter}
        >
          <Option value="all">所有分类</Option>
          {categories.map(category => (
            <Option key={category} value={category}>{category}</Option>
          ))}
        </Select>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <p>加载产品列表...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <Empty 
            description="暂无产品" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => setModalVisible(true)}>
              添加产品
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredProducts.map(product => {
            const codes = productCodes[product.id] || [];
            const codeCount = codes.length;
            const missingCodesInfo = checkMissingCodes(product);
            
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                <ProductCard 
                  product={product}
                  codeCount={codeCount}
                  onDelete={confirmDeleteProduct}
                  missingCodes={missingCodesInfo}
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
    </div>
  );
};

export default ProductList;