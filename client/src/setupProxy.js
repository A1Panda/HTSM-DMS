const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // 默认为本项目后端端口 5000，可通过 REACT_APP_BACKEND_TARGET 覆盖
  const target = process.env.REACT_APP_BACKEND_TARGET || 'http://localhost:5000';
  
  app.use(
    '/api',
    createProxyMiddleware({
      target: target,
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api'  // 保留/api前缀
      }
    })
  );
};