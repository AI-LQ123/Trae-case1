# 数据模型定义

## 1. 基础类型

### 1.1 通用类型

```typescript
// 设备信息
interface DeviceInfo {
  id: string;           // 设备唯一标识
  name: string;         // 设备名称
  platform: string;     // 平台 (iOS/Android/Windows/MacOS)
  version: string;      // 应用版本
  lastSeen: number;     // 最后活跃时间戳
}

// 分页参数
interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

// 基础响应结构
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  code?: number;
}

// WebSocket消息基础结构
interface WebSocketMessage {
  type: 'command' | 'event' | 'ping' | 'pong';
  id: string;           // 消息唯一标识
  timestamp: number;    // 时间戳
  deviceId: string;     // 设备ID
  payload?: any;        // 消息内容
}
```

## 2. 认证相关

### 2.1 配对请求

```typescript
// 配对请求
interface PairingRequest {
  pairingCode: string;  // 6位配对码
  deviceInfo: DeviceInfo;
}

// 配对响应
interface PairingResponse {
  token: string;        // 长期访问令牌
  refreshToken: string; // 刷新令牌
  expiresIn: number;    // 令牌过期时间（秒）
  serverInfo: {
    name: string;
    version: string;
    url: string;
  };
}

// 刷新令牌请求
interface RefreshTokenRequest {
  refreshToken: string;
}

// 刷新令牌响应
interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}
```

## 3. 对话相关

### 3.1 对话会话

```typescript
// 对话会话
interface ChatSession {
  id: string;           // 会话ID
  title: string;        // 会话标题
  createdAt: number;    // 创建时间
  updatedAt: number;    // 更新时间
  messageCount: number; // 消息数量
}

// 聊天消息
interface ChatMessage {
  id: string;           // 消息ID
  sessionId: string;    // 会话ID
  role: 'user' | 'assistant'; // 角色
  content: string;      // 消息内容
  createdAt: number;    // 创建时间
  parentId?: string;    // 父消息ID，用于引用/回复
  metadata?: {
    isStreaming?: boolean; // 是否正在流式输出
    finishReason?: string;  // 结束原因
  };
}

// 消息请求
interface MessageRequest {
  sessionId: string;    // 会话ID
  message: string;      // 消息内容
  stream?: boolean;     // 是否启用流式响应
}

// 流式响应
interface StreamResponse {
  sessionId: string;    // 会话ID
  messageId: string;    // 消息ID
  delta: string;        // 增量内容
  finish: boolean;      // 是否完成
  finishReason?: string; // 结束原因
}
```

## 4. 项目文件相关

### 4.1 文件树

```typescript
// 文件节点
interface FileNode {
  id: string;           // 节点ID
  name: string;         // 文件名
  path: string;         // 完整路径
  type: 'file' | 'directory'; // 类型
  size?: number;        // 文件大小（字节）
  lastModified?: number; // 最后修改时间
  children?: FileNode[]; // 子节点
  extension?: string;   // 文件扩展名
  isExpanded?: boolean; // 是否展开（客户端状态）
}

// 文件变更
interface FileChange {
  path: string;         // 文件路径
  type: 'created' | 'modified' | 'deleted'; // 变更类型
  timestamp: number;    // 变更时间
  size?: number;        // 新文件大小
}

// 文件内容请求
interface FileContentRequest {
  path: string;         // 文件路径
  offset?: number;      // 起始位置（用于分块加载）
  length?: number;      // 长度（用于分块加载）
}

// 文件内容响应
interface FileContentResponse {
  path: string;         // 文件路径
  content: string;      // 文件内容
  size: number;         // 文件大小
  offset: number;       // 起始位置
  totalSize: number;    // 总大小
  isComplete: boolean;  // 是否完整
}
```

## 5. 终端相关

### 5.1 终端会话

```typescript
// 终端会话
interface TerminalSession {
  id: string;           // 会话ID
  name: string;         // 会话名称
  cwd: string;          // 当前工作目录
  createdAt: number;    // 创建时间
  status: 'active' | 'inactive' | 'closed'; // 状态
  processId?: number;   // 进程ID
}

// 终端输出
interface TerminalOutput {
  sessionId: string;    // 会话ID
  data: string;         // 输出内容
  timestamp: number;    // 时间戳
  type: 'stdout' | 'stderr'; // 输出类型
}

// 终端命令请求
interface TerminalCommandRequest {
  sessionId: string;    // 会话ID
  command: string;      // 命令内容
}

// 终端大小调整
interface TerminalResizeRequest {
  sessionId: string;    // 会话ID
  cols: number;         // 列数
  rows: number;         // 行数
}
```

## 6. 任务相关

### 6.1 任务定义

```typescript
// 任务
interface Task {
  id: string;           // 任务ID
  name: string;         // 任务名称
  command: string;      // 执行命令
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'; // 状态
  progress: number;     // 进度（0-100）
  priority?: 'low' | 'medium' | 'high'; // 任务优先级
  createdAt: number;    // 创建时间
  startedAt?: number;   // 开始时间
  completedAt?: number; // 完成时间
  output?: string;      // 任务输出
  error?: string;       // 错误信息
  metadata?: {
    estimatedTime?: number; // 预计时间（秒）
    remainingTime?: number; // 剩余时间（秒）
    steps?: TaskStep[];     // 任务步骤
  };
}

// 任务步骤
interface TaskStep {
  id: string;           // 步骤ID
  name: string;         // 步骤名称
  status: 'pending' | 'running' | 'completed' | 'failed'; // 状态
  progress: number;     // 进度（0-100）
  startTime?: number;   // 开始时间
  endTime?: number;     // 结束时间
  output?: string;      // 步骤输出
  error?: string;       // 错误信息
}

// 任务创建请求
interface TaskCreateRequest {
  name: string;         // 任务名称
  command: string;      // 执行命令
  cwd?: string;         // 工作目录
  env?: Record<string, string>; // 环境变量
  timeout?: number;     // 超时时间（秒）
}

// 任务操作请求
interface TaskOperationRequest {
  taskId: string;       // 任务ID
  operation: 'pause' | 'resume' | 'cancel'; // 操作类型
}
```

## 7. 通知相关

### 7.1 通知定义

```typescript
// 通知
interface Notification {
  id: string;           // 通知ID
  type: 'task' | 'error' | 'info' | 'warning'; // 通知类型
  title: string;        // 通知标题
  message: string;      // 通知内容
  timestamp: number;    // 时间戳
  read: boolean;        // 是否已读
  metadata?: {
    taskId?: string;    // 相关任务ID
    terminalId?: string; // 相关终端ID
    fileId?: string;     // 相关文件ID
    severity?: 'low' | 'medium' | 'high'; // 严重程度
  };
}

// 通知设置
interface NotificationSettings {
  enabled: boolean;     // 是否启用通知
  taskNotifications: boolean; // 任务通知
  errorNotifications: boolean; // 错误通知
  infoNotifications: boolean;  // 信息通知
  warningNotifications: boolean; // 警告通知
  sound: boolean;       // 是否有声音
  vibration: boolean;   // 是否振动
  previews: boolean;    // 是否显示预览
}
```

## 8. 设置相关

### 8.1 用户设置

```typescript
// 连接设置
interface ConnectionSettings {
  serverHost: string;   // 服务器主机
  serverPort: number;   // 服务器端口
  useSSL: boolean;      // 是否使用SSL
  autoReconnect: boolean; // 是否自动重连
  reconnectAttempts: number; // 重连尝试次数
  reconnectDelay: number; // 重连延迟（毫秒）
}

// UI设置
interface UISettings {
  theme: 'light' | 'dark' | 'system'; // 主题
  fontSize: number;     // 字体大小
  language: string;     // 语言
  animations: boolean;  // 是否启用动画
}

// 缓存设置
interface CacheSettings {
  enabled: boolean;     // 是否启用缓存
  maxCacheSize: number; // 最大缓存大小（MB）
  clearOnLogout: boolean; // 登出时清除缓存
}

// 快捷命令
interface QuickCommand {
  id: string;           // 命令ID
  name: string;         // 命令名称
  command: string;      // 命令内容
  category: 'terminal' | 'ai' | 'task'; // 命令类别
  icon?: string;        // 图标
  shortcut?: string;    // 快捷键
}

// 用户设置
interface UserSettings {
  connection: ConnectionSettings;
  notifications: NotificationSettings;
  ui: UISettings;
  cache: CacheSettings;
  quickCommands: QuickCommand[];
  lastSyncTime: number; // 最后同步时间
}
```

## 9. 权限相关

### 9.1 权限定义

```typescript
// 权限级别
enum PermissionLevel {
  READ_ONLY = 1,      // 只读：文件浏览、终端查看
  STANDARD = 2,       // 标准：执行普通命令、AI对话
  PRIVILEGED = 3,     // 特权：执行敏感命令、系统操作
}

// 设备权限
interface DevicePermission {
  deviceId: string;     // 设备ID
  permissionLevel: PermissionLevel; // 权限级别
  grantedAt: number;    // 授予时间
  expiresAt?: number;   // 过期时间
}
```

## 10. 心跳相关

### 10.1 心跳消息

```typescript
// 心跳请求
interface PingMessage {
  type: 'ping';
  timestamp: number;    // 客户端时间戳
}

// 心跳响应
interface PongMessage {
  type: 'pong';
  timestamp: number;    // 服务器时间戳
  serverTime: number;   // 服务器当前时间
  latency?: number;     // 延迟（毫秒）
}
```

## 11. 同步相关

### 11.1 同步请求

```typescript
// 同步请求
interface SyncRequest {
  lastSyncTime: number; // 上次同步时间
  syncTypes: ('chat' | 'tasks' | 'settings' | 'notifications' | 'terminals')[]; // 同步类型
}

// 同步响应
interface SyncResponse {
  chat: {
    sessions: ChatSession[];
    messages: ChatMessage[];
  };
  tasks: Task[];
  settings: UserSettings;
  notifications: Notification[];
  terminals: TerminalSession[];
  serverTime: number;   // 服务器当前时间
}
```