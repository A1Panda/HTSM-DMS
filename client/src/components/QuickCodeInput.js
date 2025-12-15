import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, message, Tooltip, Alert, Modal } from 'antd';
import { ScanOutlined, EnterOutlined, WarningOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

/**
 * 快速编码输入组件
 * @param {Object} props 组件属性
 * @param {Function} props.onSubmit 提交回调
 * @param {boolean} props.loading 是否加载中
 * @param {boolean} props.autoFocus 是否自动聚焦
 * @param {Array} props.existingCodes 已存在的编码列表
 * @param {Function} props.onDuplicate 重复编码回调
 */
const QuickCodeInput = ({ 
  onSubmit, 
  loading = false, 
  autoFocus = true, 
  existingCodes = [], 
  onDuplicate = null 
}) => {
  const [code, setCode] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [duplicateCode, setDuplicateCode] = useState('');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const inputRef = useRef(null);

  // 组件挂载时自动聚焦
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // 清理编码，只保留数字
  const cleanCode = (value) => {
    if (!value) return value;
    // 只保留数字
    return value.replace(/\D/g, '');
  };

  // 处理输入变化
  const handleChange = (e) => {
    const cleanedValue = cleanCode(e.target.value);
    setCode(cleanedValue);
    // 清除重复警告
    if (duplicateWarning) {
      setDuplicateWarning(false);
      setDuplicateCode('');
    }
  };

  // 处理按键事件
  const handleKeyPress = (e) => {
    // 按下回车键提交
    if (e.key === 'Enter' && code.trim()) {
      handleSubmit();
    }
  };

  // 检查编码是否重复
  const checkDuplicate = (codeValue) => {
    return existingCodes.some(existingCode => 
      existingCode.code === codeValue
    );
  };

  // 处理提交
  const handleSubmit = () => {
    // 清理编码，只保留数字
    const cleanedCode = cleanCode(code);
    
    if (!cleanedCode.trim()) {
      message.warning('请输入编码');
      return;
    }

    // 检查是否重复（使用清理后的编码）
    if (checkDuplicate(cleanedCode)) {
      // 显示重复警告
      setDuplicateWarning(true);
      setDuplicateCode(cleanedCode);
      
      // 播放警告声音
      const audio = new Audio('data:audio/wav;base64,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');
      audio.play();
      
      // 调用重复回调
      if (onDuplicate) {
        onDuplicate(cleanedCode);
      }
      
      // 显示确认对话框
      setConfirmModalVisible(true);
      
      // 不清空输入框，让用户可以看到重复的编码
      return;
    }

    onSubmit({ code: cleanedCode });
    setCode(''); // 清空输入框
    
    // 提交后重新聚焦输入框，方便连续扫码
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  };

  return (
    <div className="quick-code-input" style={{ display: 'flex', flexDirection: 'column', marginBottom: 16 }}>
      <div style={{ display: 'flex' }}>
        <Input
          ref={inputRef}
          value={code}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder="输入或扫描编码（仅数字）"
          prefix={<ScanOutlined style={{ color: '#1890ff' }} />}
          disabled={loading}
          style={{ flex: 1 }}
          autoComplete="off"
          status={duplicateWarning ? 'error' : ''}
        />
        <Tooltip title="回车键快速提交">
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={loading}
            icon={<EnterOutlined />}
            style={{ marginLeft: 8 }}
            danger={duplicateWarning}
          >
            快速添加
          </Button>
        </Tooltip>
      </div>
      
      {duplicateWarning && (
        <Alert
          message="编码重复"
          description={`编码 "${duplicateCode}" 已存在，请使用不同的编码！`}
          type="error"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginTop: 8 }}
          closable
          onClose={() => {
            setDuplicateWarning(false);
            setDuplicateCode('');
          }}
        />
      )}
      
      {/* 重复编码确认对话框 */}
      <Modal
        title={
          <span>
            <WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
            编码重复确认
          </span>
        }
        open={confirmModalVisible}
        onCancel={() => {
          setConfirmModalVisible(false);
          // 不清空输入框，让用户可以修改
        }}
        onOk={() => {
          setConfirmModalVisible(false);
          // 清空输入框
          setCode('');
          // 重新聚焦
          if (inputRef.current) {
            setTimeout(() => {
              inputRef.current.focus();
            }, 100);
          }
        }}
        okText="继续录入"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ fontSize: '16px' }}>
            <b>警告：</b>编码 <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{duplicateCode}</span> 已存在！
          </p>
          <p>确定要继续录入其他编码吗？</p>
          <p style={{ color: '#888' }}>点击"继续录入"清空当前输入并继续，点击"取消"保留当前输入。</p>
        </div>
      </Modal>
    </div>
  );
};

QuickCodeInput.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  autoFocus: PropTypes.bool,
  existingCodes: PropTypes.array,
  onDuplicate: PropTypes.func
};

export default QuickCodeInput;