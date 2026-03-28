# Trae 手机端 APP 技术架构文档

## 1. 项目背景与目标

Trae 是一款面向开发者的 AI 辅助编程工具。为进一步提升移动场景下的开发体验，需开发一款手机端 APP，实现：

- **遥控器功能**：通过手机发送 AI 对话、开发任务、终端命令，所有指令在电脑端执行。
- **显示器功能**：在手机上实时查看项目文件、代码内容、终端输出、任务进度、日志及测试结果。
- **同步与通知**：对话、状态、文件变更等多端实时同步，关键事件主动推送通知。

**核心原则**：电脑端为服务端（执行环境），手机端为客户端（仅交互与展示），所有敏感计算与文件操作均不落地手机。

---

## 2. 开源项目参考

在设计和实现过程中，参考了以下优秀开源项目：

| 项目名称 | Stars | 技术栈 | 参考内容 | 相关章节 |
|---------|-------|--------|---------|---------|
| [Flutter Server Box](https://github.com/lollipopkit/flutter_server_box) | 5k+ | Flutter | SSH终端渲染、SFTP文件管理、虚拟列表 | 4.3, 7.2, 9 |
| [AIdea](https://github.com/mylxsw/aidea) | 3k+ | Flutter | AI对话UI、消息缓存策略、Markdown渲染 | 3.1, 7.2 |
| [ChatGPT-Next-Web](https://github.com/ChatGPTNextWeb/ChatGPT-Next-Web) | 80k+ | React/TS | 流式输出、PWA支持、响应式设计 | 4.3, 5 |
| [code-server](https://github.com/coder/code-server) | 70k+ | TypeScript | WebSocket架构、终端集成、文件系统代理 | 4.1, 6.2 |
| [Termux](https://github.com/termux/termux-app) | 30k+ | C/Java | 终端模拟器实现、PTY管理 | 6.2 |

---

## 3. 用户角色与使用场景

| 场景 | 描述 |
|------|------|
| 远程开发 | 离开电脑时，通过手机查看构建进度、发送快捷指令、修改 AI 提示词。 |
| 代码审阅 | 在移动端快速浏览项目文件结构及代码，只读模式避免误操作。 |
| 任务监控 | 实时查看长耗时任务（测试、构建、部署）的日志与进度。 |
| 多设备协同 | 团队或跨设备场景下，统一对话历史与设置。 |

---

## 4. 核心功能详细说明

### 4.1 命令发送（遥控器）

| 功能 | 说明 | 开源参考 |
|------|------|---------|
| AI 对话 | 输入自然语言指令，经 WebSocket 发送至电脑端 AI 服务，接收回复并展示。支持 Markdown 渲染、流式输出。 | AIdea, ChatGPT-Next-Web |
| 任务管理 | 创建、暂停、继续、取消开发任务（如"运行所有测试"、"启动前端服务"），查看任务列表及状态。 | - |
| 快捷指令 | 预设常用指令（如"git push"、"npm run build"），一键发送到终端或 AI。支持自定义编辑。 | Server Box |
| 终端命令 | 手动输入任意终端命令，实时查看命令输出。支持多会话管理。 | Server Box, code-server |

### 4.2 状态查看（显示器）

| 功能 | 说明 | 开源参考 |
|------|------|---------|
| 项目预览 | 以目录树形式展示电脑端当前打开项目的文件结构，支持文件搜索与筛选。虚拟列表优化大目录。 | Server Box |
| 代码查看 | 点击文件后展示代码内容，仅只读，支持语法高亮、行号显示、横向滚动。 | code-server |
| 终端输出 | 实时滚动显示电脑端终端窗口的输出，支持多终端（如终端1、终端2）切换。ANSI颜色支持。 | Server Box, Termux |
| 任务进度 | 展示任务进度条、当前步骤、预计剩余时间等。 | - |
| 日志查看 | 查看开发日志（如构建日志、错误栈），支持按级别筛选。 | - |
| 测试结果 | 展示测试用例的执行结果（通过/失败），失败时显示错误详情。 | - |

### 4.3 通知推送（提醒）

- **任务通知**：任务开始、完成、等待人工许可（如需要确认的命令）。
- **错误提醒**：编译错误、测试失败、异常退出等。
- **重要事件**：服务器启动、文件变更过多、磁盘空间不足等。
- **自定义通知**：用户可配置哪些事件推送通知（如仅错误和完成）。
- **系统推送**：后台时通过 FCM/APNs 推送（参考 Server Box 保活策略）。

### 4.4 同步机制

| 同步类型 | 实现方式 | 开源参考 |
|----------|----------|---------|
| 对话同步 | 电脑端保存对话历史，手机端拉取历史 + 实时推送新消息。支持增量同步。 | ChatGPT-Next-Web |
| 状态同步 | 任务状态、终端会话、项目结构变更等通过 WebSocket 实时推送。断线重连后自动恢复。 | code-server |
| 文件同步 | 文件变更（增删改）仅推送通知，手机端按需拉取文件内容。大文件分块传输。 | Server Box |
| 设置同步 | 用户配置（如快捷指令、通知偏好）在电脑端存储，手机端自动拉取并缓存。 | - |

---

## 5. 技术架构设计

### 5.1 整体架构图

```
[手机端] (React Native)
    │
    │ WebSocket (JSON over TLS/WSS)
    │ HTTP/REST (文件内容、历史记录)
    ▼
[电脑端 Trae 服务]
    ├── WebSocket Server (消息推送与指令接收)
    │   ├── 连接管理器 (心跳、重连、房间管理)
    │   ├── 消息路由器 (参考 code-server 架构)
    │   └── 认证中间件 (Token验证)
    ├── HTTP API Server (RESTful)
    │   ├── 文件API (分块传输、流式响应)
    │   └── 认证API (配对、Token刷新)
    ├── File Watcher (监听项目文件)
    │   ├── chokidar 监听
    │   └── 防抖/节流处理器 (参考 Server Box)
    ├── Terminal Manager (管理终端会话)
    │   ├── node-pty 伪终端
    │   ├── 会话管理器
    │   └── 输出缓冲区 (批量推送)
    ├── Task Scheduler (执行开发任务)
    │   ├── 任务队列
    │   ├── 执行器
    │   └── 进度追踪器
    ├── AI Service (处理对话指令)
    │   ├── 流式响应处理器
    │   └── 上下文管理器
    └── Notification Service (聚合事件并推送到手机)
        ├── 事件聚合器
        └── 推送管理器 (FCM/APNs)
```

### 5.2 电脑端技术栈

| 组件 | 技术选型 | 开源参考 | 说明 |
|------|---------|---------|------|
| **语言** | Node.js (TypeScript) | code-server | 与 Trae 技术栈统一 |
| **WebSocket** | `ws` 库 + 自定义管理 | code-server | 比 Socket.IO 更轻量，可控性更高 |
| **HTTP 框架** | Express / Fastify | - | Fastify 性能更好，可选 |
| **文件监听** | chokidar | code-server | 业界标准 |
| **终端管理** | node-pty | code-server, Server Box | 伪终端实现 |
| **任务执行** | Bull Queue + child_process | - | 支持任务队列和并发控制 |
| **AI 服务** | 集成现有 Trae AI | AIdea | 通过 IPC 或 HTTP 调用 |
| **数据存储** | SQLite / LevelDB | ChatGPT-Next-Web | 轻量级本地存储 |

### 5.3 手机端技术栈

| 组件 | 技术选型 | 开源参考 | 说明 |
|------|---------|---------|------|
| **跨平台方案** | React Native (TypeScript) | - | 团队熟悉，生态丰富 |
| **状态管理** | Redux Toolkit + RTK Query | ChatGPT-Next-Web | 成熟稳定，支持异步逻辑 |
| **WebSocket 客户端** | 原生 WebSocket + 自定义封装 | ChatGPT-Next-Web | 轻量级，完全可控 |
| **本地存储** | AsyncStorage + MMKV | Server Box | MMKV 性能更好 |
| **推送通知** | React Native Firebase + APNs | Server Box | 后台保活策略 |
| **终端渲染** | 自定义组件 + ANSI解析 | Server Box | 参考 xterm.js 思路 |
| **Markdown渲染** | react-native-markdown-display | AIdea | 支持代码高亮 |
| **代码高亮** | react-native-syntax-highlighter | code-server | Prism.js 方案 |

### 5.4 通信协议

#### WebSocket 消息格式（参考 code-server 和 ChatGPT-Next-Web）

**手机 → 电脑**
```json
{
  "type": "command",
  "id": "uuid-v4",
  "timestamp": 1698123456789,
  "deviceId": "device-uuid",
  "payload": {
    "category": "ai_chat",
    "action": "send_message",
    "data": {
      "sessionId": "session-001",
      "message": "帮我生成一个React组件",
      "stream": true
    }
  }
}
```

**电脑 → 手机 (流式响应)**
```json
{
  "type": "event",
  "id": "uuid-v4",
  "timestamp": 1698123456790,
  "deviceId": "server",
  "payload": {
    "category": "dialog_response",
    "data": {
      "sessionId": "session-001",
      "messageId": "msg-002",
      "delta": "这是一个",
      "finish": false
    }
  }
}
```

**心跳机制（参考 Server Box）**
```json
// Client → Server (每 30 秒)
{ "type": "ping", "timestamp": 1698123456789 }

// Server → Client
{ "type": "pong", "timestamp": 1698123456790, "serverTime": 1698123456790 }
```

#### REST API 设计

| 端点 | 方法 | 说明 | 开源参考 |
|------|------|------|---------|
| `/api/project/tree` | GET | 获取当前项目目录树（带文件元信息） | Server Box |
| `/api/file/content` | GET | 获取文件内容，支持分块（大文件） | code-server |
| `/api/file/stream` | GET | 流式获取大文件内容 | Server Box |
| `/api/history/chat` | GET | 获取对话历史，支持分页 | ChatGPT-Next-Web |
| `/api/tasks` | GET/POST | 获取/创建任务 | - |
| `/api/settings` | GET/POST | 获取/更新用户设置 | - |
| `/api/pair/request` | POST | 生成配对码 | - |
| `/api/pair/confirm` | POST | 确认配对，获取Token | - |

---

## 6. 电脑端（服务端）架构

### 6.1 目录结构（优化版）

```
server/
├── src/
│   ├── websocket/              # WebSocket 服务
│   │   ├── server.ts           # WebSocket 服务器 (参考 code-server)
│   │   ├── connectionManager.ts # 连接管理器 (心跳、重连)
│   │   ├── messageRouter.ts    # 消息路由器
│   │   ├── handlers/           # 消息处理器
│   │   │   ├── chatHandler.ts
│   │   │   ├── terminalHandler.ts
│   │   │   ├── taskHandler.ts
│   │   │   └── fileHandler.ts
│   │   └── types.ts            # 消息类型定义
│   ├── api/                    # HTTP API
│   │   ├── routes/
│   │   │   ├── project.ts
│   │   │   ├── file.ts
│   │   │   ├── auth.ts
│   │   │   └── settings.ts
│   │   ├── controllers/
│   │   └── middleware/
│   │       ├── auth.ts         # Token验证
│   │       └── errorHandler.ts
│   ├── services/               # 业务服务层
│   │   ├── fileWatcher.ts      # 文件监听 (chokidar)
│   │   ├── terminalManager.ts  # 终端管理 (node-pty)
│   │   ├── taskScheduler.ts    # 任务调度
│   │   ├── aiService.ts        # AI服务集成
│   │   └── notificationService.ts
│   ├── models/                 # 数据模型
│   │   ├── types.ts
│   │   └── enums.ts
│   ├── store/                  # 数据存储
│   │   ├── chatStore.ts
│   │   ├── taskStore.ts
│   │   └── settingsStore.ts
│   ├── auth/                   # 认证服务
│   │   ├── pairing.ts          # 设备配对
│   │   ├── tokenManager.ts     # Token管理
│   │   └── deviceManager.ts    # 设备管理
│   ├── utils/                  # 工具函数
│   │   ├── logger.ts
│   │   ├── ansiParser.ts       # ANSI解析 (参考 Server Box)
│   │   └── validators.ts
│   └── index.ts                # 入口文件
├── tests/                      # 测试文件
├── config/
│   └── default.json
├── package.json
└── tsconfig.json
```

### 6.2 核心模块详细设计

#### WebSocket 服务器（参考 code-server）

```typescript
// 核心功能
class WebSocketServer {
  // 连接管理
  - connections: Map<deviceId, Connection>
  - rooms: Map<roomId, Set<deviceId>>
  
  // 核心方法
  + handleConnection(ws, req)
  + handleMessage(deviceId, message)
  + broadcast(event, payload, filter?)
  + sendToDevice(deviceId, message)
  + joinRoom(deviceId, roomId)
  + leaveRoom(deviceId, roomId)
  
  // 心跳管理
  + startHeartbeat()
  + checkConnectionHealth()
}
```

#### 终端管理模块（参考 Server Box + code-server）

```typescript
class TerminalManager {
  // 会话管理
  - sessions: Map<sessionId, TerminalSession>
  
  // 核心方法
  + createSession(name, cwd): TerminalSession
  + executeCommand(sessionId, command)
  + subscribe(sessionId, deviceId)  // 多设备订阅
  + unsubscribe(sessionId, deviceId)
  + killSession(sessionId)
  
  // 输出优化
  - outputBuffer: Map<sessionId, string[]>
  - flushInterval: number = 50ms  // 批量推送
}

class TerminalSession {
  - pty: IPty  // node-pty 实例
  - subscribers: Set<deviceId>
  - history: TerminalOutput[]
  - maxHistorySize: number = 10000
  
  + write(data)
  + resize(cols, rows)
  + onData(callback)
  + onExit(callback)
}
```

#### 文件监听模块（参考 Server Box）

```typescript
class FileWatcher {
  - watcher: FSWatcher
  - debounceMap: Map<path, timer>
  - debounceDelay: number = 100ms
  
  // 核心方法
  + watch(projectPath)
  + unwatch()
  + onChange(callback)
  
  // 防抖处理
  - handleFileChange(path, stats)
  - batchNotify(changes: FileChange[])
}
```

#### 任务调度模块

```typescript
class TaskScheduler {
  - queue: Bull.Queue
  - activeTasks: Map<taskId, Job>
  
  // 核心方法
  + createTask(name, command, options): Task
  + pauseTask(taskId)
  + resumeTask(taskId)
  + cancelTask(taskId)
  + getTaskStatus(taskId)
  
  // 进度追踪
  - onProgress(taskId, progress)
  - onLog(taskId, log)
  - onComplete(taskId, result)
}
```

---

## 7. 手机端（客户端）架构

### 7.1 目录结构（优化版）

```
client/
├── src/
│   ├── components/             # 通用组件
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Card.tsx
│   │   ├── chat/
│   │   │   ├── MessageBubble.tsx      # 参考 AIdea
│   │   │   ├── MessageList.tsx        # 虚拟列表
│   │   │   └── MessageInput.tsx
│   │   ├── terminal/
│   │   │   ├── Terminal.tsx           # 终端渲染
│   │   │   ├── TerminalOutput.tsx     # ANSI解析渲染
│   │   │   └── CommandInput.tsx
│   │   ├── file/
│   │   │   ├── FileTree.tsx           # 虚拟列表
│   │   │   ├── FileViewer.tsx         # 代码高亮
│   │   │   └── FileSearch.tsx
│   │   └── task/
│   │       ├── TaskCard.tsx
│   │       └── TaskProgress.tsx
│   ├── screens/                # 页面组件
│   │   ├── ChatScreen.tsx
│   │   ├── TasksScreen.tsx
│   │   ├── ProjectScreen.tsx
│   │   ├── TerminalScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── ScanScreen.tsx       # 二维码扫描
│   ├── navigation/             # 导航配置
│   │   └── AppNavigator.tsx
│   ├── services/               # 服务层
│   │   ├── websocket/
│   │   │   ├── WebSocketClient.ts     # 参考 ChatGPT-Next-Web
│   │   │   ├── reconnection.ts        # 重连策略
│   │   │   └── messageQueue.ts        # 离线消息队列
│   │   ├── api/
│   │   │   ├── client.ts              # Axios封装
│   │   │   └── endpoints.ts
│   │   ├── storage/
│   │   │   ├── AsyncStorageService.ts
│   │   │   └── MMKVService.ts         # 高性能存储
│   │   └── notification/
│   │       └── NotificationService.ts
│   ├── hooks/                  # 自定义 Hooks
│   │   ├── useWebSocket.ts
│   │   ├── useChat.ts
│   │   ├── useTerminal.ts
│   │   └── useSync.ts
│   ├── state/                  # 状态管理 (Redux Toolkit)
│   │   ├── store.ts
│   │   ├── slices/
│   │   │   ├── websocketSlice.ts
│   │   │   ├── chatSlice.ts
│   │   │   ├── terminalSlice.ts
│   │   │   ├── taskSlice.ts
│   │   │   ├── projectSlice.ts
│   │   │   └── settingsSlice.ts
│   │   └── thunks/
│   ├── utils/                  # 工具函数
│   │   ├── ansiParser.ts       # ANSI解析 (参考 Server Box)
│   │   ├── markdownRenderer.ts
│   │   ├── fileIcons.ts        # 文件图标映射
│   │   └── validators.ts
│   ├── constants/              # 常量定义
│   │   ├── colors.ts
│   │   ├── fonts.ts
│   │   └── config.ts
│   └── App.tsx
├── tests/
├── android/
├── ios/
├── package.json
└── tsconfig.json
```

### 7.2 核心组件设计

#### 终端组件（参考 Server Box + xterm.js 思路）

```typescript
// Terminal.tsx
interface TerminalProps {
  sessionId: string;
  onCommand: (command: string) => void;
}

// 核心功能
- 虚拟列表渲染输出 (react-native-virtualized-view)
- ANSI颜色代码解析和渲染
- 自动滚动到底部
- 支持横向滚动（长代码行）
- 手势支持（缩放、滚动）

// 性能优化
- 输出缓冲区限制（最多 10000 行）
- 批量更新（50ms 间隔）
- 仅渲染可见区域
```

#### 文件树组件（参考 Server Box）

```typescript
// FileTree.tsx
interface FileTreeProps {
  root: FileNode;
  onSelect: (node: FileNode) => void;
  searchQuery?: string;
}

// 核心功能
- 虚拟列表渲染大目录
- 懒加载子目录
- 展开/折叠状态管理
- 搜索过滤（前端实现）
- 文件图标根据扩展名显示

// 性能优化
- 只渲染可见节点
- 目录展开时异步加载子节点
- 缓存已加载的目录结构
```

#### 消息列表组件（参考 AIdea）

```typescript
// MessageList.tsx
interface MessageListProps {
  messages: ChatMessage[];
  onLoadMore: () => void;
  loadingMore: boolean;
}

// 核心功能
- 虚拟列表渲染历史消息
- 气泡样式（用户/助手区分）
- Markdown渲染（代码块、表格、列表）
- 代码高亮
- 流式输出动画（打字机效果）
- 上拉加载更多
```

### 7.3 状态管理结构（Redux Toolkit）

```typescript
// 完整状态结构
interface RootState {
  websocket: {
    connected: boolean;
    reconnecting: boolean;
    reconnectAttempt: number;
    lastPingTime: number;
    latency: number;
  };
  
  chat: {
    sessions: ChatSession[];
    currentSessionId: string | null;
    messages: ChatMessage[];
    loading: boolean;
    streamingMessageId: string | null;
    hasMore: boolean;
  };
  
  terminal: {
    sessions: TerminalSession[];
    currentSessionId: string | null;
    outputs: Record<sessionId, TerminalOutput[]>;
    maxOutputLines: number;
  };
  
  tasks: {
    activeTasks: Task[];
    taskHistory: Task[];
    loading: boolean;
  };
  
  project: {
    fileTree: FileNode | null;
    expandedNodes: Set<string>;
    currentFile: FileNode | null;
    fileContent: string | null;
    fileLoading: boolean;
    searchQuery: string;
    searchResults: FileNode[];
  };
  
  notifications: {
    list: Notification[];
    unreadCount: number;
    enabled: boolean;
  };
  
  settings: {
    connection: {
      serverHost: string;
      serverPort: number;
      useSSL: boolean;
      autoReconnect: boolean;
    };
    notifications: NotificationSettings;
    ui: UISettings;
    quickCommands: QuickCommand[];
    cache: CacheSettings;
  };
}
```

### 7.4 本地存储策略（参考 Server Box + AIdea）

| 数据类型 | 存储方案 | 容量限制 | 清理策略 |
|---------|---------|---------|---------|
| 对话历史 | SQLite (MMKV) | 最近 500 条 | LRU |
| 文件树缓存 | AsyncStorage | 最近 5 个项目 | 手动清理 |
| 文件内容 | 文件系统 | 100MB | LRU |
| 终端输出 | 内存 + 截断存储 | 10000 行/会话 | 自动截断 |
| 用户设置 | MMKV | - | 永久保存 |
| 通知历史 | SQLite | 最近 100 条 | 自动清理 |

---

## 8. 安全与认证

### 8.1 设备配对流程（优化版）

```
1. 电脑端生成配对信息
   - 6位数字配对码 (有效期5分钟)
   - 临时 Token (JWT, 有效期5分钟)
   - 二维码数据 (包含服务器地址、配对码哈希)

2. 手机端扫描二维码/手动输入
   - 解析服务器地址
   - 发送配对请求 (包含配对码、设备信息)

3. 电脑端验证并生成长期凭证
   - 验证配对码
   - 生成长期 Token (JWT, 有效期30天)
   - 生成 Refresh Token (有效期90天)
   - 存储设备信息

4. 后续连接使用 Token 认证
   - WebSocket 连接时通过 URL 参数传递 Token
   - HTTP 请求通过 Header 传递 Token
   - Token 过期后使用 Refresh Token 刷新
```

### 8.2 传输安全

| 场景 | 方案 | 说明 |
|------|------|------|
| 公网环境 | WSS + HTTPS (TLS 1.3) | 强制加密 |
| 局域网 | 可选 WS + HTTP | 首次连接需用户确认 |
| Token 存储 | Keychain (iOS) / Keystore (Android) | 系统级安全存储 |
| 敏感命令 | 二次确认机制 | 手机端触发，电脑端确认 |

### 8.3 权限控制（参考 Server Box）

```typescript
// 权限级别
enum PermissionLevel {
  READ_ONLY = 1,      // 只读：文件浏览、终端查看
  STANDARD = 2,       // 标准：执行普通命令、AI对话
  PRIVILEGED = 3,     // 特权：执行敏感命令、系统操作
}

// 敏感命令列表（需二次确认）
const SENSITIVE_COMMANDS = [
  /rm\s+-rf/,
  />\s*\/dev/,
  /mkfs/,
  /dd\s+if/,
  // ...
];
```

---

## 9. 关键实现难点与解决方案（优化版）

| 难点 | 解决方案 | 开源参考 |
|------|---------|---------|
| **终端实时输出高并发** | 1. 服务端批量缓冲输出（50ms 批量推送）<br>2. 客户端虚拟列表渲染<br>3. ANSI解析缓存 | Server Box, code-server |
| **大文件查看** | 1. 分块传输（每块 64KB）<br>2. 客户端分段加载<br>3. 仅缓存当前浏览部分<br>4. 支持流式读取 | Server Box |
| **断线重连与状态恢复** | 1. 指数退避重连策略<br>2. 客户端保存最后同步时间戳<br>3. 重连后发送 `sync` 请求<br>4. 服务端推送增量更新 | ChatGPT-Next-Web |
| **后台通知保活** | 1. FCM/APNs 系统推送<br>2. 前台保持 WebSocket 连接<br>3. 后台时降低心跳频率<br>4. 智能重连策略 | Server Box |
| **多终端会话管理** | 1. 每个会话唯一 ID<br>2. 支持多设备订阅同一终端<br>3. 会话状态同步 | code-server |
| **文件变更频繁** | 1. 防抖/节流（100ms）<br>2. 批量推送变更<br>3. 仅推送变更摘要 | Server Box |
| **AI 流式输出** | 1. WebSocket 流式传输<br>2. 客户端打字机效果渲染<br>3. 支持中断生成 | ChatGPT-Next-Web |
| **离线消息队列** | 1. 离线时缓存消息到本地<br>2. 恢复连接后批量发送<br>3. 去重处理 | ChatGPT-Next-Web |

### 9.1 重连策略详细设计（参考 ChatGPT-Next-Web）

```typescript
// 指数退避重连
class ReconnectionStrategy {
  private baseDelay = 1000;      // 初始延迟 1s
  private maxDelay = 30000;      // 最大延迟 30s
  private maxAttempts = 10;      // 最大重试次数
  
  getDelay(attempt: number): number {
    // 指数退避 + 随机抖动
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, this.maxDelay);
  }
  
  shouldRetry(attempt: number): boolean {
    return attempt < this.maxAttempts;
  }
}

// 连接状态机
type ConnectionState = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';
```

### 9.2 终端输出优化（参考 Server Box）

```typescript
// 服务端批量推送
class TerminalOutputBuffer {
  private buffer: string[] = [];
  private flushInterval = 50;  // 50ms
  private maxBufferSize = 1000; // 最大缓冲行数
  
  addOutput(data: string) {
    this.buffer.push(data);
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }
  
  private flush() {
    if (this.buffer.length === 0) return;
    
    // 合并输出并推送
    const output = this.buffer.join('');
    this.broadcast(output);
    this.buffer = [];
  }
}

// 客户端虚拟列表
// 使用 react-native-virtualized-view 仅渲染可见行
// 最大保留 10000 行历史，超出时截断
```

---

## 10. 性能优化策略

### 10.1 服务端优化

| 优化点 | 方案 | 开源参考 |
|--------|------|---------|
| WebSocket 连接池 | 使用 `ws` 库 + 自定义连接管理 | code-server |
| 文件监听 | chokidar + 防抖节流 | Server Box |
| 终端输出 | 批量缓冲 + 压缩传输 | code-server |
| 内存管理 | 定期清理过期会话和缓存 | - |
| 数据库 | SQLite WAL 模式提升并发 | - |

### 10.2 客户端优化

| 优化点 | 方案 | 开源参考 |
|--------|------|---------|
| 列表渲染 | 虚拟列表 (FlashList) | Server Box |
| 图片/文件 | 懒加载 + 缓存 | AIdea |
| 状态更新 | Redux Selector 精确订阅 | ChatGPT-Next-Web |
| 存储 | MMKV 替代 AsyncStorage | Server Box |
| 启动速度 | 代码分割 + 懒加载 | - |

---

## 11. 开发阶段划分

详见 [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)

---

## 12. 附录

### 12.1 推荐依赖列表

**服务端 (Node.js)**
```json
{
  "ws": "^8.14.0",
  "node-pty": "^1.0.0",
  "chokidar": "^3.5.3",
  "bull": "^4.11.0",
  "express": "^4.18.0",
  "jsonwebtoken": "^9.0.0",
  "better-sqlite3": "^8.0.0"
}
```

**客户端 (React Native)**
```json
{
  "@reduxjs/toolkit": "^1.9.0",
  "react-redux": "^8.1.0",
  "react-native-mmkv": "^2.10.0",
  "react-native-markdown-display": "^7.0.0",
  "react-native-syntax-highlighter": "^2.0.0",
  "@shopify/flash-list": "^1.5.0",
  "react-native-qrcode-scanner": "^2.0.0"
}
```

### 12.2 参考链接

- [Flutter Server Box](https://github.com/lollipopkit/flutter_server_box) - 终端和文件管理参考
- [AIdea](https://github.com/mylxsw/aidea) - AI对话UI参考
- [ChatGPT-Next-Web](https://github.com/ChatGPTNextWeb/ChatGPT-Next-Web) - WebSocket和流式输出参考
- [code-server](https://github.com/coder/code-server) - 整体架构和终端集成参考
- [Termux](https://github.com/termux/termux-app) - 终端实现参考
