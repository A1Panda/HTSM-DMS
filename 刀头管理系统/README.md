# 🔧 刀头管理系统

基于现代Web技术栈构建的专业刀头库存管理系统，提供完整的刀头生命周期管理解决方案。

## 📋 系统概述

### 核心功能
- **智能库存管理**: 入库、出库、盘点、调拨
- **使用跟踪**: 实时使用状态监控和历史记录
- **磨损管理**: 磨损等级评估和寿命预测
- **维护管理**: 维护计划、记录和成本管理
- **质量跟踪**: 加工质量评估和供应商管理
- **数据分析**: 多维度报表和趋势分析

### 技术架构
- **前端**: React 18 + Ant Design + Chart.js
- **后端**: Node.js + Express
- **数据存储**: JSON文件存储 (可扩展MongoDB)
- **扫码功能**: html5-qrcode
- **报表导出**: XLSX + file-saver

## 🚀 快速开始

### 环境要求
- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装和运行

#### 1. 克隆项目
```bash
git clone <repository-url>
cd 刀头管理系统
```

#### 2. 安装依赖
```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

#### 3. 启动服务

**方式一：使用脚本文件**
```bash
# Windows用户
start-server.bat    # 启动后端服务
start-client.bat    # 启动前端服务
```

**方式二：手动启动**
```bash
# 启动后端服务 (端口 3001)
cd server
npm start

# 启动前端服务 (端口 3000)
cd client
npm start
```

#### 4. 访问系统
- 前端地址: http://localhost:3000
- 后端API: http://localhost:3001

## 📊 功能模块

### 1. 仪表盘 (Dashboard)
- 实时库存统计和预警
- 使用效率和成本分析图表
- 最近活动记录
- 快速操作入口

### 2. 刀头管理 (Tool Head Management)
- 刀头信息增删改查
- 二维码生成和扫码识别
- 批量导入导出
- 图片管理

### 3. 库存管理 (Inventory Management)
- 入库/出库流程管理
- 库存盘点和调拨
- 安全库存预警
- ABC分类管理

### 4. 使用跟踪 (Usage Tracking)
- 使用记录管理
- 设备分配跟踪
- 磨损状态监控
- 操作员使用统计

### 5. 维护管理 (Maintenance Management)
- 维护计划制定
- 维护记录管理
- 成本统计分析
- 外包服务管理

### 6. 报表分析 (Reports & Analytics)
- 多维度统计报表
- 成本效益分析
- 趋势预测
- 供应商评估

## 🔧 系统配置

### 后端配置
配置文件位置: `server/src/config/index.js`

```javascript
module.exports = {
  port: 3001,
  cors: {
    origin: 'http://localhost:3000'
  },
  storage: {
    type: 'file', // 'file' or 'mongodb'
    dataPath: './data'
  }
};
```

### 前端配置
配置文件位置: `client/src/config/index.js`

```javascript
export default {
  api: {
    baseURL: 'http://localhost:3001/api'
  },
  scanner: {
    fps: 10,
    qrbox: { width: 250, height: 250 }
  }
};
```

## 📱 功能特性

### 核心特性
- ✅ 响应式设计，支持各种设备
- ✅ 二维码扫码功能
- ✅ 实时数据更新
- ✅ Excel批量导入导出
- ✅ 图片上传和管理
- ✅ 高级搜索和筛选
- ✅ 数据可视化图表

### 高级特性
- 🔄 自动备份机制
- 📊 预测性分析
- 🔔 智能提醒系统
- 📱 移动端适配
- 🔐 数据安全保护
- 🌐 多语言支持(计划中)

## 🗂️ 项目结构

```
刀头管理系统/
├── client/                 # 前端项目
│   ├── public/
│   ├── src/
│   │   ├── components/     # 可复用组件
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API服务
│   │   ├── utils/         # 工具函数
│   │   ├── config/        # 配置文件
│   │   └── styles/        # 样式文件
│   └── package.json
├── server/                # 后端项目
│   ├── src/
│   │   ├── controllers/   # 控制器
│   │   ├── models/        # 数据模型
│   │   ├── routes/        # 路由定义
│   │   ├── middleware/    # 中间件
│   │   ├── services/      # 业务服务
│   │   └── config/        # 配置文件
│   └── package.json
├── data/                  # 数据存储目录
├── docs/                  # 文档目录
└── README.md
```

## 🛠️ API接口

### 刀头管理
- `GET /api/toolheads` - 获取刀头列表
- `POST /api/toolheads` - 创建刀头
- `PUT /api/toolheads/:id` - 更新刀头
- `DELETE /api/toolheads/:id` - 删除刀头

### 库存管理
- `GET /api/inventory` - 获取库存信息
- `POST /api/inventory/in` - 入库操作
- `POST /api/inventory/out` - 出库操作
- `POST /api/inventory/transfer` - 调拨操作

### 使用记录
- `GET /api/usage` - 获取使用记录
- `POST /api/usage` - 创建使用记录
- `PUT /api/usage/:id` - 更新使用记录

### 统计分析
- `GET /api/stats/dashboard` - 仪表盘统计
- `GET /api/stats/usage` - 使用统计
- `GET /api/stats/cost` - 成本分析

## 🔍 故障排查

### 常见问题

#### 1. 端口占用问题
```bash
# 检查端口占用
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# 结束占用进程
taskkill /PID <进程ID> /F
```

#### 2. 依赖安装失败
```bash
# 清除npm缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules
npm install
```

#### 3. 扫码功能异常
- 检查浏览器摄像头权限
- 确认使用HTTPS或localhost
- 检查摄像头设备是否正常

#### 4. 数据文件权限问题
- 确保data目录有读写权限
- 检查磁盘空间是否充足

## 📈 性能优化

### 前端优化
- 代码分割和懒加载
- 图片压缩和懒加载
- 组件缓存优化
- 请求防抖处理

### 后端优化
- 数据查询优化
- 内存缓存机制
- 文件IO优化
- 接口响应压缩

## 🔒 安全性

### 数据安全
- 输入数据验证
- SQL注入防护
- XSS攻击防护
- 文件上传安全

### 访问控制
- 用户认证机制
- 角色权限管理
- 操作日志记录
- 敏感数据加密

## 🤝 贡献指南

### 开发流程
1. Fork项目到个人仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

### 代码规范
- 使用ESLint进行代码检查
- 遵循现有代码风格
- 添加必要的注释
- 确保测试覆盖率

## 📝 更新日志

### v1.0.0 (2024-09-29)
- ✨ 初始版本发布
- ✅ 基础刀头管理功能
- ✅ 库存管理系统
- ✅ 使用跟踪功能
- ✅ 基础报表功能

## 📞 支持与反馈

### 技术支持
- 📧 邮箱: support@toolmanagement.com
- 💬 QQ群: 123456789
- 📱 微信: toolmanagement

### 问题反馈
- 🐛 Bug报告: [GitHub Issues](https://github.com/your-repo/issues)
- 💡 功能建议: [GitHub Discussions](https://github.com/your-repo/discussions)
- 📖 文档问题: [GitHub Wiki](https://github.com/your-repo/wiki)

## 📄 许可证

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件

---

**刀头管理系统** - 让刀头管理更智能、更高效！ 🚀
