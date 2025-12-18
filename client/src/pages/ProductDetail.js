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
  Divider,
  Checkbox
} from 'antd';
import { 
  ArrowLeftOutlined, 
  PlusOutlined, 
  SearchOutlined, 
  DownloadOutlined,
  QrcodeOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined
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
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [codeBatchMode, setCodeBatchMode] = useState(false);
  const [codesModalVisible, setCodesModalVisible] = useState(false);
  const [codesModalTitle, setCodesModalTitle] = useState('');
  const [codesModalList, setCodesModalList] = useState([]);

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

  // 批量删除编码
  const confirmBatchDeleteCodes = () => {
    if (selectedCodes.length === 0) {
      message.warning('请先选择要删除的编码');
      return;
    }
    
    confirm({
      title: `确定要删除这 ${selectedCodes.length} 个编码吗？`,
      icon: <ExclamationCircleOutlined />,
      content: '此操作不可恢复。',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 批量删除
          await Promise.all(selectedCodes.map(codeId => codeAPI.deleteCode(id, codeId)));
          message.success(`成功删除 ${selectedCodes.length} 个编码`);
          setSelectedCodes([]);
          setCodeBatchMode(false);
          loadCodes();
        } catch (error) {
          console.error('批量删除编码失败:', error);
          message.error('批量删除编码失败');
        }
      }
    });
  };

  // 处理编码选择
  const handleCodeSelect = (codeId, checked) => {
    if (checked) {
      setSelectedCodes(prev => [...prev, codeId]);
    } else {
      setSelectedCodes(prev => prev.filter(id => id !== codeId));
    }
  };

  // 全选/取消全选编码
  const handleSelectAllCodes = (checked) => {
    if (checked) {
      setSelectedCodes(filteredCodes.map(code => code.id));
    } else {
      setSelectedCodes([]);
    }
  };

  // 切换编码批量模式
  const toggleCodeBatchMode = () => {
    setCodeBatchMode(!codeBatchMode);
    setSelectedCodes([]);
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

  const lastErrorRef = React.useRef({ code: '', time: 0 });

  // 处理扫码结果
  const handleScanResult = (result) => {
    // 1. 检查本地已存在的编码（预检查）
    const isDuplicate = codes.some(c => c.code === result);
    if (isDuplicate) {
      const now = Date.now();
      // 如果同一个重复编码在 2 秒内再次被扫到，则忽略，不弹窗提示
      if (lastErrorRef.current.code === result && now - lastErrorRef.current.time < 2000) {
        return;
      }
      
      // 更新最后一次错误记录
      lastErrorRef.current = { code: result, time: now };
      message.error(`编码 "${result}" 已存在！`);
      // 可以在这里播放错误提示音
      return;
    }

    const initialValues = { code: result };
    handleAddCode(initialValues);
  };

  // 检查范围内缺失编码和超出范围的编码
  const checkCodeRangeStatus = () => {
    if (!product || !product.codeStart || !product.codeEnd) {
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

  const { hasMissing, missingCodes, hasExcess, excessCodes } = checkCodeRangeStatus();
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
                  <Tag color="red" style={{ marginLeft: 8, cursor: 'pointer' }} onClick={() => { setCodesModalTitle(`${product.name} - 缺失编码`); setCodesModalList(missingCodes); setCodesModalVisible(true); }}>
                    缺失 {missingCodes.length} 个编码
                  </Tag>
                </Tooltip>
              )}
              {hasExcess && (
                <Tooltip 
                  title={
                    <div>
                      超出范围编码: 
                      {excessCodes.length > 20 
                        ? `${excessCodes.slice(0, 20).join(', ')}... 等${excessCodes.length}个` 
                        : excessCodes.join(', ')
                      }
                    </div>
                  }
                >
                  <Tag color="orange" style={{ marginLeft: 8, cursor: 'pointer' }} onClick={() => { setCodesModalTitle(`${product.name} - 超出范围编码`); setCodesModalList(excessCodes); setCodesModalVisible(true); }}>
                    超出 {excessCodes.length} 个编码
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
            {codeBatchMode ? (
              <>
                <Button 
                  icon={<CloseOutlined />} 
                  onClick={toggleCodeBatchMode}
                >
                  取消批量
                </Button>
                <Button 
                  type="primary" 
                  danger
                  icon={<DeleteOutlined />} 
                  onClick={confirmBatchDeleteCodes}
                  disabled={selectedCodes.length === 0}
                >
                  删除选中 ({selectedCodes.length})
                </Button>
              </>
            ) : (
              <>
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={handleExportCodes}
                  disabled={codes.length === 0}
                >
                  导出编码
                </Button>
                <Button 
                  icon={<CheckOutlined />} 
                  onClick={toggleCodeBatchMode}
                  disabled={filteredCodes.length === 0}
                >
                  批量选择
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
              </>
            )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {codeBatchMode && (
              <Checkbox
                indeterminate={selectedCodes.length > 0 && selectedCodes.length < filteredCodes.length}
                onChange={(e) => handleSelectAllCodes(e.target.checked)}
                checked={selectedCodes.length === filteredCodes.length && filteredCodes.length > 0}
              >
                全选 ({selectedCodes.length}/{filteredCodes.length})
              </Checkbox>
            )}
            
            <Search
              placeholder="搜索编码..."
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              style={{ width: 300 }}
            />
          </div>
        </div>
        
        <CodeList 
          codes={filteredCodes}
          onDelete={confirmDeleteCode}
          batchMode={codeBatchMode}
          selectedCodes={selectedCodes}
          onSelect={handleCodeSelect}
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
      
      {/* 扫码对话框 */}
      <ScannerModal 
        visible={scanModalVisible}
        onCancel={() => setScanModalVisible(false)}
        onScan={handleScanResult}
        continuous
      />
    </div>
  );
};

export default ProductDetail;
