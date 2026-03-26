import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Button, AutoComplete, Row, Col } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

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
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
    >
      <Form.Item
        name="name"
        label="产品名称"
        rules={[{ required: true, message: '请输入产品名称' }]}
      >
        <Input placeholder="请输入产品名称" />
      </Form.Item>
      
      <Form.Item
        name="description"
        label="产品描述"
      >
        <TextArea placeholder="请输入产品描述（可选）" rows={3} />
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
      
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8 }}>编码范围（可添加多个不连续的号码段）:</div>
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
                              if (parseInt(value) > parseInt(end)) {
                                return Promise.reject(new Error('起始值不能大于结束值'));
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
                              if (parseInt(start) > parseInt(value)) {
                                return Promise.reject(new Error('结束值不能小于起始值'));
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
                        style={{ color: '#ff4d4f', fontSize: '16px', cursor: 'pointer' }}
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
      
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
          {submitText}
        </Button>
        {onCancel && (
          <Button onClick={onCancel}>取消</Button>
        )}
      </Form.Item>
    </Form>
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
