/**
 * 系统配置
 */
const config = {
  // API配置
  api: {
    // API基础URL
    baseURL: process.env.REACT_APP_API_URL || (process.env.REACT_APP_BACKEND_TARGET ? `${process.env.REACT_APP_BACKEND_TARGET}/api` : 'http://localhost:5100/api'),
    // 请求超时时间（毫秒）
    timeout: 10000
  },
  
  // UI配置
  ui: {
    // 默认显示的编码数量
    defaultDisplayCodeCount: 3,
    // 提示框最大高度
    tooltipMaxHeight: '300px',
    // 提示框网格列数
    tooltipGridColumns: 2,
    // 每页显示的产品数量
    productsPerPage: 12
  },
  
  // 扫码配置
  scanner: {
    // 扫码器FPS
    fps: 10,
    // 扫码框大小
    qrbox: { width: 350, height: 350 },
    // 记住上次使用的摄像头
    rememberLastUsedCamera: true,
    aspectRatio: 1.3333,
    showTorchButtonIfSupported: true,
    // 优先使用后置摄像头和较高清分辨率，提升金属二维码识别率
    videoConstraints: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    // 如果浏览器支持 BarcodeDetector，则启用以提高识别成功率
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true
    }
  },
  
  // OCR 配置（LuckyCola 第三方服务）
  ocr: {
    // 建议通过环境变量配置，避免把密钥写死在代码里
    appKey: process.env.REACT_APP_LUCKYCOLA_APPKEY || '',
    uid: process.env.REACT_APP_LUCKYCOLA_UID || '',
    // LuckyCola OCR 接口地址
    baseUrl: 'https://luckycola.com.cn/openOcr/baseOCR'
  },
  
  // 公司信息
  company: {
    // 公司名称
    name: '航天石墨有限公司 By:A1_Panda',
    // 系统名称
    systemName: '产品编码管理系统',
    // 版本号
    version: '1.0.0'
  }
};

export default config;
