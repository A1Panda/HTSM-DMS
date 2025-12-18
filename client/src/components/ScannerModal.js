import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Tag, Spin, message } from 'antd';
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
const ScannerModal = ({ visible, onCancel, onScan, continuous = true }) => {
  const [scanResult, setScanResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);
  const lastScanRef = useRef({ code: '', time: 0 });

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
              const cleanedText = decodedText.replace(/\D/g, '');
              if (!cleanedText) return;
              const now = Date.now();
              if (continuous) {
                if (lastScanRef.current.code === cleanedText && now - lastScanRef.current.time < 1500) {
                  return;
                }
                lastScanRef.current = { code: cleanedText, time: now };
                setScanResult(cleanedText);
                onScan(cleanedText);
                if (scannerInstanceRef.current) {
                  scannerInstanceRef.current.pause();
                  setTimeout(() => {
                    if (scannerInstanceRef.current) {
                      scannerInstanceRef.current.resume();
                    }
                  }, 500);
                }
              } else {
                setScanResult(cleanedText);
                scanner.pause();
              }
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

  // 使用第三方 OCR 识别铭牌上的数字（当二维码无法识别时）
  const handleOcrRecognizeDigits = async () => {
    try {
      setOcrLoading(true);
      setError('');

       // 校验 OCR 配置是否已设置
      if (!config.ocr || !config.ocr.appKey || !config.ocr.uid) {
        setError('OCR 配置未完成，请先在前端环境变量中配置 REACT_APP_LUCKYCOLA_APPKEY 和 REACT_APP_LUCKYCOLA_UID');
        setOcrLoading(false);
        return;
      }

      // html5-qrcode 在 #scanner 容器内会生成一个 <video> 元素
      const scannerElement = document.getElementById('scanner');
      if (!scannerElement) {
        setError('找不到扫码区域，请关闭后重试');
        setOcrLoading(false);
        return;
      }

      const video = scannerElement.querySelector('video');
      if (!video) {
        setError('未检测到摄像头画面，请确认摄像头已启动');
        setOcrLoading(false);
        return;
      }

      // 创建临时 canvas 截图当前画面
      const canvas = document.createElement('canvas');
      const srcWidth = video.videoWidth || 640;
      const srcHeight = video.videoHeight || 480;

      // 为了满足第三方接口“图片不大于 1M”的要求，同时提升数字区域清晰度，
      // 我们限制截图最大宽度为 800 像素，并按比例缩放高度
      const maxWidth = 800;
      const scale = srcWidth > maxWidth ? maxWidth / srcWidth : 1;
      const width = Math.round(srcWidth * scale);
      const height = Math.round(srcHeight * scale);

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);

      // 将截图转为 base64（使用 jpeg 格式减小体积，降低超过 1M 的风险）
      const imgBase64 = canvas.toDataURL('image/jpeg', 0.85);

      // 调用 LuckyCola OCR 接口
      const response = await fetch(config.ocr.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appKey: config.ocr.appKey,
          uid: config.ocr.uid,
          imgBase64
        })
      });

      const result = await response.json();

      if (!response.ok || result.code !== 0) {
        const msg = result.msg || response.statusText || 'OCR 接口调用失败';
        console.error('OCR 接口返回错误:', result);
        setError(`数字识别失败：${msg}`);
        setOcrLoading(false);
        return;
      }

      const ocrText = result.data?.content || '';

      // 只保留数字（去掉所有非数字字符，包括 '-'）
      const digitsOnly = (ocrText || '').replace(/\D/g, '');

      if (!digitsOnly) {
        message.warning('未能识别出清晰的数字，请靠近一些或调整光线后重试');
        setOcrLoading(false);
        return;
      }

      setScanResult(digitsOnly);
      message.success('已通过 OCR 识别出数字');

      // 直接回调上层使用这个数字
      if (onScan) {
        onScan(digitsOnly);
      }
    } catch (err) {
      console.error('OCR 识别失败:', err);
      setError('数字识别失败，请调整镜头距离和光线后重试');
    } finally {
      setOcrLoading(false);
    }
  };

  // 绑定快捷键：F2 触发 OCR 数字识别
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e) => {
      // 避免在输入框聚焦时误触
      const target = e.target;
      const isInputLike =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInputLike) return;

      if (e.key === 'F2' && !ocrLoading && !loading) {
        e.preventDefault();
        handleOcrRecognizeDigits();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, ocrLoading, loading]);

  return (
    <Modal
      title="扫描二维码/条形码"
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="close" onClick={handleCancel}>
          关闭
        </Button>,
        <Button 
          key="ocr" 
          onClick={handleOcrRecognizeDigits} 
          loading={ocrLoading}
        >
          OCR数字识别
        </Button>,
        !continuous && scanResult && (
          <Button key="rescan" onClick={handleRescan}>
            重新扫描
          </Button>
        ),
        !continuous && (
          <Button 
            key="use" 
            type="primary" 
            disabled={!scanResult} 
            onClick={handleUseScanResult}
          >
            使用扫描结果
          </Button>
        )
      ].filter(Boolean)}
      width={600}
    >
      <div style={{ textAlign: 'center' }}>
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
