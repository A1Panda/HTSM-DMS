import React from 'react';
import { Form, Input, InputNumber, Button, AutoComplete } from 'antd';
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

  // 监听编码范围变化，自动计算需求数量
  const handleRangeChange = () => {
    const codeStart = form.getFieldValue('codeStart');
    const codeEnd = form.getFieldValue('codeEnd');
    
    if (codeStart && codeEnd) {
      const start = parseInt(codeStart);
      const end = parseInt(codeEnd);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        // 计算范围内的编码数量（包括起始和结束编码）
        form.setFieldsValue({ requiredQuantity: end - start + 1 });
      }
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish || onSubmit}
      initialValues={{
        requiredQuantity: 0,
        ...initialValues
      }}
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
      
      <Form.Item
        name="codeStart"
        label="编码起始值"
      >
        <Input placeholder="如: 168000" onChange={handleRangeChange} />
      </Form.Item>
      
      <Form.Item
        name="codeEnd"
        label="编码结束值"
      >
        <Input placeholder="如: 168050" onChange={handleRangeChange} />
      </Form.Item>
      
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
