/**
 * 系统配置
 */
const config = {
  // API配置
  api: {
    // API基础URL
    // 生产环境(production)下直接使用 /api (相对路径)，这样会自动匹配当前域名和端口
    // 开发环境(development)下优先使用环境变量，否则默认为 http://localhost:5000/api
    baseURL: process.env.NODE_ENV === 'production'
      ? '/api'
      : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api'),
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
    // 扫码器FPS（适当提高帧率，加快识别速度）
    fps: 15,
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
  
  // OCR 配置（后端代理到第三方服务，例如讯飞）
  ocr: {
    // 直接调用本项目后端的 OCR 接口
    // 生产环境使用相对路径
    proxyUrl: process.env.NODE_ENV === 'production'
      ? '/api/ocr/iflytek'
      : (process.env.REACT_APP_BACKEND_TARGET 
          ? `${process.env.REACT_APP_BACKEND_TARGET}/api/ocr/iflytek` 
          : 'http://localhost:5000/api/ocr/iflytek')
  },
  
  // 二维码识别配置（后端代理到第三方服务 2dcode.biz）
  qrDecode: {
    // 直接调用本项目后端的二维码识别接口
    // 生产环境使用相对路径
    proxyUrl: process.env.NODE_ENV === 'production'
      ? '/api/qr/decode'
      : (process.env.REACT_APP_BACKEND_TARGET 
          ? `${process.env.REACT_APP_BACKEND_TARGET}/api/qr/decode` 
          : 'http://localhost:5000/api/qr/decode')
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
