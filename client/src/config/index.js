/**
 * 系统配置
 */
const config = {
  // API配置
  api: {
    // API基础URL
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
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
    qrbox: { width: 250, height: 250 },
    // 记住上次使用的摄像头
    rememberLastUsedCamera: true
  },
  
  // 公司信息
  company: {
    // 公司名称
    name: '航天石墨有限公司',
    // 系统名称
    systemName: '产品编码管理系统',
    // 版本号
    version: '1.0.0'
  }
};

export default config;