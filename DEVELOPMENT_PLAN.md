# Trae 手机端 APP 详细开发计划

## 开发原则
1. 先完成文档，经确认后再开始编码
2. 每个阶段都是可独立运行的 MVP
3. 每完成一个小任务就进行验证
4. 遵循 TDD（测试驱动开发）原则
5. **参考开源项目最佳实践**，避免重复造轮子

---

## 开源项目参考清单

在开发过程中，重点参考以下开源项目的实现：

| 项目 | 参考内容 | 应用场景 |
|------|---------|---------|
| [Flutter Server Box](https://github.com/lollipopkit/flutter_server_box) | 终端渲染、文件树虚拟列表、SFTP | 任务 1.8, 2.3, 2.4 |
| [AIdea](https://github.com/mylxsw/aidea) | AI对话UI、Markdown渲染、消息缓存 | 任务 1.3, 1.5 |
| [ChatGPT-Next-Web](https://github.com/ChatGPTNextWeb/ChatGPT-Next-Web) | WebSocket重连、流式输出、状态同步 | 任务 1.2, 1.5, 2.6 |
| [code-server](https://github.com/coder/code-server) | WebSocket架构、终端集成、文件代理 | 任务 1.1, 1.7, 2.3 |

---

## 0. 前置工作：基础设施与设计文档（必须完成）

### 任务 0.1：数据模型与通信协议定义

**优先级**：最高  
**预估时间**：1 天

**内容**：
- 编写数据模型文档（TypeScript 接口）：
  - `ChatMessage`、`Task`、`FileNode`、`TerminalSession`、`Notification`、`DeviceInfo` 等。
- 编写 WebSocket 消息协议规范（JSON Schema）：
  - 所有 `client→server` 和 `server→client` 的消息类型，包含字段名、类型、必填、示例。
  - **参考 ChatGPT-Next-Web 的流式消息设计**
- 编写 REST API 规范（OpenAPI 或 Markdown）：
  - 端点、请求参数、响应结构、错误码。
  - **参考 code-server 的 API 设计**
- 编写认证与配对流程时序图及协议定义：
  - 二维码内容格式、临时密钥交换、Token 生成与验证。
- 编写错误码与异常处理策略。

**交付物**：
- `docs/data-models.md`
- `docs/websocket-protocol.md`
- `docs/rest-api.yaml` 或 `docs/rest-api.md`
- `docs/authentication.md`
- `docs/error-handling.md`

**验收标准**：
- 所有模型和协议被评审通过，开发团队无歧义。
- 协议中定义了心跳、重连、消息去重等机制。
- 消息格式与开源项目（ChatGPT-Next-Web、code-server）兼容性好。

---

### 任务 0.2：项目初始化与环境配置

**优先级**：高  
**预估时间**：2 小时

**内容**：
- 创建 `server/` 和 `client/` 目录结构。
- 初始化 Node.js 项目（TypeScript）和 React Native 项目（TypeScript）。
- 配置 ESLint、Prettier、Husky。
- **安装核心依赖**：
  - 服务端：`ws`, `node-pty`, `chokidar`, `bull`, `express`, `jsonwebtoken`
  - 客户端：`@reduxjs/toolkit`, `react-native-mmkv`, `react-native-markdown-display`, `@shopify/flash-list`
- 设置环境变量模板（`.env.example`）。
- 创建 `README.md` 和开发文档目录。

**交付物**：
- 项目骨架代码
- 基础配置文件
- `package.json` 依赖清单

**验收标准**：
- 服务端可以 `npm run dev` 启动。
- 客户端可以在模拟器上运行。
- 代码规范检查通过。

---

## 第一阶段：MVP 核心功能（2-3 周）

### 阶段目标
建立基础通信框架，实现对话界面和项目文件浏览的核心功能，并能推送通知。

**交付**：可完成基础 AI 对话，查看项目文件，接收任务开始/结束通知。

---

### 任务 1.1：WebSocket 服务端基础（认证框架占位）

**前置**：任务 0.1、0.2  
**预估时间**：4 小时  
**开源参考**：code-server

**设计文档**：`docs/websocket-server-design.md`  
- 描述连接管理、心跳、消息路由、认证占位的实现方式。
- **参考 code-server 的 WebSocket 架构**

**内容**：
- 实现 WebSocket 服务器（使用 `ws` 库）。
- 实现连接管理器（存储客户端连接、心跳检测）。
- 实现消息类型枚举和基础路由。
- 实现认证占位：暂时允许任意连接，但记录 `deviceId`。
- **实现房间管理**（支持多设备订阅同一终端）。
- 添加日志记录。

**交付物**：
- `server/src/websocket/server.ts`
- `server/src/websocket/types.ts`
- `server/src/websocket/connectionManager.ts`
- `server/src/websocket/heartbeat.ts`
- `server/src/websocket/messageRouter.ts`

**验收标准**：
- 客户端可以连接并发送 `ping`，服务端返回 `pong`。
- 连接断开时，连接管理器正确清理资源。
- 支持多设备同时连接。
- 单元测试覆盖率 > 80%。

---

### 任务 1.2：WebSocket 客户端基础

**前置**：任务 1.1  
**预估时间**：5 小时  
**开源参考**：ChatGPT-Next-Web

**设计文档**：`docs/websocket-client-design.md`
- **参考 ChatGPT-Next-Web 的重连策略**

**内容**：
- 实现 WebSocket 客户端（封装原生 WebSocket）。
- 实现连接状态管理（disconnected, connecting, connected, reconnecting）。
- **实现指数退避重连**（参考 ChatGPT-Next-Web）：
  - 初始延迟 1s，最大延迟 30s，最大重试 10 次
  - 添加随机抖动避免 thundering herd
- 实现消息发送队列（离线时缓存）。
- **实现心跳检测和连接健康检查**。
- 提供 React Hook `useWebSocket`。

**交付物**：
- `client/src/services/websocket/WebSocketClient.ts`
- `client/src/services/websocket/reconnection.ts`
- `client/src/services/websocket/messageQueue.ts`
- `client/src/hooks/useWebSocket.ts`

**验收标准**：
- 能连接到服务端，并保持心跳（30秒间隔）。
- 断网后能自动重连，重连后重新订阅。
- 离线消息在恢复后自动发送。
- 单元测试覆盖核心逻辑。

---

### 任务 1.3：对话界面 UI 框架

**前置**：任务 0.2  
**预估时间**：4 小时  
**开源参考**：AIdea

**设计文档**：`docs/chat-ui-design.md`
- **参考 AIdea 的消息气泡和 Markdown 渲染**

**内容**：
- 创建底部导航栏（5 个 Tab）。
- 创建 `ChatScreen` 页面布局。
- 实现消息列表组件（支持不同角色气泡样式）。
- **使用 `react-native-markdown-display` 实现 Markdown 渲染**。
- 实现输入框组件（多行、发送按钮）。
- 快捷指令入口（占位按钮）。
- **虚拟列表优化**（使用 `@shopify/flash-list`）。

**交付物**：
- `client/src/navigation/AppNavigator.tsx`
- `client/src/screens/ChatScreen.tsx`
- `client/src/components/chat/MessageList.tsx`
- `client/src/components/chat/MessageBubble.tsx`
- `client/src/components/chat/MessageInput.tsx`

**验收标准**：
- 底部导航栏切换正常。
- 消息列表可展示静态示例数据，Markdown 渲染正确。
- 输入框可输入文字并点击发送。
- 长列表滚动流畅（100+ 条消息）。

---

### 任务 1.4：对话功能集成（服务端 AI 处理）

**前置**：任务 1.1、0.1  
**预估时间**：5 小时  
**开源参考**：AIdea, ChatGPT-Next-Web

**设计文档**：`docs/chat-implementation.md`  
- 描述 AI 服务集成方式（调用本地模块或 HTTP 接口）。
- **定义流式响应消息结构**（参考 ChatGPT-Next-Web）。
- 对话历史存储设计。

**内容**：
- 在 `handlers.ts` 中实现 `send_dialog` 处理器。
- **实现流式响应**（`dialog_response` 分片推送）。
- 调用 Trae AI 服务（先实现一个 mock 版本，返回固定文本）。
- 将对话消息存储到 SQLite（按 deviceId 隔离）。
- 实现对话历史查询 API。

**交付物**：
- `server/src/websocket/handlers/chatHandler.ts`
- `server/src/services/aiService.ts`
- `server/src/store/chatStore.ts`
- `server/src/ai/mockAI.ts`

**验收标准**：
- 收到 `send_dialog` 后返回 mock 回复（支持流式）。
- 对话历史可以按客户端查询。
- 消息结构符合协议文档。
- 支持中断生成。

---

### 任务 1.5：对话功能集成（客户端）

**前置**：任务 1.2、1.3、1.4  
**预估时间**：5 小时  
**开源参考**：AIdea, ChatGPT-Next-Web

**设计文档**：`docs/chat-integration.md`
- **参考 ChatGPT-Next-Web 的流式渲染效果**

**内容**：
- 在 `ChatScreen` 中使用 `useWebSocket` 发送消息。
- **接收流式 `dialog_response` 并实时更新消息**（打字机效果）。
- Markdown 渲染（代码块、表格）。
- **代码语法高亮**（`react-native-syntax-highlighter`）。
- 实现消息滚动到底部。
- **本地缓存使用 MMKV**（替代 AsyncStorage，性能更好）。

**交付物**：
- `client/src/state/slices/chatSlice.ts`（Redux Toolkit）
- `client/src/screens/ChatScreen.tsx`（集成逻辑）
- `client/src/components/chat/CodeBlock.tsx`（代码高亮）

**验收标准**：
- 输入消息并发送，能收到流式回复并显示。
- Markdown（代码块、表格）渲染正确，代码高亮。
- 刷新页面后消息历史仍在（本地缓存）。
- 无网络时发送的消息进入队列，恢复后自动发送。

---

### 任务 1.6：通知推送基础

**前置**：任务 1.1  
**预估时间**：4 小时  
**开源参考**：Flutter Server Box

**设计文档**：`docs/notification.md`  
- 定义 `notification` 事件结构。
- 前台通知展示方式（Toast/Modal）。
- **参考 Server Box 的保活策略**。

**内容**：
- 服务端实现 `sendNotification` 工具函数，向指定客户端推送 `notification` 事件。
- 客户端实现通知接收，并展示系统级通知（前台使用 `Alert` 或自定义 Toast）。
- 实现通知历史存储（最多 50 条）。
- **添加前台服务保活**（Android）。

**交付物**：
- `server/src/services/notificationService.ts`
- `client/src/state/slices/notificationSlice.ts`
- `client/src/components/NotificationToast.tsx`

**验收标准**：
- 服务端调用 `sendNotification` 后，客户端能收到并弹出提示。
- 通知历史可以在设置页面查看。
- 应用在后台时保持连接（前台服务）。

---

### 任务 1.7：项目文件浏览（服务端）

**前置**：任务 1.1、0.1  
**预估时间**：5 小时  
**开源参考**：code-server, Flutter Server Box

**设计文档**：`docs/file-browse.md`  
- 定义 `get_project_tree` 和 `get_file_content` 的 REST API。
- **参考 Server Box 的大文件分块策略**。

**内容**：
- 实现 REST API：`GET /api/project/tree`（返回当前项目目录树）。
- 实现 REST API：`GET /api/file/content?path=...`（返回文件内容）。
- **实现 `GET /api/file/stream` 流式获取大文件**。
- 实现文件监听（chokidar），当文件变化时推送 `file_change` 事件。
- **防抖处理**（100ms）。
- 添加安全限制：只能访问项目目录内的文件。

**交付物**：
- `server/src/api/routes/project.ts`
- `server/src/api/routes/file.ts`
- `server/src/services/fileService.ts`
- `server/src/services/fileWatcher.ts`

**验收标准**：
- 可以通过 API 获取项目目录树（JSON 格式）。
- 可以通过 API 获取文件内容（支持大文件分块）。
- 文件变更时推送通知（防抖后）。
- 错误处理：文件不存在、越界访问返回 403。

---

### 任务 1.8：项目文件浏览（客户端）

**前置**：任务 1.2、1.3、1.7  
**预估时间**：6 小时  
**开源参考**：Flutter Server Box

**设计文档**：`docs/file-browse-ui.md`
- **参考 Server Box 的虚拟列表实现**

**内容**：
- 创建 `ProjectScreen`。
- **实现文件树组件**（使用 `@shopify/flash-list` 虚拟列表）。
- 实现文件夹展开/折叠状态管理。
- 懒加载子目录（展开时才加载）。
- 点击文件时，调用 REST API 获取文件内容，并在 `FileViewer` 组件中展示。
- 实现顶部搜索框（前端过滤文件名）。
- **文件图标根据扩展名显示**。

**交付物**：
- `client/src/screens/ProjectScreen.tsx`
- `client/src/components/file/FileTree.tsx`
- `client/src/components/file/FileViewer.tsx`
- `client/src/components/file/FileSearch.tsx`
- `client/src/state/slices/projectSlice.ts`

**验收标准**：
- 可以展开/折叠目录，展示文件和文件夹。
- 点击文件显示文件内容。
- 搜索框可以过滤文件列表。
- **性能：10000 个文件时滚动流畅（虚拟列表）**。

---

### 任务 1.9：第一阶段集成测试与文档

**前置**：所有第一阶段任务  
**预估时间**：4 小时

**内容**：
- 编写端到端测试用例。
- 修复集成过程中的 Bug。
- **性能基准测试**：
  - 文件树加载时间（< 1s 对于 1000 个文件）
  - WebSocket 消息延迟（< 50ms）
  - 终端输出帧率（> 30fps）
- 更新开发文档，记录已知问题和解决方案。

**交付物**：
- 测试报告
- 性能基准数据
- 更新后的文档

**验收标准**：
- 所有第一阶段功能可用，无阻塞 Bug。
- 核心流程（对话、文件浏览、通知）通过测试。
- 性能指标达标。

---

## 第二阶段：增强功能（3-4 周）

### 阶段目标
增加任务管理、终端输出查看、快捷指令、状态同步等核心"遥控器"功能。

**交付**：完成核心遥控器+显示器功能，支持日常开发监控。

---

### 任务 2.1：任务管理服务端

**前置**：任务 0.1、1.1  
**预估时间**：6 小时

**设计文档**：`docs/task-management.md`  
- 定义任务实体（id, name, status, progress, logs, startTime, endTime）。
- 定义任务操作（创建、暂停、继续、取消）。
- 定义任务事件推送（task_status）。
- **使用 Bull Queue 实现任务调度**。

**内容**：
- 实现任务管理器（Bull Queue）。
- 实现任务执行器（支持异步任务）。
- 实现 WebSocket 处理器：create_task、pause_task、resume_task、cancel_task。
- 任务进度定时推送。
- 任务日志存储。

**交付物**：
- `server/src/services/taskScheduler.ts`
- `server/src/websocket/handlers/taskHandler.ts`
- `server/src/store/taskStore.ts`

**验收标准**：
- 可以创建任务，并看到进度从 0 到 100。
- 支持暂停、继续、取消。
- 任务状态变化时推送 task_status 事件。

---

### 任务 2.2：任务管理客户端

**前置**：任务 2.1、1.2  
**预估时间**：5 小时

**设计文档**：`docs/task-ui.md`

**内容**：
- 创建 TasksScreen，展示任务列表（卡片形式，含进度条）。
- 实现任务详情页面（显示日志、操作按钮）。
- 接收 task_status 事件，实时更新任务状态。
- 发送任务操作指令。

**交付物**：
- `client/src/screens/TasksScreen.tsx`
- `client/src/components/task/TaskCard.tsx`
- `client/src/components/task/TaskDetail.tsx`
- `client/src/state/slices/taskSlice.ts`

**验收标准**：
- 任务列表能展示所有任务及进度。
- 点击任务进入详情，可以暂停/继续/取消。
- 任务状态变化时 UI 实时更新。

---

### 任务 2.3：终端服务端

**前置**：任务 0.1、1.1  
**预估时间**：8 小时  
**开源参考**：code-server, Flutter Server Box

**设计文档**：`docs/terminal.md`  
- 定义终端会话模型（sessionId, pid, history, subscribers）。
- **使用 node-pty 创建伪终端**（参考 code-server）。
- 定义消息类型：start_terminal、send_command、terminal_output。
- **实现输出缓冲区批量推送**（参考 Server Box）。

**内容**：
- 实现终端会话管理器。
- 实现 start_terminal 处理器：创建 pty 进程，返回 sessionId。
- 实现 send_command 处理器：向指定会话写入命令。
- **监听 pty 的 data 事件，批量推送 terminal_output**（50ms 间隔）。
- 支持多客户端订阅同一终端。
- **实现 ANSI 颜色代码解析**。

**交付物**：
- `server/src/services/terminalManager.ts`
- `server/src/terminal/terminalSession.ts`
- `server/src/websocket/handlers/terminalHandler.ts`
- `server/src/utils/ansiParser.ts`

**验收标准**：
- 可以创建终端会话，并执行 ls、echo 等命令。
- 命令输出实时推送给订阅的客户端（批量优化后）。
- 多个客户端订阅同一终端，都能收到输出。
- 支持 ANSI 颜色显示。

---

### 任务 2.4：终端客户端

**前置**：任务 2.3、1.2  
**预估时间**：6 小时  
**开源参考**：Flutter Server Box

**设计文档**：`docs/terminal-ui.md`
- **参考 Server Box 的终端渲染实现**

**内容**：
- 创建 TerminalScreen，支持多终端标签页切换。
- **实现终端输出区域**（虚拟列表 + ANSI 解析渲染）。
- 实现命令输入框，发送 send_command。
- 接收 terminal_output，追加到当前终端的输出列表。
- **输出缓冲区管理**（最大 10000 行，超出截断）。
- 支持创建新终端。

**交付物**：
- `client/src/screens/TerminalScreen.tsx`
- `client/src/components/terminal/Terminal.tsx`
- `client/src/components/terminal/TerminalOutput.tsx`
- `client/src/components/terminal/CommandInput.tsx`
- `client/src/state/slices/terminalSlice.ts`
- `client/src/utils/ansiParser.ts`

**验收标准**：
- 可以创建新终端，并看到终端输出。
- 可以输入命令并看到输出（支持 ANSI 颜色）。
- 多个终端切换时输出独立。
- **输出滚动流畅，高频输出不卡顿（虚拟列表）**。

---

### 任务 2.5：快捷指令

**前置**：任务 1.5、2.4  
**预估时间**：4 小时  
**开源参考**：Flutter Server Box

**设计文档**：`docs/quick-commands.md`
- **参考 Server Box 的快捷指令设计**

**内容**：
- 在客户端实现快捷指令管理（预设指令如"git status"、"npm run build"）。
- 在对话页面顶部添加快捷指令按钮，点击弹出菜单。
- 支持用户自定义指令（增删改）。
- 指令可发送到 AI 对话或终端（根据类型）。
- **快捷指令本地存储（MMKV）**。

**交付物**：
- `client/src/components/quickCommands/QuickCommandsMenu.tsx`
- `client/src/components/quickCommands/QuickCommandEditor.tsx`
- `client/src/state/slices/quickCommandsSlice.ts`

**验收标准**：
- 点击快捷指令可快速发送对应内容到对话或终端。
- 用户可以添加、修改、删除快捷指令。
- 快捷指令持久化保存。

---

### 任务 2.6：状态同步机制

**前置**：任务 1.2、2.1、2.3  
**预估时间**：6 小时  
**开源参考**：ChatGPT-Next-Web

**设计文档**：`docs/state-sync.md`  
- **参考 ChatGPT-Next-Web 的同步策略**
- 定义 sync 消息：客户端重连后请求增量更新。
- 服务端维护每个客户端的版本号或时间戳。
- 实现对话历史、任务列表、终端会话列表的增量同步。

**内容**：
- 服务端为每个设备记录最后同步时间戳。
- 实现 sync 处理器，返回自上次同步以来的变更。
- **客户端在重连成功后调用 sync，合并状态**。
- 处理冲突（以服务端为准）。
- **离线消息队列实现**。

**交付物**：
- `server/src/services/syncManager.ts`
- `client/src/services/websocket/sync.ts`
- `client/src/hooks/useSync.ts`

**验收标准**：
- 断线重连后，手机端能恢复之前的对话、任务、终端列表。
- 多设备同时操作时，状态最终一致。
- 离线期间的操作在恢复后自动同步。

---

### 任务 2.7：第二阶段集成测试

**预估时间**：4 小时

**内容**：
- 测试终端命令执行、任务管理、快捷指令、状态同步的完整流程。
- **性能测试**：
  - 终端高频输出时手机端渲染帧率（> 30fps）
  - 大文件（10MB+）加载时间
  - 长时间运行（24小时）稳定性
- 编写集成测试用例。

**验收标准**：
- 所有第二阶段功能通过手动测试。
- 性能指标达标。
- 无明显内存泄漏。

---

## 第三阶段：高级功能与产品化（2-3 周）

### 阶段目标
提升用户体验，增加代码高亮、高级通知、历史搜索、设置与多设备配对等。

**交付**：功能完整，体验接近成熟产品。

---

### 任务 3.1：代码查看增强

**前置**：任务 1.8  
**预估时间**：5 小时  
**开源参考**：code-server

**设计文档**：`docs/code-viewer.md`
- **参考 code-server 的代码查看体验**

**内容**：
- 集成 `react-native-syntax-highlighter`。
- 根据文件扩展名自动识别语言。
- 添加行号显示。
- 支持横向滚动（长代码行）。
- 添加代码搜索功能（高亮匹配）。
- **支持代码折叠**（可选）。

**交付物**：
- `client/src/components/file/CodeViewer.tsx`

**验收标准**：
- 常见语言（JavaScript, Python, Java, HTML, CSS, Go, Rust）高亮正确。
- 行号显示对齐。
- 搜索功能可跳转并高亮。

---

### 任务 3.2：高级通知配置

**前置**：任务 1.6  
**预估时间**：5 小时  
**开源参考**：Flutter Server Box

**设计文档**：`docs/advanced-notifications.md`
- **参考 Server Box 的后台保活策略**

**内容**：
- 在设置页面添加通知配置：按事件类型开关（任务、错误、完成等）。
- 实现手机系统推送（后台）：
  - Android：Firebase Cloud Messaging。
  - iOS：Apple Push Notification Service。
- 服务端在事件发生时，根据客户端配置决定是否推送系统通知。
- **优化后台保活策略**。

**交付物**：
- `server/src/services/notification/config.ts`
- `client/src/screens/SettingsScreen.tsx`（通知设置部分）
- 移动端推送集成代码。

**验收标准**：
- 用户可以关闭某类通知，不再收到对应提醒。
- 应用在后台时，重要事件能收到系统推送。
- 后台保活时间 > 10 分钟。

---

### 任务 3.3：历史记录管理

**前置**：任务 1.5、2.2、2.4  
**预估时间**：4 小时

**设计文档**：`docs/history-management.md`

**内容**：
- 实现对话历史搜索功能（按内容关键词）。
- 实现任务历史查看（已完成任务列表）。
- 实现终端命令历史（按会话）。
- 添加清除历史功能（缓存清理）。
- **使用 SQLite 存储历史记录**。

**交付物**：
- `client/src/components/history/HistorySearch.tsx`
- `client/src/services/storage/historyManager.ts`
- 各界面添加历史入口。

**验收标准**：
- 可以搜索对话历史，点击跳转到对应消息。
- 任务历史页面展示已完成任务。
- 可以清除缓存。

---

### 任务 3.4：完整认证与多设备管理

**前置**：任务 1.1、0.1  
**预估时间**：8 小时

**设计文档**：`docs/authentication.md`（详细版）

**内容**：
- 服务端实现设备配对 API：
  - POST /api/pair/request：生成配对码和临时密钥，返回二维码数据。
  - POST /api/pair/confirm：客户端确认配对，返回长期 Token。
- **实现 Token 刷新机制**（Access Token + Refresh Token）。
- WebSocket 认证：连接时携带 Token，服务端验证。
- 支持多设备管理：查看已配对设备，撤销设备。
- 实现二维码扫描功能（客户端使用 `react-native-qrcode-scanner`）。

**交付物**：
- `server/src/services/auth/pairing.ts`
- `server/src/services/auth/tokenManager.ts`
- `server/src/api/routes/auth.ts`
- `client/src/screens/ScanScreen.tsx`
- `client/src/screens/SettingsScreen.tsx`（设备管理）

**验收标准**：
- 首次连接需要通过扫描二维码配对。
- 配对后使用 Token 进行 WebSocket 认证。
- Token 过期后自动刷新。
- 可以查看并撤销已配对设备。

---

### 任务 3.5：设置与个性化

**前置**：任务 3.4  
**预估时间**：4 小时

**设计文档**：`docs/settings.md`

**内容**：
- 主题切换（浅色/深色）使用 React Navigation 主题或自定义。
- 字体大小调整。
- 缓存管理（清除缓存按钮）。
- 连接配置（手动输入 IP/端口，用于多电脑切换）。
- **同步设置到服务端**。

**交付物**：
- `client/src/screens/SettingsScreen.tsx`（完整）
- `client/src/state/slices/settingsSlice.ts`
- 主题相关样式文件。

**验收标准**：
- 主题切换立即生效。
- 字体大小调整后，所有页面文字缩放。
- 可以清除缓存。
- 可以手动配置连接地址，切换不同电脑。

---

### 任务 3.6：第三阶段集成测试与发布准备

**预估时间**：8 小时

**内容**：
- 端到端测试所有功能。
- **性能优化**：
  - 内存泄漏检查
  - 启动时间优化（< 2s）
  - 包体积优化
- 生成测试报告和用户文档。
- **打包 Android APK 和 iOS IPA 用于内测**。
- **安全审计**（敏感信息检查）。

**验收标准**：
- 所有第三阶段功能稳定运行。
- 应用在 Android 和 iOS 真机上通过测试。
- 用户文档（使用指南）完成。
- 启动时间 < 2s。
- 无明显内存泄漏（24小时运行）。

---

## 附录：任务依赖关系图

```
任务 0.1 (数据模型) ───┐
                      ├──→ 任务 0.2 (项目初始化)
任务 0.2 (项目初始化) ──┘
                      │
                      ▼
              任务 1.1 (WebSocket 服务端) ───┐
                      │                      │
                      ├──→ 任务 1.2 (WebSocket 客户端) ───→ 任务 1.5 (对话客户端)
                      │                      │
                      ├──→ 任务 1.4 (对话服务端)          │
                      │                      │
                      ├──→ 任务 1.6 (通知推送)            │
                      │                      │
                      └──→ 任务 1.7 (文件浏览服务端) ───→ 任务 1.8 (文件浏览客户端)
                                             │
任务 1.2 ───→ 任务 2.1 (任务管理服务端) ───→ 任务 2.2 (任务管理客户端)
任务 1.2 ───→ 任务 2.3 (终端服务端) ───→ 任务 2.4 (终端客户端)
任务 1.5 ───→ 任务 2.5 (快捷指令)
任务 2.1 ───→ 任务 2.6 (状态同步)
任务 2.3 ───→ 任务 2.6 (状态同步)

任务 1.8 ───→ 任务 3.1 (代码高亮)
任务 1.6 ───→ 任务 3.2 (高级通知)
任务 1.1 ───→ 任务 3.4 (完整认证)
任务 3.4 ───→ 任务 3.5 (设置与个性化)
```

---

## 开源项目代码复用清单

### 可直接参考/复用的代码模式

| 功能 | 开源项目 | 参考文件/模式 | 应用任务 |
|------|---------|--------------|---------|
| WebSocket 重连 | ChatGPT-Next-Web | `app/utils/websocket.ts` | 1.2 |
| 指数退避算法 | ChatGPT-Next-Web | 重连策略实现 | 1.2 |
| 终端 ANSI 解析 | Flutter Server Box | `lib/core/ansi.dart` | 2.3, 2.4 |
| 虚拟列表 | Flutter Server Box | `lib/components/virt.dart` | 1.8, 2.4 |
| Markdown 渲染 | AIdea | 消息气泡组件 | 1.3, 1.5 |
| 文件树组件 | code-server | `src/vs/workbench/contrib/files` | 1.8 |
| 心跳机制 | code-server | `src/server/heartbeat.ts` | 1.1 |
| 消息队列 | ChatGPT-Next-Web | 离线消息缓存 | 1.2, 2.6 |

### 推荐依赖库

**服务端**
```json
{
  "ws": "^8.14.2",
  "node-pty": "^1.0.0",
  "chokidar": "^3.5.3",
  "bull": "^4.11.5",
  "express": "^4.18.2",
  "jsonwebtoken": "^9.0.2",
  "better-sqlite3": "^8.7.0",
  "ansi-to-html": "^0.7.2"
}
```

**客户端**
```json
{
  "@reduxjs/toolkit": "^1.9.7",
  "react-redux": "^8.1.3",
  "react-native-mmkv": "^2.11.0",
  "react-native-markdown-display": "^7.0.2",
  "react-native-syntax-highlighter": "^2.0.0",
  "@shopify/flash-list": "^1.6.3",
  "react-native-qrcode-scanner": "^2.0.0",
  "@react-native-firebase/messaging": "^18.7.0",
  "ansi-regex": "^6.0.1",
  "strip-ansi": "^7.1.0"
}
```

---

## 总结

这份开发计划参考了多个优秀开源项目的最佳实践：

1. **ChatGPT-Next-Web**：WebSocket 通信、重连策略、流式输出
2. **Flutter Server Box**：终端渲染、文件管理、虚拟列表
3. **AIdea**：AI 对话 UI、Markdown 渲染
4. **code-server**：整体架构、终端集成、文件系统代理

每个任务都包含：
- **明确的开源参考**：指出可以参考的具体项目
- **设计文档先行**：每个任务开始前必须完成对应的设计文档
- **具体的实现内容**：详细描述需要实现的功能
- **可验证的交付物**：明确的文件路径和代码位置
- **量化的验收标准**：可以客观验证任务完成的标准

按照此计划执行，团队能确保项目有序推进，同时借鉴业界最佳实践，避免重复造轮子。
