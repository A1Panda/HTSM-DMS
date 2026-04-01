import React, { useState, useEffect } from 'react';
import { 
  Form, Row, Col, Input, Select, DatePicker, Button, 
  Card, Space, Typography, List, message, Tag, Modal, Checkbox
} from 'antd';
import { 
  SearchOutlined, SaveOutlined, HistoryOutlined, 
  DeleteOutlined, StarOutlined, ClearOutlined,
  CheckOutlined, CloseOutlined, ExclamationCircleOutlined, ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { productAPI, codeAPI } from '../services/api';
import CodeList from '../components/CodeList';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const AdvancedSearch = () => {
  const [form] = Form.useForm();
  const [products, setProducts] = useState([]);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [saveName, setSaveName] = useState('');
  
  const [currentSearchValues, setCurrentSearchValues] = useState(null);

  // 批量操作状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState([]);
  const { confirm } = Modal;

  useEffect(() => {
    loadProducts();
    loadHistory();
    loadSavedSearches();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await productAPI.getAllProducts({ limit: 1000 });
      setProducts(res.data.products || res.data || []);
    } catch (error) {
      console.error('加载产品失败', error);
    }
  };

  const loadHistory = () => {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setSearchHistory(history);
  };

  const loadSavedSearches = () => {
    const saved = JSON.parse(localStorage.getItem('savedSearches') || '[]');
    setSavedSearches(saved);
  };

  const saveToHistory = (values) => {
    const serializedValues = { ...values };
    if (serializedValues.dateRange && serializedValues.dateRange.length === 2) {
      serializedValues.dateRange = [
        dayjs(serializedValues.dateRange[0]).format('YYYY-MM-DD HH:mm:ss'),
        dayjs(serializedValues.dateRange[1]).format('YYYY-MM-DD HH:mm:ss')
      ];
    }
    
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    // Filter out identical searches
    const filteredHistory = history.filter(h => JSON.stringify(h) !== JSON.stringify(serializedValues));
    const newHistory = [serializedValues, ...filteredHistory].slice(0, 10);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    setSearchHistory(newHistory);
  };

  const handleSearch = async (values) => {
    setLoading(true);
    setCurrentSearchValues(values);
    try {
      const { productId, ...otherValues } = values;
      const { codeStart, codeEnd, dateRange, keyword, includeDeleted } = otherValues;
      const filters = {};
      if (codeStart) filters.codeStart = codeStart;
      if (codeEnd) filters.codeEnd = codeEnd;
      if (dateRange && dateRange.length === 2) {
        filters.startDate = dayjs(dateRange[0]).toISOString();
        filters.endDate = dayjs(dateRange[1]).toISOString();
      }
      if (keyword) filters.keyword = keyword;
      if (includeDeleted) filters.includeDeleted = true;

      // 允许获取更多的数据以应对批量操作需求
      const res = await codeAPI.getAllCodes(1, 10000, productId, filters);
      
      setCodes(res.data.codes || res.data || []);
      setSelectedCodes([]); // clear selection on new search

      saveToHistory(values);
    } catch (error) {
      message.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = (values) => {
    handleSearch(values);
  };

  const toggleBatchMode = () => {
    setBatchMode(!batchMode);
    setSelectedCodes([]);
  };

  const handleCodeSelect = (codeId, checked) => {
    if (checked) {
      setSelectedCodes(prev => [...prev, codeId]);
    } else {
      setSelectedCodes(prev => prev.filter(id => id !== codeId));
    }
  };

  const handleSelectAllCodes = (checked) => {
    if (checked) {
      setSelectedCodes(codes.map(code => code.id));
    } else {
      setSelectedCodes([]);
    }
  };

  const confirmBatchDeleteCodes = () => {
    if (selectedCodes.length === 0) {
      message.warning('请先选择要删除的编码');
      return;
    }
    
    const codesToDelete = codes.filter(c => selectedCodes.includes(c.id) && !c.deleted);
    if (codesToDelete.length === 0) {
      message.warning('选中的编码中没有可删除的项（可能已被删除）');
      return;
    }
    
    confirm({
      title: `确定要删除这 ${codesToDelete.length} 个编码吗？`,
      icon: <ExclamationCircleOutlined />,
      content: '删除后可从回收站恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const BATCH_SIZE = 50;
          for (let i = 0; i < codesToDelete.length; i += BATCH_SIZE) {
            const batch = codesToDelete.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(code => codeAPI.deleteCode(code.productId, code.id)));
          }
          message.success(`已将 ${codesToDelete.length} 个编码移入回收站`);
          setSelectedCodes([]);
          setBatchMode(false);
          if (currentSearchValues) {
            handleSearch(currentSearchValues);
          }
        } catch (error) {
          console.error('批量删除编码失败:', error);
          message.error('批量删除编码失败');
        }
      }
    });
  };

  const handleBatchRestoreCodes = async () => {
    if (selectedCodes.length === 0) {
      message.warning('请先选择要恢复的编码');
      return;
    }
    
    const codesToRestore = codes.filter(c => selectedCodes.includes(c.id) && c.deleted);
    if (codesToRestore.length === 0) {
      message.warning('选中的编码中没有可恢复的项（可能未被删除）');
      return;
    }
    
    try {
      const BATCH_SIZE = 50;
      for (let i = 0; i < codesToRestore.length; i += BATCH_SIZE) {
        const batch = codesToRestore.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(code => codeAPI.restoreCode(code.productId, code.id)));
      }
      message.success(`已恢复 ${codesToRestore.length} 个编码`);
      setSelectedCodes([]);
      setBatchMode(false);
      if (currentSearchValues) {
        handleSearch(currentSearchValues);
      }
    } catch (error) {
      console.error('批量恢复编码失败:', error);
      message.error('批量恢复编码失败');
    }
  };

  const handleDeleteCode = async (codeId) => {
    try {
      const code = codes.find(c => c.id === codeId);
      if (!code) return;
      await codeAPI.deleteCode(code.productId, codeId);
      message.success('编码已移至回收站');
      if (currentSearchValues) {
        handleSearch(currentSearchValues);
      }
    } catch (error) {
      message.error('删除编码失败');
    }
  };

  const handleRestoreCode = async (codeId) => {
    try {
      const code = codes.find(c => c.id === codeId);
      if (!code) return;
      await codeAPI.restoreCode(code.productId, codeId);
      message.success('编码已恢复');
      if (currentSearchValues) {
        handleSearch(currentSearchValues);
      }
    } catch (error) {
      message.error('恢复编码失败');
    }
  };

  const applySearchCriteria = (criteria) => {
    const formValues = { ...criteria };
    if (formValues.dateRange && formValues.dateRange.length === 2) {
      formValues.dateRange = [
        dayjs(formValues.dateRange[0]),
        dayjs(formValues.dateRange[1])
      ];
    }
    form.setFieldsValue(formValues);
    handleSearch(formValues);
  };

  const handleSaveSearch = () => {
    if (!saveName.trim()) {
      message.warning('请输入保存名称');
      return;
    }
    const values = form.getFieldsValue();
    const serializedValues = { ...values };
    if (serializedValues.dateRange && serializedValues.dateRange.length === 2) {
      serializedValues.dateRange = [
        dayjs(serializedValues.dateRange[0]).format('YYYY-MM-DD HH:mm:ss'),
        dayjs(serializedValues.dateRange[1]).format('YYYY-MM-DD HH:mm:ss')
      ];
    }
    
    const newSaved = [...savedSearches, { name: saveName, criteria: serializedValues }];
    localStorage.setItem('savedSearches', JSON.stringify(newSaved));
    setSavedSearches(newSaved);
    setIsSaveModalVisible(false);
    setSaveName('');
    message.success('搜索条件已保存');
  };

  const removeSavedSearch = (index) => {
    const newSaved = [...savedSearches];
    newSaved.splice(index, 1);
    localStorage.setItem('savedSearches', JSON.stringify(newSaved));
    setSavedSearches(newSaved);
  };

  const clearHistory = () => {
    localStorage.removeItem('searchHistory');
    setSearchHistory([]);
  };

  const renderCriteriaTags = (criteria) => {
    const tags = [];
    if (criteria.productId) {
      const p = products.find(p => p.id === criteria.productId);
      tags.push(<Tag color="blue" key="product">{p ? p.name : '产品ID'}</Tag>);
    }
    if (criteria.codeStart || criteria.codeEnd) {
      tags.push(<Tag color="cyan" key="code">编码: {criteria.codeStart || '*'} ~ {criteria.codeEnd || '*'}</Tag>);
    }
    if (criteria.dateRange && criteria.dateRange.length === 2) {
      tags.push(<Tag color="geekblue" key="date">日期: {criteria.dateRange[0]} ~ {criteria.dateRange[1]}</Tag>);
    }
    if (criteria.keyword) {
      tags.push(<Tag color="purple" key="keyword">关键字: {criteria.keyword}</Tag>);
    }
    if (criteria.includeDeleted) {
      tags.push(<Tag color="red" key="deleted">包含已删除</Tag>);
    }
    if (tags.length === 0) {
      return <Tag>全部</Tag>;
    }
    return tags;
  };

  return (
    <div style={{ padding: '24px 0' }}>
      <Title level={2}>高级搜索</Title>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={17} xl={18}>
          <Card bordered={false} style={{ marginBottom: 24 }}>
            <Form 
              form={form} 
              layout="vertical" 
              onFinish={onFinish}
            >
              <Row gutter={16}>
                <Col xs={24} sm={24} md={12} lg={6}>
                  <Form.Item name="productId" label="所属产品">
                    <Select placeholder="请选择产品" allowClear showSearch optionFilterProp="children">
                      {products.map(p => (
                        <Option key={p.id} value={p.id}>{p.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={24} md={12} lg={6}>
                  <Form.Item label="编码范围" style={{ marginBottom: 0 }}>
                    <Space.Compact style={{ width: '100%' }}>
                      <Form.Item name="codeStart" style={{ width: '45%' }}>
                        <Input placeholder="起始编码" />
                      </Form.Item>
                      <div style={{ width: '10%', textAlign: 'center', lineHeight: '32px' }}>~</div>
                      <Form.Item name="codeEnd" style={{ width: '45%' }}>
                        <Input placeholder="结束编码" />
                      </Form.Item>
                    </Space.Compact>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={24} md={12} lg={8}>
                  <Form.Item name="dateRange" label="时间范围">
                    <RangePicker showTime style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={24} md={12} lg={4}>
                  <Form.Item name="keyword" label="关键字搜索">
                    <Input placeholder="输入编码或描述" allowClear />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Form.Item name="includeDeleted" valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Checkbox>包含已删除</Checkbox>
                  </Form.Item>
                  <Space>
                    <Button onClick={() => form.resetFields()}>重置</Button>
                    <Button onClick={() => setIsSaveModalVisible(true)} icon={<SaveOutlined />}>
                      保存条件
                    </Button>
                    <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
                      搜索
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Form>
          </Card>

          <Card 
            title="搜索结果" 
            bordered={false}
            extra={
              codes.length > 0 && (
                <Space>
                  {batchMode ? (
                    <>
                      <Checkbox
                        indeterminate={selectedCodes.length > 0 && selectedCodes.length < codes.length}
                        onChange={(e) => handleSelectAllCodes(e.target.checked)}
                        checked={selectedCodes.length === codes.length && codes.length > 0}
                      >
                        全选
                      </Checkbox>
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
                        onClick={confirmBatchDeleteCodes}
                        disabled={selectedCodes.length === 0}
                      >
                        删除选中
                      </Button>
                      <Button 
                        type="primary" 
                        icon={<ReloadOutlined />} 
                        onClick={handleBatchRestoreCodes}
                        disabled={selectedCodes.length === 0}
                      >
                        恢复选中
                      </Button>
                    </>
                  ) : (
                    <Button 
                      icon={<CheckOutlined />} 
                      onClick={toggleBatchMode}
                    >
                      批量操作
                    </Button>
                  )}
                </Space>
              )
            }
          >
            <CodeList 
              codes={codes} 
              onDelete={handleDeleteCode} 
              onRestore={handleRestoreCode}
              loading={loading}
              batchMode={batchMode}
              selectedCodes={selectedCodes}
              onSelect={handleCodeSelect}
            />
          </Card>
        </Col>

        <Col xs={24} lg={7} xl={6}>
          <Card 
            title={<Space><StarOutlined /> 已保存的搜索</Space>} 
            bordered={false} 
            style={{ marginBottom: 24 }}
          >
            {savedSearches.length === 0 ? (
              <Typography.Text type="secondary">暂无已保存的搜索条件</Typography.Text>
            ) : (
              <List
                size="small"
                dataSource={savedSearches}
                renderItem={(item, index) => (
                  <List.Item
                    actions={[
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeSavedSearch(index)} />
                    ]}
                  >
                    <div style={{ cursor: 'pointer', width: '100%' }} onClick={() => applySearchCriteria(item.criteria)}>
                      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{item.name}</div>
                      <div>{renderCriteriaTags(item.criteria)}</div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Card 
            title={<Space><HistoryOutlined /> 搜索历史</Space>} 
            bordered={false}
            extra={<Button type="link" size="small" onClick={clearHistory} icon={<ClearOutlined />}>清空</Button>}
          >
            {searchHistory.length === 0 ? (
              <Typography.Text type="secondary">暂无搜索历史</Typography.Text>
            ) : (
              <List
                size="small"
                dataSource={searchHistory}
                renderItem={(item, index) => (
                  <List.Item style={{ cursor: 'pointer' }} onClick={() => applySearchCriteria(item)}>
                    <div style={{ width: '100%' }}>{renderCriteriaTags(item)}</div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="保存搜索条件"
        open={isSaveModalVisible}
        onOk={handleSaveSearch}
        onCancel={() => setIsSaveModalVisible(false)}
        destroyOnClose
      >
        <Input 
          placeholder="请输入一个容易记住的名称" 
          value={saveName} 
          onChange={e => setSaveName(e.target.value)} 
          onPressEnter={handleSaveSearch}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default AdvancedSearch;
