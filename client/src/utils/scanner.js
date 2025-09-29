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

    this.onScanSuccess = onSuccess;
    this.onScanError = onError || (() => {});

    try {
      this.scanner = new Html5QrcodeScanner(
        this.elementId,
        this.options
      );

      this.scanner.render(
        (decodedText) => {
          if (this.onScanSuccess) {
            this.onScanSuccess(decodedText);
          }
        },
        (error) => {
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
      this.scanner.clear();
      this.scanner = null;
    }
  }
}

export default Scanner;