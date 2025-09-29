import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Input, 
  Spin, 
  Modal, 
  message, 
  Typography, 
  Descriptions, 
  Progress, 
  Space,
  Tooltip,
  Empty,
  Tag,
  Divider
} from 'antd';
import { 
  ArrowLeftOutlined, 
  PlusOutlined, 
  SearchOutlined, 
  DownloadOutlined,
  QrcodeOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { productAPI, codeAPI } from '../services/api';
import CodeList from '../components/CodeList';
import CodeForm from '../components/CodeForm';
import ScannerModal from '../components/ScannerModal';
import QuickCodeInput from '../components/QuickCodeInput';
import ExportUtils from '../utils/exportUtils';

const { Title } = Typography;
const { confirm } = Modal;
const { Search } = Input;

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [codes, setCodes] = useState([]);
  const [filteredCodes, setFilteredCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [quickInputLoading, setQuickInputLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // 加载产品详情
  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getProductById(id);
      setProduct(response.data);
    } catch (error) {
      console.error('获取产品详情失败:', error);
      message.error('获取产品详情失败');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  // 加载产品编码
  const loadCodes = async () => {
    try {
      const response = await codeAPI.getProductCodes(id);
      const codesData = response.data;
      
      // 按创建时间降序排序
      codesData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setCodes(codesData);
      setFilteredCodes(codesData);
    } catch (error) {
      console.error('获取编码列表失败:', error);
      message.error('获取编码列表失败');
    }
  };

  // 初始加载
  useEffect(() => {
    loadProduct();
    loadCodes();
  }, [id]);

  // 添加编码
  const handleAddCode = async (values) => {
    try {
      setFormLoading(true);
      await codeAPI.addCode(id, values);
      message.success('编码添加成功');
      setAddModalVisible(false);
      loadCodes();
    } catch (error) {
      console.error('添加编码失败:', error);
      message.error('添加编码失败: ' + (error.response?.data?.error || '未知错误'));
    } finally {
      setFormLoading(false);
    }
  };

  // 快速添加编码
  const handleQuickAddCode = async (values) => {
    try {
      setQuickInputLoading(true);
      await codeAPI.addCode(id, values);
      message.success('编码添加成功');
      loadCodes();
    } catch (error) {
      console.error('添加编码失败:', error);
      message.error('添加编码失败: ' + (error.response?.data?.error || '未知错误'));
    } finally {
      setQuickInputLoading(false);
    }
  };

  // 处理重复编码
  const handleDuplicateCode = (duplicateCode) => {
    message.error(`编码 "${duplicateCode}" 已存在，请使用不同的编码！`);
    // 可以在这里添加声音提示或其他操作
  };

  // 删除编码
  const confirmDeleteCode = (codeId) => {
    confirm({
      title: '确定要删除这个编码吗？',
      icon: <ExclamationCircleOutlined />,
      content: '此操作不可恢复。',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await codeAPI.deleteCode(id, codeId);
          message.success('编码删除成功');
          loadCodes();
        } catch (error) {
          console.error('删除编码失败:', error);
          message.error('删除编码失败');
        }
      }
    });
  };

  // 搜索编码
  const handleSearch = (value) => {
    setSearchText(value);
    
    if (!value) {
      setFilteredCodes(codes);
      return;
    }
    
    const searchLower = value.toLowerCase();
    const filtered = codes.filter(code => 
      code.code.toLowerCase().includes(searchLower) ||
      code.description.toLowerCase().includes(searchLower)
    );
    
    setFilteredCodes(filtered);
  };

  // 导出编码
  const handleExportCodes = () => {
    if (codes.length === 0) {
      message.warning('没有可导出的编码');
      return;
    }
    
    const success = ExportUtils.exportCodes(codes, product.name);
    if (success) {
      message.success('编码导出成功');
    } else {
      message.error('编码导出失败');
    }
  };

  // 处理扫码结果
  const handleScanResult = (result) => {
    setAddModalVisible(true);
    setTimeout(() => {
      // 使用扫描结果填充表单
      const initialValues = { code: result };
      handleAddCode(initialValues);
    }, 100);
  };

  // 检查范围内是否有缺失编码
  const checkMissingCodes = () => {
    if (!product || !product.codeStart || !product.codeEnd) return { hasMissing: false, missingCodes: [] };
    
    const start = parseInt(product.codeStart);
    const end = parseInt(product.codeEnd);
    if (isNaN(start) || isNaN(end)) return { hasMissing: false, missingCodes: [] };
    
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>加载产品详情...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Empty description="产品不存在" />
        <Button type="primary" onClick={() => navigate('/products')}>
          返回产品列表
        </Button>
      </div>
    );
  }

  const { hasMissing, missingCodes } = checkMissingCodes();
  const codeCount = codes.length;
  const requiredQuantity = product.requiredQuantity || 0;
  const completionRate = requiredQuantity > 0 
    ? Math.min(100, Math.round((codeCount / requiredQuantity) * 100)) 
    : 100;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/products')}
        >
          返回产品列表
        </Button>
      </div>
      
      <Card style={{ marginBottom: 16 }}>
        <Title level={2}>{product.name}</Title>
        
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="产品描述">{product.description || '暂无描述'}</Descriptions.Item>
          <Descriptions.Item label="产品分类">{product.category || '未分类'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{new Date(product.createdAt).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="需求数量">{requiredQuantity}</Descriptions.Item>
          <Descriptions.Item label="已录入编码">{codeCount}</Descriptions.Item>
          <Descriptions.Item label="完成率">
            <Progress 
              percent={completionRate} 
              size="small" 
              status={completionRate < 100 ? "active" : "success"}
            />
          </Descriptions.Item>
          {product.codeStart && product.codeEnd && (
            <Descriptions.Item label="编码范围" span={3}>
              {product.codeStart} - {product.codeEnd}
              {hasMissing && (
                <Tooltip 
                  title={
                    <div>
                      缺失编码: 
                      {missingCodes.length > 20 
                        ? `${missingCodes.slice(0, 20).join(', ')}... 等${missingCodes.length}个` 
                        : missingCodes.join(', ')
                      }
                    </div>
                  }
                >
                  <Tag color="red" style={{ marginLeft: 8 }}>
                    有 {missingCodes.length} 个缺失编码
                  </Tag>
                </Tooltip>
              )}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
      
      <Card
        title="编码管理"
        extra={
          <Space>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={handleExportCodes}
              disabled={codes.length === 0}
            >
              导出编码
            </Button>
            <Button 
              icon={<QrcodeOutlined />} 
              onClick={() => setScanModalVisible(true)}
            >
              扫码添加
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setAddModalVisible(true)}
            >
              添加编码
            </Button>
          </Space>
        }
      >
        {/* 快速编码输入区域 */}
        <QuickCodeInput 
          onSubmit={handleQuickAddCode}
          loading={quickInputLoading}
          existingCodes={codes}
          onDuplicate={handleDuplicateCode}
        />
        <Divider style={{ margin: '0 0 16px 0' }} />
        
        <div style={{ marginBottom: 16 }}>
          <Search
            placeholder="搜索编码..."
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
        </div>
        
        <CodeList 
          codes={filteredCodes}
          onDelete={confirmDeleteCode}
        />
      </Card>
      
      {/* 添加编码表单 */}
      <Modal
        title="添加编码"
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        footer={null}
      >
        <CodeForm 
          onFinish={handleAddCode}
          onCancel={() => setAddModalVisible(false)}
          loading={formLoading}
        />
      </Modal>
      
      {/* 扫码对话框 */}
      <ScannerModal 
        visible={scanModalVisible}
        onCancel={() => setScanModalVisible(false)}
        onScan={handleScanResult}
      />
    </div>
  );
};

export default ProductDetail;