import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Input, Button, message, Tooltip, Alert, Modal } from 'antd';
import { ScanOutlined, EnterOutlined, WarningOutlined, CheckCircleFilled } from '@ant-design/icons';
import PropTypes from 'prop-types';

// 成功提示音：用 Web Audio 合成两声上行短音，无需额外音频文件，
// 与重复编码的告警音形成明显区分（听到即可确认录入成功，无需盯屏幕）
let successAudioCtx = null;
const playSuccessSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!successAudioCtx) successAudioCtx = new AudioCtx();
    if (successAudioCtx.state === 'suspended') successAudioCtx.resume();
    const ctx = successAudioCtx;
    const now = ctx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.1;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.1);
    });
  } catch (e) {
    // 浏览器禁用音频时静默忽略，不影响录入
  }
};

/**
 * 快速编码输入组件
 * @param {Object} props 组件属性
 * @param {Function} props.onSubmit 提交回调
 * @param {boolean} props.loading 是否加载中
 * @param {boolean} props.autoFocus 是否自动聚焦
 * @param {Function} props.onDuplicate 重复编码回调
 */
const QuickCodeInput = forwardRef(({ 
  onSubmit, 
  loading = false, 
  autoFocus = true, 
  onDuplicate = null 
}, ref) => {
  const [code, setCode] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [duplicateCode, setDuplicateCode] = useState('');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [successCode, setSuccessCode] = useState(''); // 最近一次成功录入的编码
  const inputRef = useRef(null);
  const needRefocusRef = useRef(false); // 提交完成后是否需要重新聚焦
  const successTimerRef = useRef(null); // 成功提示自动消失定时器

  // 组件挂载时自动聚焦
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // loading 结束后自动重新聚焦，确保连续扫码时光标不丢失
  useEffect(() => {
    if (!loading && needRefocusRef.current) {
      needRefocusRef.current = false;
      // 延迟聚焦，等待 React 完成 DOM 更新
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [loading]);

  // 清理编码，保留完整字符（不做数字提取）
  const cleanCode = (value) => {
    if (!value) return value;
    return value.trim();
  };

  // 处理输入变化
  const handleChange = (e) => {
    // 扫码枪输入是一个字符一个字符输入的，如果在这里实时清理，会导致输入过程中被截断
    // 比如输入 "HTSM1..."，当输入到 "1" 时会被清理成 "1"，导致后续输入丢失前缀
    // 所以这里只保存原始输入，在提交时再进行清理
    setCode(e.target.value);
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

  // 处理提交
  const handleSubmit = () => {
    // 清理编码
    const cleanedCode = cleanCode(code);
    
    if (!cleanedCode.trim()) {
      message.warning('请输入编码');
      return;
    }

    // 本地编码列表可能已过期（其它设备已录入或删除该编码），
    // 因此不再用本地列表做重复拦截，统一以服务端判定为准，避免误拦或漏拦
    onSubmit({ code: cleanedCode });
    setCode(''); // 清空输入框
    
    // 标记需要在 loading 结束后重新聚焦
    needRefocusRef.current = true;
  };

  // 服务端判定重复后由父组件调用：展示告警、声音与确认弹窗
  const showDuplicate = (duplicateValue) => {
    // 同一时刻只展示一种提示
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setSuccessCode('');
    setDuplicateWarning(true);
    setDuplicateCode(duplicateValue || '');

    // 调用重复回调
    if (onDuplicate) {
      onDuplicate(duplicateValue || '');
    }

    // 播放警告声音
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJXfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltryxnMpBSl+zPLaizsIGGS57OihUBELTKXh8bllHgU2jdXzzn0vBSJ0xe/glEILElyx6OyrWBUIQ5zd8sFuJAUuhM/z1YU2Bhxqvu7mnEoODlOq5O+zYBoGPJPY88p2KwUme8rx3I4+CRZiturqpVITC0mi4PK8aB8GM4nU8tGAMQYfcsLu45ZFDBFYr+ftrVoXCECY3PLEcSYELIHO8diJOQcZaLvt559NEAxPqOPwtmMcBjiP1/PMeS0GI3fH8OCRQQoUXrTp66hVFApGnt/yvmwhBTGG0fPTgjQGHW/A7eSaRw0PVqzl77BeGQc+ltrzxnUoBSh+zPDaizsIGGS56+mjTxELTKXh8bllHgU1jdT0z3wvBSJ0xPDglEILElyx6OyrWRUIRJve8sFuJAUug8/y1oU2Bhxqvu7mnEoPDlOq5PC0YRoGPJLY88p3KgUme8rx3I4+CRVht+rqpVMSC0mh4fK8aiAFM4nU8tGAMQYfccPu45ZFDBFYr+ftrVwWCECY3PLEcSYGK4DN8tiIOQcZZ7zs56BODwxPpuPxtmQcBjiP1/PMeywGI3fH8OCRQQsUXrTp66hVFApGnt/zvmwhBTGG0fPTgzQGHW/A7eSaSA0PVqvm77BeGQc9ltvyxnUoBSh9y/HajjoIGGS56+mjUREKTKPi8blmHgU1jdTy0HwvBSF0xe/glEILElux6eyrWRUIRJzd8sFuJAUug8/y1oY2Bhxqvu7mnEoPDlOq5PC0YRoGPJLY88p3KgUlecnx3Y4+CRVht+rqpVMSC0mh4fK8aiAFM4nS89GAMQYfccLv45dGCxFYrufur1sXCECY3PLEcicFKoDN8tiIOQcZZ7rs56BODwxPpuPxtmQdBTiP1/PMeywGI3bH8OCRQQsUXbPq66lUFQlGnt/zvmwhBTGG0fPTgzQGHW3A7uSaSA0PVKzm77FdGQc9ltrzyHQpBSh9y/HajjoIGGO56+mjUREKTKPi8blmHgU1jdTy0H4wBiF0xe/glEILElux6eyrWRUIRJzd8sFuJAUtg87y1oY3Bxtpv+7mnUsODlOq5PC0YRoGOpPX88p3KgUlecnx3Y4+CRVht+rqpVMSC0mh4fK8aiAFMojT89GBMgUfccLv45dGCxFYrufur1sXCECX2/PEcicFKoDN8tiKOQgZZ7rs56BODwxPpuPxt2MdBTeP1/PMeywGI3bH8OCRQQsUXbPq66lUFQlGnt/zvmwhBTCF0fPTgzUFHW3A7uSaSA0PVKzm77FdGQc9lNrzyHQpBSh9y/HajzoHGGO56+mjUREKTKPi8blmHgU1jdTy0H4wBiF0xe/glEILElux6eyrWRUIRJzd8sFuJAUtg87y1oY3Bxtpv+7mnUsODlOq5PC0YRoGOpPX88p3KgUlecnx3Y4+CRVht+rqpVMSC0mh4fK8aiAFMojT89GBMgUfccLv45dGCxFYrufur1sXCECX2/PEcicFKoDN8tiKOQgZZ7rs56BODwxPpuPxt2MdBTeP1/PMeywGI3bH8OCRQQsUXbPq66lUFQlFnd/zvmwhBTCF0fPTgzUFHW3A7uSaSA0PVKzm77FdGQc9lNryxnUoBSh9y/HajzoHGGO56+mjUREKTKPi8blmHgU1jdTy0H4wBiF0xe/glEILElux6eyrWRUIRJzd8sFuJAUtg87y1oY3Bxtpv+7mnUsODlOq5PC0YRoGOpPX88p3KgUlecnx3Y4+CRVht+rqpVMSC0mh4fK8aiAFMojT89GBMgUfccLv45dGCxFYrufur1sXCECX2/PEcicFKoDN8tiKOQgZZ7rs56BODwxPpuPxt2MdBTeP1/PMeywGI3bH8OCRQQsUXbPq66lUFQlFnd/zvmwhBTCF0fPTgzUFHW3A7uSaSA0PVKzm77FdGQc9lNryxnUoBSh9y/HajzoHGGO56+mjUREKTKPi8blmHgU1jdTy0H4wBiF0xe/glEILElux6eyrWRUIRJzd8sFuJAUtg87y1oY3Bxtpv+7mnUsODlOq5PC0YRoGOpPX88p3KgUlecnx3Y4+CRVht+rqpVMSC0mh4fK8aiAFMojT89GBMgUfccLv45dGCxFYrufur1sXCECX2/PEcicFKoDN8tiKOQgZZ7rs56BODwxPpuPxt2MdBTeP1/PMeywGI3bH8OCRQQsUXbPq66lUFQlFnd/zvmwhBTCF0fPTgzUFHW3A7uSaSA0PVKzm77FdGQc9lNryxnUo');
    audio.play().catch(() => {});
      
    // 显示确认对话框
    setConfirmModalVisible(true);
  };

  // 编码成功录入后由父组件调用：醒目的成功横幅 + 提示音
  const showSuccess = (codeValue) => {
    setDuplicateWarning(false);
    setDuplicateCode('');
    setConfirmModalVisible(false);
    setSuccessCode(codeValue || '');
    playSuccessSound();
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccessCode(''), 2500);
  };

  // 暴露给父组件：服务端判定重复 / 录入成功时调用
  useImperativeHandle(ref, () => ({ showDuplicate, showSuccess }));

  // 卸载时清理定时器
  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
  }, []);

  return (
    <div
      className={`quick-code-input${successCode ? ' is-success' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', marginBottom: 16 }}
    >
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex' }}>
        <Input
          ref={inputRef}
          value={code}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder="输入或扫描编码（支持自动提取末尾数字）"
          prefix={<ScanOutlined style={{ color: 'var(--htsm-primary)' }} />}
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

        {successCode && (
          <div className="quick-code-success">
            <CheckCircleFilled className="quick-code-success-icon" />
            <div>
              <div className="quick-code-success-title">已成功录入系统</div>
              <div className="quick-code-success-code">{successCode}</div>
            </div>
          </div>
        )}
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
            <WarningOutlined style={{ color: 'var(--htsm-state-error)', marginRight: 8 }} />
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
          // loading 结束时自动重新聚焦
          needRefocusRef.current = true;
        }}
        okText="继续录入"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ fontSize: '16px' }}>
            <b>警告：</b>编码 <span style={{ color: 'var(--htsm-state-error)', fontWeight: 'bold' }}>{duplicateCode}</span> 已存在！
          </p>
          <p>确定要继续录入其他编码吗？</p>
          <p style={{ color: '#888' }}>点击"继续录入"清空当前输入并继续，点击"取消"保留当前输入。</p>
        </div>
      </Modal>
    </div>
  );
});

QuickCodeInput.displayName = 'QuickCodeInput';

QuickCodeInput.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  autoFocus: PropTypes.bool,
  onDuplicate: PropTypes.func
};

export default QuickCodeInput;