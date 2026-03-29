# Trae 手机端 APP

通过手机远程控制电脑端的 Trae IDE，实现 AI 对话、终端命令、任务管理和文件浏览等功能。

## 项目结构

```
.
├── server/          # 服务端（电脑端）
│   ├── src/
│   │   ├── websocket/     # WebSocket 服务
│   │   ├── api/           # REST API
│   │   ├── services/      # 业务服务
│   │   ├── models/        # 数据模型
│   │   ├── state/         # 状态管理
│   │   └── utils/         # 工具函数
│   ├── tests/       # 测试文件
│   └── config/      # 配置文件
│
├── client/          # 客户端（手机端）
│   ├── src/
│   │   ├── components/    # 组件
│   │   ├── screens/       # 页面
│   │   ├── navigation/    # 导航
│   │   ├── services/      # 服务
│   │   ├── state/         # 状态管理
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── utils/         # 工具函数
│   │   └── constants/     # 常量
│   ├── android/     # Android 原生代码
│   └── ios/         # iOS 原生代码
│
└── docs/            # 文档
    ├── data-models.md
    ├── websocket-protocol.md
    ├── rest-api.md
    ├── authentication.md
    └── error-handling.md
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- React Native 开发环境
- Android Studio / Xcode

### 安装依赖

```bash
# 安装所有依赖
npm run postinstall

# 或分别安装
cd server && npm install
cd ../client && npm install
```

### 环境配置

**服务端需要设置以下环境变量：**

```bash
# Windows (PowerShell)
$env:JWT_SECRET="your-secure-jwt-secret-key"
$env:JWT_REFRESH_SECRET="your-secure-refresh-secret-key"
$env:REDIS_URL="redis://localhost:6379"  # Redis连接地址

# macOS/Linux (bash)
export JWT_SECRET="your-secure-jwt-secret-key"
export JWT_REFRESH_SECRET="your-secure-refresh-secret-key"
export REDIS_URL="redis://localhost:6379"  # Redis连接地址
```

**建议：**
- 使用强随机密钥（至少32字符）
- 生产环境中使用环境变量管理工具
- 不要硬编码密钥到代码中
- 生产环境中使用Redis集群或哨兵模式确保高可用性

### 启动开发服务器

```bash
# 启动服务端
cd server
npm run dev

# 启动客户端（Android）
cd client
npm run android

# 启动客户端（iOS）
cd client
npm run ios
```

## 技术栈

### 服务端
- Node.js + TypeScript
- WebSocket (ws)
- Express
- SQLite
- node-pty (终端)
- chokidar (文件监听)

### 客户端
- React Native + TypeScript
- Redux Toolkit (状态管理)
- React Navigation
- WebSocket
- MMKV (存储)

## 开发规范

- 使用 TypeScript 进行类型检查
- 使用 ESLint + Prettier 进行代码格式化
- 使用 Git 进行版本控制
- 遵循 Conventional Commits 规范

## 开发进度

### 第一阶段：MVP 核心功能 ✅ 已完成
- ✅ WebSocket 服务端基础
- ✅ 基础认证与设备配对
- ✅ WebSocket 客户端基础
- ✅ 对话界面 UI 框架
- ✅ 对话功能集成（服务端）
- ✅ 对话功能集成（客户端）
- ✅ 通知推送基础
- ✅ 项目文件浏览（服务端）
- ✅ 文件监听与实时同步（服务端）
- ✅ 项目文件浏览（客户端）
- ✅ 第一阶段集成测试（24个测试用例全部通过）

**测试报告**: [第一阶段集成测试报告](./docs/phase1-integration-test-report.md)

### 第二阶段：增强功能 🚧 待开发
- 任务管理服务端
- 任务管理客户端
- 终端服务端
- 终端客户端
- 快捷指令
- 状态同步机制

## 文档

- [技术架构](./TECHNICAL_ARCHITECTURE.md)
- [开发计划](./DEVELOPMENT_PLAN.md)
- [任务分解](./开发任务分解.md)
- [第一阶段集成测试报告](./docs/phase1-integration-test-report.md)

## 测试

### 运行集成测试

```bash
# 设置环境变量
$env:JWT_SECRET="your-jwt-secret"
$env:JWT_REFRESH_SECRET="your-jwt-refresh-secret"

# 运行第一阶段集成测试
cd server
npm test -- --testPathPattern="phase1.integration.test.ts" --forceExit --coverage
```

## License

MIT
