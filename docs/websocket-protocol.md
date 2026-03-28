# WebSocket 消息协议

## 1. 概述

WebSocket 是 Trae 手机端与电脑端之间的主要通信方式，用于实时数据传输和命令执行。本协议定义了消息的格式、类型和处理流程。

## 2. 连接建立

### 2.1 连接URL

```
ws://{server_host}:{server_port}/ws?token={jwt_token}
wss://{server_host}:{server_port}/ws?token={jwt_token}  // 加密连接
```

### 2.2 认证

- 连接时通过 URL 参数 `token` 传递 JWT 令牌
- 服务端验证令牌有效性
- 验证失败时，服务端会关闭连接并返回错误码

## 3. 消息格式

### 3.1 通用消息结构

```json
{
  "type": "command" | "event" | "ping" | "pong",
  "id": "uuid-v4",
  "timestamp": 1698123456789,
  "deviceId": "device-uuid",
  "payload": { ... }
}
```

- `type`: 消息类型
- `id`: 消息唯一标识，用于请求-响应配对
- `timestamp`: 消息发送时间戳
- `deviceId`: 发送设备的唯一标识
- `payload`: 消息内容，根据消息类型不同而不同

## 4. 消息类型

### 4.1 命令消息 (command)

由客户端发送给服务端，用于执行操作。

#### 4.1.1 AI对话命令

```json
{
  "type": "command",
  "id": "cmd-001",
  "timestamp": 1698123456789,
  "deviceId": "mobile-001",
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

#### 4.1.2 终端命令

```json
{
  "type": "command",
  "id": "cmd-002",
  "timestamp": 1698123456790,
  "deviceId": "mobile-001",
  "payload": {
    "category": "terminal",
    "action": "execute_command",
    "data": {
      "sessionId": "terminal-001",
      "command": "npm run build"
    }
  }
}
```

#### 4.1.3 终端创建命令

```json
{
  "type": "command",
  "id": "cmd-003",
  "timestamp": 1698123456791,
  "deviceId": "mobile-001",
  "payload": {
    "category": "terminal",
    "action": "create_session",
    "data": {
      "name": "Terminal 1",
      "cwd": "/path/to/project"
    }
  }
}
```

#### 4.1.4 终端大小调整命令

```json
{
  "type": "command",
  "id": "cmd-004",
  "timestamp": 1698123456792,
  "deviceId": "mobile-001",
  "payload": {
    "category": "terminal",
    "action": "resize",
    "data": {
      "sessionId": "terminal-001",
      "cols": 80,
      "rows": 24
    }
  }
}
```

#### 4.1.5 任务管理命令

```json
{
  "type": "command",
  "id": "cmd-005",
  "timestamp": 1698123456793,
  "deviceId": "mobile-001",
  "payload": {
    "category": "task",
    "action": "create",
    "data": {
      "name": "构建项目",
      "command": "npm run build",
      "cwd": "/path/to/project"
    }
  }
}
```

#### 4.1.6 任务操作命令

```json
{
  "type": "command",
  "id": "cmd-006",
  "timestamp": 1698123456794,
  "deviceId": "mobile-001",
  "payload": {
    "category": "task",
    "action": "operate",
    "data": {
      "taskId": "task-001",
      "operation": "pause"
    }
  }
}
```

#### 4.1.7 同步请求命令

```json
{
  "type": "command",
  "id": "cmd-007",
  "timestamp": 1698123456795,
  "deviceId": "mobile-001",
  "payload": {
    "category": "sync",
    "action": "request",
    "data": {
      "lastSyncTime": 1698123450000,
      "syncTypes": ["chat", "tasks", "notifications"]
    }
  }
}
```

### 4.2 事件消息 (event)

由服务端发送给客户端，用于推送实时事件和状态更新。

#### 4.2.1 AI对话响应事件

```json
{
  "type": "event",
  "id": "evt-001",
  "timestamp": 1698123456796,
  "deviceId": "server",
  "payload": {
    "category": "dialog_response",
    "data": {
      "sessionId": "session-001",
      "messageId": "msg-002",
      "delta": "这是一个React组件",
      "finish": false
    }
  }
}
```

#### 4.2.2 终端输出事件

```json
{
  "type": "event",
  "id": "evt-002",
  "timestamp": 1698123456797,
  "deviceId": "server",
  "payload": {
    "category": "terminal_output",
    "data": {
      "sessionId": "terminal-001",
      "data": "> Building project...\n",
      "type": "stdout"
    }
  }
}
```

#### 4.2.3 任务状态更新事件

```json
{
  "type": "event",
  "id": "evt-003",
  "timestamp": 1698123456798,
  "deviceId": "server",
  "payload": {
    "category": "task_update",
    "data": {
      "taskId": "task-001",
      "status": "running",
      "progress": 30,
      "output": "Compiling files..."
    }
  }
}
```

#### 4.2.4 文件变更事件

```json
{
  "type": "event",
  "id": "evt-004",
  "timestamp": 1698123456799,
  "deviceId": "server",
  "payload": {
    "category": "file_change",
    "data": {
      "path": "/path/to/file.js",
      "type": "modified",
      "timestamp": 1698123456799,
      "size": 1024
    }
  }
}
```

#### 4.2.5 通知事件

```json
{
  "type": "event",
  "id": "evt-005",
  "timestamp": 1698123456800,
  "deviceId": "server",
  "payload": {
    "category": "notification",
    "data": {
      "id": "notification-001",
      "type": "task",
      "title": "任务完成",
      "message": "构建项目任务已完成",
      "severity": "medium"
    }
  }
}
```

#### 4.2.6 同步响应事件

```json
{
  "type": "event",
  "id": "evt-006",
  "timestamp": 1698123456801,
  "deviceId": "server",
  "payload": {
    "category": "sync_response",
    "data": {
      "chat": {
        "sessions": [...],
        "messages": [...]
      },
      "tasks": [...],
      "notifications": [...],
      "serverTime": 1698123456801
    }
  }
}
```

### 4.3 心跳消息 (ping/pong)

用于保持连接活跃和检测网络延迟。

#### 4.3.1 Ping 消息（客户端 → 服务端）

```json
{
  "type": "ping",
  "id": "ping-001",
  "timestamp": 1698123456802,
  "deviceId": "mobile-001"
}
```

#### 4.3.2 Pong 消息（服务端 → 客户端）

```json
{
  "type": "pong",
  "id": "pong-001",
  "timestamp": 1698123456803,
  "deviceId": "server",
  "payload": {
    "serverTime": 1698123456803,
    "latency": 10
  }
}
```

## 5. 消息处理流程

### 5.1 命令处理

1. 客户端发送命令消息
2. 服务端接收并验证消息格式
3. 服务端根据 `category` 和 `action` 路由到对应处理器
4. 服务端执行操作并生成响应
5. 服务端通过事件消息推送结果

### 5.2 事件推送

1. 服务端检测到状态变化或事件发生
2. 服务端生成事件消息
3. 服务端将事件消息推送给所有相关客户端
4. 客户端接收并处理事件消息

### 5.3 心跳机制

1. 客户端每 30 秒发送一次 ping 消息
2. 服务端收到 ping 消息后立即回复 pong 消息
3. 客户端计算往返时间作为网络延迟
4. 如果客户端在 60 秒内未收到 pong 消息，认为连接已断开，开始重连

## 6. 错误处理

### 6.1 错误消息格式

```json
{
  "type": "event",
  "id": "error-001",
  "timestamp": 1698123456804,
  "deviceId": "server",
  "payload": {
    "category": "error",
    "data": {
      "code": 401,
      "message": "Unauthorized",
      "details": "Invalid token"
    }
  }
}
```

### 6.2 常见错误码

| 错误码 | 描述 | 处理建议 |
|--------|------|----------|
| 400 | 无效请求 | 检查请求格式 |
| 401 | 未授权 | 重新认证 |
| 403 | 权限不足 | 检查设备权限 |
| 404 | 资源不存在 | 检查资源ID |
| 429 | 请求过于频繁 | 减少请求频率 |
| 500 | 服务器内部错误 | 稍后重试 |
| 503 | 服务不可用 | 稍后重试 |

## 7. 重连策略

### 7.1 客户端重连逻辑

1. 检测到连接断开时，立即尝试重连
2. 采用指数退避策略：
   - 第 1 次重连：1秒后
   - 第 2 次重连：2秒后
   - 第 3 次重连：4秒后
   - 以此类推，最大延迟 30 秒
3. 最多尝试 10 次重连，失败后提示用户
4. 重连成功后，发送同步请求恢复状态

### 7.2 服务端连接管理

1. 维护活跃连接列表
2. 定期清理僵尸连接
3. 支持连接恢复和状态同步

## 8. 安全考虑

1. 所有WebSocket连接必须使用TLS加密（WSS）
2. 连接时必须验证JWT令牌
3. 消息内容应进行适当的验证和过滤
4. 敏感操作需要二次确认
5. 定期轮换令牌，防止令牌被滥用

## 9. 性能优化

1. 批量发送终端输出，减少消息数量
2. 大消息分块传输
3. 合理设置心跳间隔，避免过多的心跳消息
4. 客户端实现消息队列，避免消息丢失
5. 服务端实现连接池，提高并发处理能力