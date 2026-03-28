# REST API 规范

## 1. 概述

REST API 是 Trae 手机端与电脑端之间的辅助通信方式，主要用于获取静态数据、文件内容和历史记录等。本规范定义了 API 的端点、请求/响应格式和认证方式。

## 2. 基础信息

### 2.1 API 基础 URL

```
http://{server_host}:{server_port}/api
https://{server_host}:{server_port}/api  // 加密连接
```

### 2.2 认证方式

所有 API 请求都需要在 HTTP Header 中包含认证令牌：

```
Authorization: Bearer {jwt_token}
```

### 2.3 响应格式

所有 API 响应都采用统一的 JSON 格式：

```json
{
  "success": true,
  "data": { ... },
  "error": "错误信息（仅当 success 为 false 时）",
  "code": 错误码（仅当 success 为 false 时）
}
```

### 2.4 错误码

| 错误码 | 描述 |
|--------|------|
| 400 | 无效请求 |
| 401 | 未授权 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
| 503 | 服务不可用 |

## 3. API 端点

### 3.1 认证相关

#### 3.1.1 生成配对码

- **端点**：`/api/pair/request`
- **方法**：`POST`
- **请求体**：
  ```json
  {
    "deviceInfo": {
      "name": "手机设备名称",
      "platform": "iOS/Android",
      "version": "1.0.0"
    }
  }
  ```
- **响应**：
  ```json
  {
    "success": true,
    "data": {
      "pairingCode": "123456",
      "expiresIn": 300, // 5分钟
      "qrCodeData": "data:image/png;base64,..."
    }
  }
  ```

#### 3.1.2 确认配对

- **端点**：`/api/pair/confirm`
- **方法**：`POST`
- **请求体**：
  ```json
  {
    "pairingCode": "123456",
    "deviceInfo": {
      "id": "device-uuid",
      "name": "手机设备名称",
      "platform": "iOS/Android",
      "version": "1.0.0"
    }
  }
  ```
- **响应**：
  ```json
  {
    "success": true,
    "data": {
      "token": "jwt-token",
      "refreshToken": "refresh-token",
      "expiresIn": 2592000, // 30天
      "serverInfo": {
        "name": "Trae Server",
        "version": "1.0.0",
        "url": "http://localhost:3000"
      }
    }
  }
  ```

#### 3.1.3 刷新令牌

- **端点**：`/api/auth/refresh`
- **方法**：`POST`
- **请求体**：
  ```json
  {
    "refreshToken": "refresh-token"
  }
  ```
- **响应**：
  ```json
  {
    "success": true,
    "data": {
      "token": "new-jwt-token",
      "refreshToken": "new-refresh-token",
      "expiresIn": 2592000
    }
  }
  ```

### 3.2 项目文件相关

#### 3.2.1 获取项目目录树

- **端点**：`/api/project/tree`
- **方法**：`GET`
- **查询参数**：
  - `path`（可选）：起始路径，默认为项目根目录
  - `depth`（可选）：递归深度，默认为 2
- **响应**：
  ```json
  {
    "success": true,
    "data": {
      "root": {
        "id": "root",
        "name": "project",
        "path": "/path/to/project",
        "type": "directory",
        "children": [
          {
            "id": "file1",
            "name": "package.json",
            "path": "/path/to/project/package.json",
            "type": "file",
            "size": 1024,
            "lastModified": 1698123456789,
            "extension": "json"
          },
          {
            "id": "dir1",
            "name": "src",
            "path": "/path/to/project/src",
            "type": "directory",
            "children": [...]}
        ]
      }
    }
  }
  ```

#### 3.2.2 获取文件内容

- **端点**：`/api/file/content`
- **方法**：`GET`
- **查询参数**：
  - `path`（必填）：文件路径
  - `offset`（可选）：起始字节位置（用于分块加载）
  - `length`（可选）：字节长度（用于分块加载）
- **响应**：
  ```json
  {
    "success": true,
    "data": {
      "path": "/path/to/file.js",
      "content": "console.log('Hello World');",
      "size": 24,
      "offset": 0,
      "totalSize": 24,
      "isComplete": true
    }
  }
  ```

#### 3.2.3 流式获取大文件

- **端点**：`/api/file/stream`
- **方法**：`GET`
- **查询参数**：
  - `path`（必填）：文件路径
- **响应**：
  - 流式响应，Content-Type: application/octet-stream
  - 支持 Range 头进行断点续传

### 3.3 对话相关

#### 3.3.1 获取对话历史

- **端点**：`/api/history/chat`
- **方法**：`GET`
- **查询参数**：
  - `sessionId`（可选）：会话ID，不提供则返回所有会话
  - `page`（可选）：页码，默认为 1
  - `pageSize`（可选）：每页大小，默认为 20
- **响应**：
  ```json
  {
    "success": true,
    "data": {
      "sessions": [
        {
          "id": "session-001",
          "title": "React组件开发",
          "createdAt": 1698123456789,
          "updatedAt": 1698123456789,
          "messageCount": 5
        }
      ],
      "messages": [
        {
          "id": "msg-001",
          "sessionId": "session-001",
          "role": "user",
          "content": "帮我生成一个React组件",
          "createdAt": 1698123456789,
          "parentId": "msg-000",
          "metadata": {
            "isStreaming": false
          }
        }
      ],
      "pagination": {
        "page": 1,
        "pageSize": 20,
        "total": 100
      }
    }
  }
  ```

### 3.4 任务相关

#### 3.4.1 获取任务列表

- **端点**：`/api/tasks`
- **方法**：`GET`
- **查询参数**：
  - `status`（可选）：任务状态过滤
  - `priority`（可选）：任务优先级过滤
  - `page`（可选）：页码，默认为 1
  - `pageSize`（可选）：每页大小，默认为 20
- **响应**：
  ```json
  {
    "success": true,
    "data": {
      "tasks": [
        {
          "id": "task-001",
          "name": "构建项目",
          "command": "npm run build",
          "status": "completed",
          "progress": 100,
          "createdAt": 1698123456789,
          "completedAt": 1698123456789
        }
      ],
      "pagination": {
        "page": 1,
        "pageSize": 20,
        "total": 50
      }
    }
  }
  ```

#### 3.4.2 创建任务

- **端点**：`/api/tasks`
- **方法**：`POST`
- **请求体**：
  ```json
  {
    "name": "构建项目",
    "command": "npm run build",
    "cwd": "/path/to/project",
    "env": {
      "NODE_ENV": "production"
    },
    "timeout": 3600
  }
  ```
- **响应**：
  ```json
  {
    "success": true,
    "data": {
      "id": "task-001",
      "name": "构建项目",
      "command": "npm run build",
      "status": "pending",
      "progress": 0,
      "createdAt": 1698123456789
    }
  }
  ```

#### 3.4.3 获取任务详情

- **端点**：`/api/tasks/{taskId}`
- **方法**：`GET`
- **响应**：
  ```json
  {
    "success": true,
    "data": {
      "id": "task-001",
      "name": "构建项目",
      "command": "npm run build",
      "status": "running",
      "progress": 50,
      "createdAt": 1698123456789,
      "startedAt": 1698123456789,
      "output": "Compiling files...",
      "metadata": {
        "estimatedTime": 60,
        "remainingTime": 30
      }
    }
  }
  ```

#### 3.4.4 操作任务

- **端点**：`/api/tasks/{taskId}/operate`
- **方法**：`POST`
- **请求体**：
  ```json
  {
    "operation": "pause" // pause, resume, cancel
  }
  ```
- **响应**：
  ```json
  {
    "success": true,
    "data": {
      "id": "task-001",
      "status": "paused"
    }
  }
  ```

### 3.5 设置相关

#### 3.5.1 获取用户设置

- **端点**：`/api/settings`
- **方法**：`GET`
- **响应**：
  ```json
  {
    "success": true,
    "data": {
      "connection": {
        "serverHost": "localhost",
        "serverPort": 3000,
        "useSSL": false,
        "autoReconnect": true
      },
      "notifications": {
        "enabled": true,
        "taskNotifications": true,
        "errorNotifications": true
      },
      "ui": {
        "theme": "dark",
        "fontSize": 16
      },
      "quickCommands": [
        {
          "id": "cmd-001",
          "name": "Git Push",
          "command": "git push",
          "category": "terminal"
        }
      ]
    }
  }
  ```

#### 3.5.2 更新用户设置

- **端点**：`/api/settings`
- **方法**：`POST`
- **请求体**：
  ```json
  {
    "connection": {
      "serverHost": "localhost",
      "serverPort": 3000
    },
    "notifications": {
      "enabled": true
    }
  }
  ```
- **响应**：
  ```json
  {
    "success": true,
    "data": {
      "connection": {
        "serverHost": "localhost",
        "serverPort": 3000,
        "useSSL": false,
        "autoReconnect": true
      },
      "notifications": {
        "enabled": true,
        "taskNotifications": true,
        "errorNotifications": true
      },
      "ui": {
        "theme": "dark",
        "fontSize": 16
      }
    }
  }
  ```

### 3.6 终端相关

#### 3.6.1 获取终端会话列表

- **端点**：`/api/terminal/sessions`
- **方法**：`GET`
- **响应**：
  ```json
  {
    "success": true,
    "data": {
      "sessions": [
        {
          "id": "terminal-001",
          "name": "Terminal 1",
          "cwd": "/path/to/project",
          "createdAt": 1698123456789,
          "status": "active"
        }
      ]
    }
  }
  ```

#### 3.6.2 创建终端会话

- **端点**：`/api/terminal/sessions`
- **方法**：`POST`
- **请求体**：
  ```json
  {
    "name": "Terminal 2",
    "cwd": "/path/to/project"
  }
  ```
- **响应**：
  ```json
  {
    "success": true,
    "data": {
      "id": "terminal-002",
      "name": "Terminal 2",
      "cwd": "/path/to/project",
      "createdAt": 1698123456789,
      "status": "active"
    }
  }
  ```

### 3.7 通知相关

#### 3.7.1 获取通知列表

- **端点**：`/api/notifications`
- **方法**：`GET`
- **查询参数**：
  - `read`（可选）：是否已读过滤
  - `limit`（可选）：限制数量，默认为 50
- **响应**：
  ```json
  {
    "success": true,
    "data": {
      "notifications": [
        {
          "id": "notification-001",
          "type": "task",
          "title": "任务完成",
          "message": "构建项目任务已完成",
          "timestamp": 1698123456789,
          "read": false
        }
      ],
      "unreadCount": 5
    }
  }
  ```

#### 3.7.2 标记通知为已读

- **端点**：`/api/notifications/{notificationId}/read`
- **方法**：`PUT`
- **响应**：
  ```json
  {
    "success": true,
    "data": {
      "id": "notification-001",
      "read": true
    }
  }
  ```

## 4. 性能优化

1. **缓存策略**：对于频繁访问的资源（如项目目录树），实现服务器端缓存
2. **分块传输**：大文件采用分块传输，支持断点续传
3. **流式响应**：对于大型响应（如日志文件），使用流式响应
4. **批量操作**：支持批量获取和更新操作，减少请求次数
5. **压缩传输**：启用 Gzip 压缩，减少传输数据量

## 5. 安全考虑

1. **HTTPS**：生产环境必须使用 HTTPS
2. **令牌验证**：所有请求必须验证 JWT 令牌
3. **权限控制**：根据设备权限级别限制 API 访问
4. **输入验证**：对所有请求参数进行严格验证
5. **速率限制**：实现 API 速率限制，防止滥用
6. **敏感信息**：不在响应中返回敏感信息

## 6. 版本控制

API 版本通过 URL 路径进行控制，例如：

```
/api/v1/pair/request
```

### 版本管理策略
- **主要版本递增**：当 API 发生破坏性变更时（如字段删除、参数类型变更、响应结构变化）
- **次要版本**：当 API 新增功能但保持向后兼容时
- **补丁版本**：当 API 修复错误但不改变接口时

版本号格式：`v{major}.{minor}.{patch}`，例如 `v1.2.0`