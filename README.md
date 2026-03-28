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

## 文档

- [技术架构](./TECHNICAL_ARCHITECTURE.md)
- [开发计划](./DEVELOPMENT_PLAN.md)
- [任务分解](./开发任务分解.md)

## License

MIT
