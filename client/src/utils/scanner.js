import { Html5QrcodeScanner } from 'html5-qrcode';
import config from '../config';

/**
 * 扫码工具类
 */
class Scanner {
  constructor(elementId, options = {}) {
    this.elementId = elementId;
    this.options = {
      ...config.scanner,
      ...options
    };
    this.scanner = null;
    this.onScanSuccess = null;
    this.onScanError = null;
  }

  /**
   * 初始化扫码器
   * @param {Function} onSuccess 扫描成功回调
   * @param {Function} onError 扫描错误回调
   */
  init(onSuccess, onError) {
    if (this.scanner) {
      return;
    }

    // 检查DOM元素是否存在
    const element = document.getElementById(this.elementId);
    if (!element) {
      const error = `找不到ID为 "${this.elementId}" 的DOM元素`;
      console.error(error);
      if (onError) onError(new Error(error));
      return;
    }

    this.onScanSuccess = onSuccess;
    this.onScanError = onError || (() => {});

    try {
      this.scanner = new Html5QrcodeScanner(
        this.elementId,
        {
          fps: this.options.fps || 10,
          qrbox: this.options.qrbox || { width: 250, height: 250 },
          rememberLastUsedCamera: this.options.rememberLastUsedCamera || true
        }
      );

      this.scanner.render(
        (decodedText) => {
          if (this.onScanSuccess) {
            this.onScanSuccess(decodedText);
          }
        },
        (error) => {
          // 只记录非常见的错误
          if (!error.includes('NotFoundException') && !error.includes('No MultiFormat Readers')) {
            console.warn('扫描错误:', error);
          }
          if (this.onScanError) {
            this.onScanError(error);
          }
        }
      );
    } catch (error) {
      console.error('初始化扫码器失败:', error);
      if (this.onScanError) {
        this.onScanError(error);
      }
    }
  }

  /**
   * 暂停扫描
   */
  pause() {
    if (this.scanner) {
      this.scanner.pause();
    }
  }

  /**
   * 恢复扫描
   */
  resume() {
    if (this.scanner) {
      this.scanner.resume();
    }
  }

  /**
   * 清理扫码器
   */
  clear() {
    if (this.scanner) {
      try {
        this.scanner.clear();
      } catch (error) {
        console.warn('清理扫码器时出现警告:', error);
      }
      this.scanner = null;
      this.onScanSuccess = null;
      this.onScanError = null;
    }
  }
}

export default Scanner;