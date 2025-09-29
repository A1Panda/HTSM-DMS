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
    if (visible && !scannerInstanceRef.current) {
      setLoading(true);
      setError('');
      
      // 延迟初始化扫码器，确保DOM已经渲染
      setTimeout(() => {
        try {
          const scanner = new Scanner('scanner', config.scanner);
          
          scanner.init(
            // 扫描成功回调
            (decodedText) => {
              setScanResult(decodedText);
              scanner.pause();
            },
            // 扫描错误回调
            (error) => {
              console.error('扫描错误:', error);
              // 不显示错误，因为扫描过程中会频繁触发错误
            }
          );
          
          scannerInstanceRef.current = scanner;
        } catch (err) {
          console.error('初始化扫码器失败:', err);
          setError('初始化扫码器失败，请检查摄像头权限或尝试使用其他浏览器');
        } finally {
          setLoading(false);
        }
      }, 500);
    }
    
    // 组件卸载时清理扫码器
    return () => {
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

  // 使用扫描结果
  const handleUseScanResult = () => {
    if (scanResult) {
      onScan(scanResult);
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
        {loading ? (
          <div style={{ padding: '40px 0' }}>
            <Spin size="large" />
            <p style={{ marginTop: 16 }}>正在初始化扫码器...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '20px 0', color: '#ff4d4f' }}>
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div id="scanner" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}></div>
            
            {scanResult && (
              <div style={{ marginTop: 16, padding: 16, border: '1px solid #d9d9d9', borderRadius: 4 }}>
                <p>扫描结果:</p>
                <Tag color="green" style={{ fontSize: 16, padding: '4px 8px' }}>
                  {scanResult}
                </Tag>
              </div>
            )}
          </>
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