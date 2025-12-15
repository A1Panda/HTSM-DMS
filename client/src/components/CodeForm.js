import React from 'react';
import { Form, Input, DatePicker, Button } from 'antd';
import PropTypes from 'prop-types';
import moment from 'moment';

const { TextArea } = Input;

/**
 * 编码表单组件
 * @param {Object} props 组件属性
 * @param {Function} props.onFinish 表单提交回调
 * @param {Function} props.onCancel 取消回调
 * @param {Object} props.initialValues 初始值
 * @param {boolean} props.loading 是否加载中
 */
const CodeForm = ({ onFinish, onCancel, initialValues = {}, loading = false }) => {
  const [form] = Form.useForm();

  // 清理编码，只保留数字
  const cleanCode = (value) => {
    if (!value) return value;
    // 只保留数字
    return value.replace(/\D/g, '');
  };

  // 处理编码输入变化
  const handleCodeChange = (e) => {
    const cleanedValue = cleanCode(e.target.value);
    form.setFieldsValue({ code: cleanedValue });
  };

  // 处理表单提交
  const handleFinish = (values) => {
    // 清理编码，只保留数字
    if (values.code) {
      values.code = cleanCode(values.code);
    }
    // 如果有日期，转换为字符串格式
    if (values.date) {
      values.date = values.date.format('YYYY-MM-DD');
    }
    onFinish(values);
  };

  // 处理初始值中的日期
  const getInitialValues = () => {
    const values = { ...initialValues };
    if (values.date) {
      values.date = moment(values.date);
    }
    return values;
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={getInitialValues()}
    >
      <Form.Item
        name="code"
        label="产品编码"
        rules={[{ required: true, message: '请输入产品编码' }]}
      >
        <Input 
          placeholder="请输入产品编码（仅数字）" 
          onChange={handleCodeChange}
        />
      </Form.Item>
      
      <Form.Item
        name="description"
        label="编码描述"
      >
        <TextArea placeholder="请输入编码描述（可选）" rows={3} />
      </Form.Item>
      
      <Form.Item
        name="date"
        label="生产日期"
      >
        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
      </Form.Item>
      
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
          提交
        </Button>
        <Button onClick={onCancel}>
          取消
        </Button>
      </Form.Item>
    </Form>
  );
};

CodeForm.propTypes = {
  onFinish: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  initialValues: PropTypes.object,
  loading: PropTypes.bool
};

export default CodeForm;