import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Tag, Spin, message, Switch, Space } from 'antd';
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
  const [enableInvertedApi, setEnableInvertedApi] = useState(false); // 控制是否启用反色帧 API 调用
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);
  const lastScanRef = useRef({ code: '', time: 0 });
  const lastNoticeRef = useRef({ message: '', time: 0 });

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
                  }, 80);
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
      
      // 缩短等待时间，让扫码器更快可用
      timeoutId = setTimeout(initScanner, 250);
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

  // 统一的节流提示：同一条提示在短时间内只弹一次，避免刷屏
  const showThrottledWarning = (msg, interval = 3000) => {
    const now = Date.now();
    if (
      lastNoticeRef.current.message === msg &&
      now - lastNoticeRef.current.time < interval
    ) {
      return;
    }
    lastNoticeRef.current = { message: msg, time: now };
    message.warning(msg);
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

      const scannerElement = document.getElementById('scanner');
      if (!scannerElement) {
        const msg = '找不到扫码区域，请关闭后重试';
        setError(msg);
        setQrSnapshotLoading(false);
        return;
      }

      const video = scannerElement.querySelector('video');
      if (!video) {
        const msg = '未检测到摄像头画面，请确认摄像头已启动';
        setError(msg);
        setQrSnapshotLoading(false);
        return;
      }

      const canvas = document.createElement('canvas');
      const width = video.videoWidth;
      const height = video.videoHeight;

      // 有些浏览器在视频刚开始时 videoWidth/videoHeight 为 0，需要等一帧
      if (!width || !height) {
        showThrottledWarning('摄像头画面尚未就绪，请稍等一两秒后再尝试快照识别');
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
      let originalBase64 = null;
      try {
        originalBase64 = canvas.toDataURL('image/png');
        setQrPreview(originalBase64);
      } catch (err) {
        // 生成预览失败不影响识别，静默忽略
      }

      // 生成反色预览图：对像素做一次真正的反色处理（用于 UI 预览和第三方 API 识别）
      let invertedBase64 = null;
      try {
        const invertedData = new Uint8ClampedArray(imageData.data);
        for (let i = 0; i < invertedData.length; i += 4) {
          invertedData[i] = 255 - invertedData[i];       // R
          invertedData[i + 1] = 255 - invertedData[i+1]; // G
          invertedData[i + 2] = 255 - invertedData[i+2]; // B
        }
        const invertedImageData = new ImageData(invertedData, width, height);
        const invertCanvas = document.createElement('canvas');
        invertCanvas.width = width;
        invertCanvas.height = height;
        const invertCtx = invertCanvas.getContext('2d');
        invertCtx.putImageData(invertedImageData, 0, 0);
        invertedBase64 = invertCanvas.toDataURL('image/png');
        setQrPreviewInverted(invertedBase64);
      } catch (err) {
        // 生成预览失败不影响识别，静默忽略
      }

      // 参考 Android 端 zbar/zxing 的做法，直接在同一次解析中同时尝试正色和反色二维码，
      // 减少多次解码带来的延迟
      let result = jsQR(imageData.data, width, height, {
        inversionAttempts: 'attemptBoth'
      });

      // 如果 jsQR 识别失败，尝试使用后端第三方 API（先尝试原始帧，失败后再尝试反色帧）
      if (!result || !result.data) {
        // 先尝试原始帧
        if (originalBase64) {
          try {
            const response = await fetch(config.qrDecode.proxyUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                imageBase64: originalBase64
              })
            });

            const apiResult = await response.json();
            const contents = apiResult.contents || [];

            if (contents && contents.length > 0) {
              // 取第一个识别到的内容
              const decoded = String(contents[0]).trim();
              const cleanedDecoded = decoded.replace(/\D/g, '');
              
              if (cleanedDecoded) {
                // 与连续扫描逻辑保持一致：对同一编码做节流
                const now = Date.now();
                if (
                  lastScanRef.current.code === cleanedDecoded &&
                  now - lastScanRef.current.time < 1500
                ) {
                  setQrSnapshotLoading(false);
                  return;
                }
                lastScanRef.current = { code: cleanedDecoded, time: now };

                setScanResult(cleanedDecoded);
                if (onScan) {
                  onScan(cleanedDecoded);
                }
                setQrSnapshotLoading(false);
                return;
              }
            }

            // 原始帧识别失败，尝试反色帧（仅在开关启用时）
            if (invertedBase64 && enableInvertedApi) {
              try {
                const invertedResponse = await fetch(config.qrDecode.proxyUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    imageBase64: invertedBase64
                  })
                });

                const invertedResult = await invertedResponse.json();
                const invertedContents = invertedResult.contents || [];

                if (invertedContents && invertedContents.length > 0) {
                  const decoded = String(invertedContents[0]).trim();
                  const cleanedDecoded = decoded.replace(/\D/g, '');
                  
                  if (cleanedDecoded) {
                    // 与连续扫描逻辑保持一致：对同一编码做节流
                    const now = Date.now();
                    if (
                      lastScanRef.current.code === cleanedDecoded &&
                      now - lastScanRef.current.time < 1500
                    ) {
                      setQrSnapshotLoading(false);
                      return;
                    }
                    lastScanRef.current = { code: cleanedDecoded, time: now };

                    setScanResult(cleanedDecoded);
                    if (onScan) {
                      onScan(cleanedDecoded);
                    }
                    setQrSnapshotLoading(false);
                    return;
                  }
                }
              } catch (invertedErr) {
                // 反色帧 API 调用失败，静默失败
                console.warn('[QR-SNAPSHOT] 反色帧第三方 API 识别失败:', invertedErr);
              }
            }
          } catch (apiErr) {
            // 原始帧 API 调用失败，静默失败，不影响正常流程
            console.warn('[QR-SNAPSHOT] 原始帧第三方 API 识别失败:', apiErr);
          }
        }
        
        setQrSnapshotLoading(false);
        return;
      }

      const decoded = result.data.trim();
      const cleanedDecoded = decoded.replace(/\D/g, '');
      if (!cleanedDecoded) {
        showThrottledWarning('二维码内容为空或无法解析出数字');
        setQrSnapshotLoading(false);
        return;
      }

      // 与连续扫描逻辑保持一致：对同一编码做节流，避免在短时间内重复触发 onScan
      const now = Date.now();
      if (
        lastScanRef.current.code === cleanedDecoded &&
        now - lastScanRef.current.time < 1500
      ) {
        setQrSnapshotLoading(false);
        return;
      }
      lastScanRef.current = { code: cleanedDecoded, time: now };

      setScanResult(cleanedDecoded);

      if (onScan) {
        onScan(cleanedDecoded);
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
        showThrottledWarning('未能识别出清晰的数字，请靠近一些或调整光线后重试');
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
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <span style={{ fontSize: 12, color: '#666' }}>启用反色帧识别:</span>
            <Switch 
              checked={enableInvertedApi}
              onChange={setEnableInvertedApi}
              size="small"
            />
          </Space>
          <Space>
            <Button onClick={handleCancel}>
              关闭
            </Button>
            <Button 
              onClick={handleOcrRecognizeDigits} 
              loading={ocrLoading}
            >
              OCR数字识别
            </Button>
            {!continuous && scanResult && (
              <Button onClick={handleRescan}>
                重新扫描
              </Button>
            )}
            {!continuous && (
              <Button 
                type="primary" 
                disabled={!scanResult} 
                onClick={handleUseScanResult}
              >
                使用扫描结果
              </Button>
            )}
          </Space>
        </Space>
      }
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
