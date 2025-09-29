import axios from 'axios';
import config from '../config';

// 创建axios实例
const api = axios.create({
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证信息等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 处理错误响应
    if (error.response) {
      // 服务器返回了错误状态码
      console.error('API错误:', error.response.status, error.response.data);
    } else if (error.request) {
      // 请求已发送但没有收到响应
      console.error('API请求无响应:', error.request);
    } else {
      // 请求配置出错
      console.error('API请求配置错误:', error.message);
    }
    return Promise.reject(error);
  }
);

// 产品相关API
export const productAPI = {
  // 获取所有产品
  getAllProducts: () => api.get('/products'),
  
  // 获取单个产品
  getProductById: (id) => api.get(`/products/${id}`),
  
  // 创建新产品
  createProduct: (productData) => api.post('/products', productData),
  
  // 删除产品
  deleteProduct: (id) => api.delete(`/products/${id}`)
};

// 编码相关API
export const codeAPI = {
  // 获取所有编码（带分页）
  getAllCodes: (page = 1, limit = 1000, productId = null) => {
    let url = `/codes?page=${page}&limit=${limit}`;
    if (productId) url += `&productId=${productId}`;
    return api.get(url);
  },
  
  // 获取产品的所有编码
  getProductCodes: (productId) => api.get(`/codes/product/${productId}`),
  
  // 为产品添加编码
  addCode: (productId, codeData) => api.post(`/codes/product/${productId}`, codeData),
  
  // 删除编码
  deleteCode: (productId, codeId) => api.delete(`/codes/product/${productId}/${codeId}`)
};

// 统计相关API
export const statsAPI = {
  // 获取统计数据
  getStats: () => api.get('/stats'),
  
  // 获取最近7天活动数据
  getActivityData: () => api.get('/stats/activity')
};

export default {
  product: productAPI,
  code: codeAPI,
  stats: statsAPI
};