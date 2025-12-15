import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Tag, Spin } from 'antd';
import PropTypes from 'prop-types';
import Scanner from '../utils/scanner';
import config from '../config';

/**
 * 扫码器模态框组件
 * @param {Object} props 组件属性
 * @param {boolean} props.visible 是否可见
 * @param {Function} props.onCancel 取消回调
 * @param {Function} props.onScan 扫描成功回调
 */
const ScannerModal = ({ visible, onCancel, onScan }) => {
  const [scanResult, setScanResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  // 初始化扫码器
  useEffect(() => {
    let timeoutId;
    
    if (visible && !scannerInstanceRef.current) {
      setLoading(true);
      setError('');
      
      // 延迟初始化扫码器，确保模态框完全显示
      const initScanner = () => {
        try {
          const scanner = new Scanner('scanner', config.scanner);
          
          scanner.init(
            // 扫描成功回调
            (decodedText) => {
              // 清理扫描结果，只保留数字
              const cleanedText = decodedText.replace(/\D/g, '');
              setScanResult(cleanedText);
              scanner.pause();
            },
            // 扫描错误回调
            (error) => {
              console.error('扫描错误:', error);
              // 不显示错误，因为扫描过程中会频繁触发错误
            }
          );
          
          scannerInstanceRef.current = scanner;
          setLoading(false);
        } catch (err) {
          console.error('初始化扫码器失败:', err);
          setError('初始化扫码器失败，请检查摄像头权限或尝试使用其他浏览器');
          setLoading(false);
        }
      };
      
      // 等待模态框完全显示后再初始化
      timeoutId = setTimeout(initScanner, 800);
    }
    
    // 组件卸载时清理扫码器和定时器
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear();
        scannerInstanceRef.current = null;
      }
    };
  }, [visible]);

  // 处理关闭模态框
  const handleCancel = () => {
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.clear();
      scannerInstanceRef.current = null;
    }
    setScanResult('');
    setError('');
    onCancel();
  };

  // 清理编码，只保留数字
  const cleanCode = (value) => {
    if (!value) return value;
    // 只保留数字
    return value.replace(/\D/g, '');
  };

  // 使用扫描结果
  const handleUseScanResult = () => {
    if (scanResult) {
      // 清理扫描结果，只保留数字
      const cleanedResult = cleanCode(scanResult);
      onScan(cleanedResult);
      handleCancel();
    }
  };

  // 重新扫描
  const handleRescan = () => {
    setScanResult('');
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.resume();
    }
  };

  return (
    <Modal
      title="扫描二维码/条形码"
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="close" onClick={handleCancel}>
          关闭
        </Button>,
        scanResult && (
          <Button key="rescan" onClick={handleRescan}>
            重新扫描
          </Button>
        ),
        <Button 
          key="use" 
          type="primary" 
          disabled={!scanResult} 
          onClick={handleUseScanResult}
        >
          使用扫描结果
        </Button>
      ]}
      width={600}
    >
      <div style={{ textAlign: 'center' }}>
        {/* 始终渲染scanner容器，但在加载时显示遮罩 */}
        <div style={{ position: 'relative' }}>
          <div id="scanner" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}></div>
          
          {loading && (
            <div style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '200px'
            }}>
              <Spin size="large" />
              <p style={{ marginTop: 16 }}>正在初始化扫码器...</p>
            </div>
          )}
          
          {error && (
            <div style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '200px',
              color: '#ff4d4f'
            }}>
              <p>{error}</p>
            </div>
          )}
        </div>
        
        {scanResult && (
          <div style={{ marginTop: 16, padding: 16, border: '1px solid #d9d9d9', borderRadius: 4 }}>
            <p>扫描结果:</p>
            <Tag color="green" style={{ fontSize: 16, padding: '4px 8px' }}>
              {scanResult}
            </Tag>
          </div>
        )}
      </div>
    </Modal>
  );
};

ScannerModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onScan: PropTypes.func.isRequired
};

export default ScannerModal;