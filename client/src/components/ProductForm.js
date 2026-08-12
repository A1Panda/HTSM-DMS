import React, { useEffect, useRef, useState } from 'react';
import { Form, Input, InputNumber, Button, AutoComplete, Select, Row, Col, Modal, Spin, ConfigProvider } from 'antd';
import { MinusCircleOutlined, PlusOutlined, EditOutlined, NumberOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import { kgdAPI } from '../services/api';

const { TextArea } = Input;

/**
 * 产品表单组件
 * @param {Object} props 组件属性
 * @param {Function} props.onFinish 表单提交回调
 * @param {Function} props.onCancel 取消回调
 * @param {Array} props.categories 可选分类列表
 * @param {Object} props.initialValues 初始值
 * @param {boolean} props.loading 是否加载中
 */
const ProductForm = ({ onFinish, onSubmit, onCancel, categories = [], initialValues = {}, loading = false, submitText = '提交' }) => {
  const [form] = Form.useForm();

  // 创建模式下产品名称默认从快工单商品列表选择；手动输入需额外操作（确认弹窗）
  const isEdit = !!(initialValues && initialValues.id);
  const [manualName, setManualName] = useState(false); // 是否手动输入产品名称
  const [goodsOptions, setGoodsOptions] = useState([]);
  const [goodsLoading, setGoodsLoading] = useState(false);
  const goodsSearchTimer = useRef(null);

  // 搜索快工单商品（防抖 300ms；仅有关键字时才搜索，避免一次拉取全部商品）
  const searchGoods = (keyword) => {
    if (goodsSearchTimer.current) clearTimeout(goodsSearchTimer.current);
    const kw = (keyword || '').trim();
    if (!kw) {
      setGoodsOptions([]);
      return;
    }
    goodsSearchTimer.current = setTimeout(async () => {
      try {
        setGoodsLoading(true);
        const res = await kgdAPI.getGoods(kw);
        const goods = res.data || [];
        setGoodsOptions(goods.map(g => {
          const fullLabel = `${g.name}${g.standard ? `（${g.standard}）` : ''}${g.code ? ` [${g.code}]` : ''}`;
          return {
            key: g.id,
            value: g.name,
            label: <span className="goods-option-label" title={fullLabel}>{fullLabel}</span>,
            goods: g // 携带完整商品数据，选中后用于自动填充描述/分类/需求数量
          };
        }));
      } catch (err) {
        console.error('搜索快工单商品失败:', err);
        setGoodsOptions([]);
      } finally {
        setGoodsLoading(false);
      }
    }, 300);
  };

  /** 由 HT 图号推导产品分类：取第一个 '-' 之前的前缀，去掉开头 G/g（如 G050-xxx → 050） */
  const deriveCategory = (htNo) => {
    if (!htNo) return '';
    const prefix = String(htNo).split('-')[0] || '';
    return /^G/i.test(prefix) ? prefix.slice(1) : '';
  };

  /** 选择商品后自动填充：产品描述（规格/HT图号）、分类（HT前缀去G）、需求数量（最新订单计划数） */
  const handleGoodsChange = (value) => {
    const goods = goodsOptions.find(o => o.value === value)?.goods;
    if (!goods) return;

    const htNo = goods.fieldValues?.['HT图号'] || '';
    const standard = goods.standard || '';
    const descParts = [];
    if (standard) descParts.push(`规格：${standard}`);
    if (htNo) descParts.push(`HT图号：${htNo}`);
    const newCategory = deriveCategory(htNo);

    form.setFieldsValue({
      name: value, // 显式设置名称，防止 showSearch 的搜索文本覆盖选中值
      description: descParts.join('；'),
      ...(newCategory ? { category: newCategory } : {}),
    });

    // 需求数量：查该商品最新加工单的计划数
    if (goods.name) {
      kgdAPI.getBillNum(goods.name)
        .then((res) => {
          const bills = res.data || [];
          if (!bills.length) return;
          const latest = bills.reduce((a, b) => ((b.createdAt || '') > (a.createdAt || '') ? b : a));
          const num = parseInt(latest.num, 10);
          if (!isNaN(num) && num > 0) {
            form.setFieldsValue({ requiredQuantity: num });
          }
        })
        .catch((err) => console.error('获取加工单数量失败:', err));
    }
  };

  // 手动输入产品名称需确认（额外操作）
  const handleManualName = () => {
    Modal.confirm({
      title: '手动输入产品名称',
      icon: <EditOutlined />,
      content: '手动添加的产品名称不会关联快工单商品数据。请确认该产品不在快工单商品列表中，否则建议改为从商品列表选择。确定要手动输入吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setManualName(true);
        form.setFieldsValue({ name: '' });
      }
    });
  };

  // 转换初始值
  useEffect(() => {
    let codeRanges = [];
    if (initialValues.codeRanges && initialValues.codeRanges.length > 0) {
      codeRanges = initialValues.codeRanges;
    } else if (initialValues.codeStart && initialValues.codeEnd) {
      codeRanges = [{ start: initialValues.codeStart, end: initialValues.codeEnd }];
    } else {
      codeRanges = [{ start: '', end: '' }]; // 默认给一个空区间
    }

    form.setFieldsValue({
      requiredQuantity: 0,
      ...initialValues,
      codeRanges
    });
    
    // 初始化时也计算一下数量
    handleRangeChange();
  }, [initialValues, form]);

  // 监听编码范围变化，自动计算需求数量
  const handleRangeChange = () => {
    const codeRanges = form.getFieldValue('codeRanges') || [];
    
    let totalQuantity = 0;
    
    codeRanges.forEach(range => {
      if (range && range.start && range.end) {
        const start = parseInt(range.start);
        const end = parseInt(range.end);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          // 计算范围内的编码数量（包括起始和结束编码）
          totalQuantity += (end - start + 1);
        }
      }
    });
    
    form.setFieldsValue({ requiredQuantity: totalQuantity });
  };

  const handleSubmit = (values) => {
    // 提交后清理商品搜索防抖定时器
    if (goodsSearchTimer.current) {
      clearTimeout(goodsSearchTimer.current);
      goodsSearchTimer.current = null;
    }

    // 提交时，如果用户使用了 codeRanges，我们提取第一个作为 codeStart/codeEnd 兼容旧版
    const submitValues = { ...values };
    
    if (submitValues.codeRanges && submitValues.codeRanges.length > 0) {
      // 过滤掉不完整的区间
      let validRanges = submitValues.codeRanges.filter(r => r && r.start && r.end);
      
      // 检查重叠
      let hasOverlap = false;
      for (let i = 0; i < validRanges.length; i++) {
        for (let j = i + 1; j < validRanges.length; j++) {
          const start1 = parseInt(validRanges[i].start);
          const end1 = parseInt(validRanges[i].end);
          const start2 = parseInt(validRanges[j].start);
          const end2 = parseInt(validRanges[j].end);
          
          if (!isNaN(start1) && !isNaN(end1) && !isNaN(start2) && !isNaN(end2)) {
            // 如果两个区间有交集：区间1的起点在区间2内，或者区间2的起点在区间1内
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
        // 使用 antd message 提示，不提交表单
        import('antd').then(({ message }) => {
          message.error('号码段之间不能有包含或重叠关系');
        });
        return;
      }

      submitValues.codeRanges = validRanges;
      
      if (submitValues.codeRanges.length > 0) {
        submitValues.codeStart = submitValues.codeRanges[0].start;
        submitValues.codeEnd = submitValues.codeRanges[0].end;
      } else {
        submitValues.codeStart = '';
        submitValues.codeEnd = '';
      }
    }
    
    const submitFn = onFinish || onSubmit;
    if (submitFn) {
      submitFn(submitValues);
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#007AFF',
          colorLink: '#007AFF',
          colorText: '#1d1d1f',
          colorTextSecondary: '#6e6e73',
          colorBorder: '#d1d1d6',
          borderRadius: 10,
          controlHeight: 40,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro SC', 'PingFang SC', 'Microsoft YaHei', sans-serif"
        },
        components: {
          Form: { itemMarginBottom: 20 }
        }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="apple-product-form"
      >
        <Form.Item
          name="name"
          label="产品名称"
          rules={[{ required: true, message: isEdit || manualName ? '请输入产品名称' : '请选择产品名称' }]}
        >
          {isEdit || manualName ? (
            <Input placeholder="请输入产品名称" />
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Select
                showSearch
                style={{ flex: 1, minWidth: 0 }}
                placeholder="搜索商品：名称/编号/规格/HT图号"
                filterOption={false}
                onSearch={searchGoods}
                onChange={handleGoodsChange}
                options={goodsOptions}
                loading={goodsLoading}
                allowClear
                popupClassName="long-text-select-popup"
                notFoundContent={goodsLoading ? <Spin size="small" /> : '输入名称/编号/规格/HT图号搜索'}
              />
              <Button icon={<EditOutlined />} onClick={handleManualName}>
                手动添加
              </Button>
            </div>
          )}
        </Form.Item>
        
        <Form.Item
          name="description"
          label="产品描述"
        >
          <TextArea placeholder="请输入产品描述（可选）" rows={3} showCount maxLength={500} />
        </Form.Item>
        
        <Form.Item
          name="category"
          label="产品分类"
        >
          <AutoComplete
            placeholder="请选择或输入产品分类（可选）"
            allowClear
            filterOption={(inputValue, option) =>
              option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
            }
            options={categories.map(category => ({
              value: category,
              label: category
            }))}
          />
        </Form.Item>
        
        <Form.Item
          name="requiredQuantity"
          label="需求数量"
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        
        <div className="code-range-section">
          <div className="code-range-section-title">
            <NumberOutlined /> 编码范围
            <span className="code-range-section-sub">可添加多个不连续的号码段</span>
          </div>
          <Form.List name="codeRanges">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={8} align="middle" style={{ marginBottom: 12 }}>
                    <Col span={11}>
                      <Form.Item
                        {...restField}
                        name={[name, 'start']}
                        style={{ marginBottom: 0 }}
                        rules={[
                          {
                            validator: async (_, value) => {
                              const end = form.getFieldValue(['codeRanges', name, 'end']);
                              if (value && end) {
                                const s = parseInt(value);
                                const e = parseInt(end);
                                if (s > e) {
                                  return Promise.reject(new Error('起始值不能大于结束值'));
                                }
                                if (e - s > 1000000) {
                                  return Promise.reject(new Error('号码段范围过大(超过100万)，请分段添加'));
                                }
                              }
                              return Promise.resolve();
                            }
                          }
                        ]}
                      >
                        <Input addonBefore="起始值" placeholder="如: 168000" onChange={() => {
                          handleRangeChange();
                          // 触发结束值的校验
                          form.validateFields([['codeRanges', name, 'end']]);
                        }} />
                      </Form.Item>
                    </Col>
                    <Col span={1} style={{ textAlign: 'center', color: '#999', lineHeight: '32px' }}>
                      -
                    </Col>
                    <Col span={11}>
                      <Form.Item
                        {...restField}
                        name={[name, 'end']}
                        style={{ marginBottom: 0 }}
                        rules={[
                          {
                            validator: async (_, value) => {
                              const start = form.getFieldValue(['codeRanges', name, 'start']);
                              if (start && value) {
                                const s = parseInt(start);
                                const e = parseInt(value);
                                if (s > e) {
                                  return Promise.reject(new Error('结束值不能小于起始值'));
                                }
                                if (e - s > 1000000) {
                                  return Promise.reject(new Error('号码段范围过大(超过100万)，请分段添加'));
                                }
                              }
                              return Promise.resolve();
                            }
                          }
                        ]}
                      >
                        <Input addonBefore="结束值" placeholder="如: 168050" onChange={() => {
                          handleRangeChange();
                          // 触发起始值的校验
                          form.validateFields([['codeRanges', name, 'start']]);
                        }} />
                      </Form.Item>
                    </Col>
                    <Col span={1} style={{ textAlign: 'center', lineHeight: '32px' }}>
                      {fields.length > 1 && (
                        <MinusCircleOutlined 
                          style={{ color: '#ff3b30', fontSize: '16px', cursor: 'pointer' }}
                          onClick={() => { remove(name); setTimeout(handleRangeChange, 0); }} 
                        />
                      )}
                    </Col>
                  </Row>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加号码段
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </div>
        
        <Form.Item className="apple-form-actions">
          <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
            {submitText}
          </Button>
          {onCancel && (
            <Button onClick={onCancel}>取消</Button>
          )}
        </Form.Item>
      </Form>
    </ConfigProvider>
  );
};

ProductForm.propTypes = {
  onFinish: PropTypes.func,
  onSubmit: PropTypes.func,
  onCancel: PropTypes.func,
  categories: PropTypes.array,
  initialValues: PropTypes.object,
  loading: PropTypes.bool,
  submitText: PropTypes.string
};

export default ProductForm;
