const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5100',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api'  // 保留/api前缀
      }
    })
  );
};