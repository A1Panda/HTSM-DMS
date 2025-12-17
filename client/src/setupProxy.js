const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const target = process.env.REACT_APP_BACKEND_TARGET || 'http://localhost:5100';
  
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