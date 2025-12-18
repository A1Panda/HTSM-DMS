import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Tag, Spin, message } from 'antd';
import PropTypes from 'prop-types';
import Scanner from '../utils/scanner';
import config from '../config';
import jsQR from 'jsqr';

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
  const [qrSnapshotLoading, setQrSnapshotLoading] = useState(false);
  const [qrPreview, setQrPreview] = useState(null);
  const [qrPreviewInverted, setQrPreviewInverted] = useState(null);
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

  // 使用 jsQR 对当前帧做一次快照识别（同时尝试正常和反色的二维码）
  const handleQrSnapshotRecognize = async () => {
    try {
      setQrSnapshotLoading(true);
      setError('');
      console.log('[QR-SNAPSHOT] 开始快照识别');

      const scannerElement = document.getElementById('scanner');
      if (!scannerElement) {
        const msg = '找不到扫码区域，请关闭后重试';
        console.warn('[QR-SNAPSHOT] scanner 容器不存在');
        setError(msg);
        setQrSnapshotLoading(false);
        return;
      }

      const video = scannerElement.querySelector('video');
      if (!video) {
        const msg = '未检测到摄像头画面，请确认摄像头已启动';
        console.warn('[QR-SNAPSHOT] 未找到 video 元素');
        setError(msg);
        setQrSnapshotLoading(false);
        return;
      }

      const canvas = document.createElement('canvas');
      const width = video.videoWidth;
      const height = video.videoHeight;
      console.log('[QR-SNAPSHOT] video 尺寸:', { width, height });

      // 有些浏览器在视频刚开始时 videoWidth/videoHeight 为 0，需要等一帧
      if (!width || !height) {
        message.warning('摄像头画面尚未就绪，请稍等一两秒后再尝试快照识别');
        console.warn('[QR-SNAPSHOT] videoWidth/videoHeight 未就绪');
        setQrSnapshotLoading(false);
        return;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);

      let imageData;
      try {
        imageData = ctx.getImageData(0, 0, width, height);
      } catch (err) {
        console.error('[QR-SNAPSHOT] 获取画面像素数据失败:', err);
        setError('无法读取摄像头画面像素数据，请检查浏览器权限或重试');
        setQrSnapshotLoading(false);
        return;
      }

      // 生成原始预览图
      try {
        const previewUrl = canvas.toDataURL('image/png');
        setQrPreview(previewUrl);
      } catch (err) {
        console.warn('[QR-SNAPSHOT] 生成原始预览图失败:', err);
      }

      console.log('[QR-SNAPSHOT] 像素数据长度:', imageData.data?.length);

      // 生成反色预览图：对像素做一次真正的反色处理
      try {
        const invertedData = new Uint8ClampedArray(imageData.data);
        for (let i = 0; i < invertedData.length; i += 4) {
          invertedData[i] = 255 - invertedData[i];       // R
          invertedData[i + 1] = 255 - invertedData[i+1]; // G
          invertedData[i + 2] = 255 - invertedData[i+2]; // B
          // alpha 通道不变
        }
        const invertedImageData = new ImageData(invertedData, width, height);
        const invertCanvas = document.createElement('canvas');
        invertCanvas.width = width;
        invertCanvas.height = height;
        const invertCtx = invertCanvas.getContext('2d');
        invertCtx.putImageData(invertedImageData, 0, 0);
        const invertedUrl = invertCanvas.toDataURL('image/png');
        setQrPreviewInverted(invertedUrl);
      } catch (err) {
        console.warn('[QR-SNAPSHOT] 生成反色预览图失败:', err);
      }

      // 先按正常模式识别
      let result = jsQR(imageData.data, width, height, {
        inversionAttempts: 'dontInvert'
      });
      console.log('[QR-SNAPSHOT] 正常模式识别结果:', result ? { data: result.data, location: result.location } : null);

      // 如果正常模式没有识别到，再尝试“只识别反色二维码”
      if (!result) {
        result = jsQR(imageData.data, width, height, {
          inversionAttempts: 'onlyInvert'
        });
        console.log('[QR-SNAPSHOT] 反色模式识别结果:', result ? { data: result.data, location: result.location } : null);
      }

      if (!result || !result.data) {
        message.warning('未能从当前画面识别出二维码，请靠近一些或调整角度/光线后重试');
        console.warn('[QR-SNAPSHOT] jsQR 未识别到二维码');
        setQrSnapshotLoading(false);
        return;
      }

      const decoded = result.data.trim();
      if (!decoded) {
        message.warning('二维码内容为空或无法解析');
        console.warn('[QR-SNAPSHOT] 解码结果为空字符串');
        setQrSnapshotLoading(false);
        return;
      }

      setScanResult(decoded);
      //message.success('二维码识别成功（已尝试反色识别）');
      console.log('[QR-SNAPSHOT] 最终解码结果:', decoded);

      if (onScan) {
        onScan(decoded);
      }
    } catch (err) {
      console.error('[QR-SNAPSHOT] 二维码快照识别失败:', err);
      setError('二维码识别失败，请重试或调整拍摄环境');
    } finally {
      setQrSnapshotLoading(false);
    }
  };

  // 使用第三方 OCR 识别铭牌上的数字（当二维码无法识别时）
  const handleOcrRecognizeDigits = async () => {
    try {
      setOcrLoading(true);
      setError('');
      console.log('[OCR] 开始数字识别，代理地址:', config.ocr.proxyUrl);

      // html5-qrcode 在 #scanner 容器内会生成一个 <video> 元素
      const scannerElement = document.getElementById('scanner');
      if (!scannerElement) {
        const msg = '找不到扫码区域，请关闭后重试';
        console.warn('[OCR] scanner 容器不存在');
        setError(msg);
        setOcrLoading(false);
        return;
      }

      const video = scannerElement.querySelector('video');
      if (!video) {
        const msg = '未检测到摄像头画面，请确认摄像头已启动';
        console.warn('[OCR] 未找到 video 元素');
        setError(msg);
        setOcrLoading(false);
        return;
      }

      // 创建临时 canvas 截图当前画面
      const canvas = document.createElement('canvas');
      const srcWidth = video.videoWidth || 640;
      const srcHeight = video.videoHeight || 480;
      console.log('[OCR] 原始 video 尺寸:', { srcWidth, srcHeight });

      // 为了满足第三方接口“图片不大于 1M”的要求，同时提升数字区域清晰度，
      // 我们限制截图最大宽度为 800 像素，并按比例缩放高度
      const maxWidth = 800;
      const scale = srcWidth > maxWidth ? maxWidth / srcWidth : 1;
      const width = Math.round(srcWidth * scale);
      const height = Math.round(srcHeight * scale);
      console.log('[OCR] 缩放后尺寸:', { width, height, scale });

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);

      // 将截图转为 base64（使用 jpeg 格式减小体积，降低超过 1M 的风险）
      const imgBase64 = canvas.toDataURL('image/jpeg', 0.85);
      console.log('[OCR] 生成的 base64 长度:', imgBase64.length);

      // 调用后端 OCR 代理接口（由服务器转发到讯飞）
      const response = await fetch(config.ocr.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: imgBase64
        })
      });

      console.log('[OCR] 请求已发送，等待响应...');
      const text = await response.text();
      console.log('[OCR] 原始响应文本(前 200 字符):', text.slice(0, 200));
      let result;
      try {
        result = JSON.parse(text);
      } catch (parseErr) {
        console.error('[OCR] 接口返回的不是 JSON，解析失败:', parseErr);
        setError('数字识别失败：服务器返回了非 JSON 内容，请检查后端 /api/ocr/iflytek 是否正常运行');
        setOcrLoading(false);
        return;
      }

      if (!response.ok || result.error) {
        const msg = result.error || response.statusText || 'OCR 接口调用失败';
        console.error('[OCR] 接口返回错误:', result);
        setError(`数字识别失败：${msg}`);
        setOcrLoading(false);
        return;
      }

      const ocrText = result.content || '';
      console.log('[OCR] 识别原始文本:', ocrText);

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
      console.error('[OCR] 识别流程异常:', err);
      setError('数字识别失败，请调整镜头距离和光线后重试');
    } finally {
      setOcrLoading(false);
    }
  };

  // 绑定快捷键：F2 触发 OCR 数字识别（数字补救），二维码快照识别改为自动定时执行
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

  // 定时自动执行二维码快照识别（1 秒一次），用于补救颜色反转等特殊二维码
  useEffect(() => {
    if (!visible) return;

    const intervalId = setInterval(() => {
      // 避免在加载中/初始化中重复触发
      if (!qrSnapshotLoading && !loading) {
        handleQrSnapshotRecognize();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [visible, qrSnapshotLoading, loading]);

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

        {/* 二维码快照预览：原始帧 & 反色帧 */}
        {(qrPreview || qrPreviewInverted) && (
          <div style={{ 
            marginTop: 16, 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 16,
            flexWrap: 'wrap'
          }}>
            {qrPreview && (
              <div>
                <p style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>原始帧</p>
                <img 
                  src={qrPreview} 
                  alt="原始二维码快照" 
                  style={{ maxWidth: 200, maxHeight: 200, borderRadius: 4, border: '1px solid #d9d9d9' }}
                />
              </div>
            )}
            {qrPreviewInverted && (
              <div>
                <p style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>反色帧</p>
                <img 
                  src={qrPreviewInverted} 
                  alt="反色二维码快照" 
                  style={{ maxWidth: 200, maxHeight: 200, borderRadius: 4, border: '1px solid #d9d9d9' }}
                />
              </div>
            )}
          </div>
        )}

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
