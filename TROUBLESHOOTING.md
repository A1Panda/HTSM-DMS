# 故障排除指南

## React 开发服务器问题

### 问题：allowedHosts 配置错误

**错误信息**：
```
Invalid options object. Dev Server has been initialized using an options object that does not match the API schema. 
  - options.allowedHosts[0] should be a non-empty string.
```

**解决方案**：

1. **方法一：使用环境变量**

   在 `start-client.bat` 中添加以下环境变量：
   ```batch
   set DANGEROUSLY_DISABLE_HOST_CHECK=true
   set WDS_SOCKET_HOST=localhost
   set WDS_SOCKET_PORT=0
   ```

2. **方法二：创建 .env 文件**

   在 `client` 目录下创建 `.env` 或 `.env.development` 文件，添加以下内容：
   ```
   DANGEROUSLY_DISABLE_HOST_CHECK=true
   WDS_SOCKET_HOST=localhost
   WDS_SOCKET_PORT=0
   ```

3. **方法三：使用 setupProxy.js**

   在 `client/src` 目录下创建 `setupProxy.js` 文件：
   ```javascript
   const { createProxyMiddleware } = require('http-proxy-middleware');

   module.exports = function(app) {
     app.use(
       '/api',
       createProxyMiddleware({
         target: 'http://localhost:5000',
         changeOrigin: true,
       })
     );
   };
   ```
   
   并安装所需依赖：
   ```
   npm install --save http-proxy-middleware
   ```

### 问题：缺少依赖

**错误信息**：
```
ERROR in ./src/components/CodeForm.js 8:0-28 
Module not found: Error: Can't resolve 'moment' in 'D:\Users\A1_Pa\Desktop\产品编码管理系统\client\src\components'
```

**解决方案**：

1. 安装缺少的依赖：
   ```
   cd client
   npm install --save moment
   ```

2. 或者修改代码，使用 dayjs 替代 moment（Ant Design 推荐）：
   ```
   cd client
   npm install --save dayjs
   ```
   
   然后修改相关组件中的代码，将 moment 替换为 dayjs。

### 问题：前端无法连接到后端API

**错误信息**：
```
GET http://localhost:3001/api/products 404 (Not Found)
AxiosError {message: 'Request failed with status code 404', name: 'AxiosError', code: 'ERR_BAD_REQUEST', ...}
```

**解决方案**：

1. **确保后端服务器正在运行**：
   ```
   cd server
   npm run dev
   ```
   
   确认服务器正在监听 5000 端口：`服务器运行在 http://localhost:5000`

2. **修改前端API配置**：
   
   在 `client/.env` 文件中添加：
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   PORT=3001
   ```
   
   在 `client/src/config/index.js` 中修改：
   ```javascript
   api: {
     // API基础URL
     baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
     // 请求超时时间（毫秒）
     timeout: 10000
   }
   ```

3. **更新代理配置**：
   
   在 `client/src/setupProxy.js` 中确保正确配置：
   ```javascript
   app.use(
     '/api',
     createProxyMiddleware({
       target: 'http://localhost:5000',
       changeOrigin: true,
       pathRewrite: {
         '^/api': '/api'  // 保留/api前缀
       }
     })
   );
   ```

4. **检查端口占用**：
   
   如果 5000 端口已被占用，可以使用以下命令查找并终止占用进程：
   ```
   netstat -ano | findstr :5000
   taskkill /PID <进程ID> /F
   ```

## 后端服务器问题

### 问题：端口已被占用

**错误信息**：
```
Error: listen EADDRINUSE: address already in use :::5000
```

**解决方案**：

1. 找到并关闭占用端口的进程：
   ```
   netstat -ano | findstr :5000
   taskkill /PID <进程ID> /F
   ```

2. 或者修改服务器端口：
   在 `server/.env` 文件中修改 PORT 值：
   ```
   PORT=5001
   ```
   
   同时更新前端代理配置中的端口号。

## 数据存储问题

### 问题：无法访问数据文件

**错误信息**：
```
Error: EACCES: permission denied, open 'data/products.json'
```

**解决方案**：

1. 确保 `data` 目录存在且有正确的权限：
   ```
   mkdir data
   ```

2. 检查文件权限，确保应用有读写权限。

## 其他常见问题

### 问题：依赖安装失败

**解决方案**：

1. 清除 npm 缓存：
   ```
   npm cache clean --force
   ```

2. 删除 node_modules 目录并重新安装：
   ```
   rd /s /q node_modules
   npm install
   ```

### 问题：前后端连接失败

**解决方案**：

1. 确保后端服务器正在运行
2. 检查前端代理配置是否正确
3. 检查网络连接和防火墙设置