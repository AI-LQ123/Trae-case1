# 错误码与异常处理

## 1. 概述

本文档定义了 Trae 系统中使用的错误码、异常类型和处理策略，确保系统在遇到错误时能够提供清晰、一致的错误信息，并采取适当的处理措施。

## 2. 错误码分类

### 2.1 通用错误码

| 错误码 | 描述 | HTTP 状态码 | 处理建议 |
|--------|------|------------|----------|
| 400 | 无效请求 | 400 Bad Request | 检查请求参数格式 |
| 401 | 未授权 | 401 Unauthorized | 重新认证或配对 |
| 403 | 权限不足 | 403 Forbidden | 检查设备权限级别 |
| 404 | 资源不存在 | 404 Not Found | 检查资源ID或路径 |
| 429 | 请求过于频繁 | 429 Too Many Requests | 减少请求频率 |
| 500 | 服务器内部错误 | 500 Internal Server Error | 稍后重试 |
| 503 | 服务不可用 | 503 Service Unavailable | 稍后重试 |

### 2.2 认证相关错误码

| 错误码 | 描述 | HTTP 状态码 | 处理建议 |
|--------|------|------------|----------|
| 1001 | 配对码无效 | 401 Unauthorized | 重新生成配对码 |
| 1002 | 配对码过期 | 401 Unauthorized | 重新生成配对码 |
| 1003 | Token 无效 | 401 Unauthorized | 重新认证 |
| 1004 | Token 过期 | 401 Unauthorized | 刷新 Token |
| 1005 | Refresh Token 无效 | 401 Unauthorized | 重新配对 |
| 1006 | 设备已被移除 | 401 Unauthorized | 重新配对 |

### 2.3 WebSocket 相关错误码

| 错误码 | 描述 | 处理建议 |
|--------|------|----------|
| 2001 | 连接超时 | 检查网络连接 |
| 2002 | 连接被拒绝 | 检查服务器状态 |
| 2003 | 消息格式错误 | 检查消息格式 |
| 2004 | 消息处理失败 | 稍后重试 |
| 2005 | 心跳超时 | 重新连接 |
| 2006 | 服务器关闭连接 | 重新连接 |

### 2.4 终端相关错误码

| 错误码 | 描述 | 处理建议 |
|--------|------|----------|
| 3001 | 终端会话不存在 | 检查会话ID |
| 3002 | 终端创建失败 | 检查权限和环境 |
| 3003 | 命令执行失败 | 检查命令格式 |
| 3004 | 终端会话已关闭 | 重新创建会话 |
| 3005 | 终端输出超时 | 检查网络连接 |

### 2.5 任务相关错误码

| 错误码 | 描述 | 处理建议 |
|--------|------|----------|
| 4001 | 任务不存在 | 检查任务ID |
| 4002 | 任务创建失败 | 检查命令和权限 |
| 4003 | 任务操作失败 | 检查任务状态 |
| 4004 | 任务执行超时 | 检查命令执行时间 |
| 4005 | 任务权限不足 | 检查设备权限 |

### 2.6 文件相关错误码

| 错误码 | 描述 | 处理建议 |
|--------|------|----------|
| 5001 | 文件不存在 | 检查文件路径 |
| 5002 | 目录不存在 | 检查目录路径 |
| 5003 | 读取文件失败 | 检查文件权限 |
| 5004 | 文件过大 | 使用分块加载 |
| 5005 | 文件路径无效 | 检查路径格式 |

### 2.7 AI 服务相关错误码

| 错误码 | 描述 | 处理建议 |
|--------|------|----------|
| 6001 | AI 服务不可用 | 检查服务状态 |
| 6002 | 对话会话不存在 | 检查会话ID |
| 6003 | 消息发送失败 | 稍后重试 |
| 6004 | 流式输出中断 | 重新发送请求 |
| 6005 | AI 服务超时 | 稍后重试 |

## 3. 错误消息格式

### 3.1 API 错误响应

```json
{
  "success": false,
  "error": "错误描述",
  "code": 错误码,
  "details": "详细错误信息（可选）"
}
```

### 3.2 WebSocket 错误消息

```json
{
  "type": "event",
  "id": "error-001",
  "timestamp": 1698123456789,
  "deviceId": "server",
  "payload": {
    "category": "error",
    "data": {
      "code": 错误码,
      "message": "错误描述",
      "details": "详细错误信息（可选）"
    }
  }
}
```

### 3.3 客户端错误提示

客户端应根据错误码显示相应的用户友好提示：

- **401 未授权**："请重新配对设备"
- **403 权限不足**："权限不足，无法执行此操作"
- **404 资源不存在**："请求的资源不存在"
- **500 服务器错误**："服务器内部错误，请稍后重试"
- **503 服务不可用**："服务暂时不可用，请稍后重试"

## 4. 异常处理策略

### 4.1 服务端异常处理

1. **全局异常捕获**
   - 使用中间件捕获所有未处理的异常
   - 记录异常详细信息到日志
   - 返回统一的错误响应格式

2. **特定异常处理**
   - 针对不同类型的异常（如认证异常、文件异常）进行专门处理
   - 提供更具体的错误信息和建议

3. **错误日志**
   - 记录所有错误的详细信息，包括：
     - 错误时间
     - 错误代码
     - 错误描述
     - 触发错误的请求信息
     - 堆栈跟踪

4. **监控与告警**
   - 监控系统错误率和类型
   - 对严重错误进行告警
   - 定期分析错误趋势

### 4.2 客户端异常处理

1. **网络异常处理**
   - 处理网络连接中断
   - 实现重试机制
   - 显示网络状态提示

2. **认证异常处理**
   - 捕获 Token 过期错误
   - 自动尝试刷新 Token
   - 刷新失败时引导用户重新配对

3. **业务异常处理**
   - 根据错误码显示相应的用户提示
   - 提供重试选项
   - 记录错误信息用于调试

4. **UI 错误处理**
   - 显示友好的错误提示
   - 提供清晰的错误原因和解决建议
   - 避免应用崩溃

## 5. 重试机制

### 5.1 网络请求重试

- **指数退避策略**：
  - 第 1 次重试：1秒后
  - 第 2 次重试：2秒后
  - 第 3 次重试：4秒后
  - 以此类推，最大延迟 30 秒
- **最大重试次数**：3-5次
- **适用场景**：网络临时故障、服务器暂时不可用

### 5.2 WebSocket 重连

- **检测机制**：
  - 心跳超时检测
  - 连接关闭事件
- **重连策略**：
  - 立即尝试重连
  - 采用指数退避
  - 最大尝试次数：10次
- **状态恢复**：
  - 重连成功后发送同步请求
  - 恢复之前的会话状态

### 5.3 任务执行重试

- **适用场景**：临时网络故障导致的任务中断
- **重试条件**：
  - 网络恢复
  - 任务状态为 "pending" 或 "running"
- **最大重试次数**：3次

## 6. 错误监控与分析

### 6.1 服务端监控

1. **错误日志收集**
   - 使用结构化日志
   - 包含错误码、时间、请求信息等
   - 支持日志查询和分析

2. **错误率统计**
   - 按错误类型统计错误率
   - 按时间段分析错误趋势
   - 识别高频错误和异常模式

3. **告警机制**
   - 严重错误实时告警
   - 错误率超过阈值告警
   - 服务不可用告警

### 6.2 客户端监控

1. **用户错误反馈**
   - 收集用户遇到的错误
   - 提供错误反馈渠道
   - 分析用户报告的问题

2. **崩溃报告**
   - 收集应用崩溃信息
   - 分析崩溃原因
   - 优先修复高频崩溃

3. **性能监控**
   - 监控请求响应时间
   - 分析网络延迟
   - 优化用户体验

## 7. 最佳实践

1. **错误信息清晰明确**
   - 提供具体的错误原因
   - 给出明确的解决建议
   - 避免技术术语，使用用户友好的语言

2. **错误处理一致**
   - 统一错误响应格式
   - 一致的错误码使用
   - 相同类型的错误采用相同的处理策略

3. **预防胜于治疗**
   - 输入验证
   - 边界条件检查
   - 异常情况预判

4. **安全考虑**
   - 不在错误消息中暴露敏感信息
   - 避免详细的错误信息被用于攻击
   - 对错误信息进行适当的脱敏处理

5. **持续改进**
   - 定期分析错误数据
   - 优化错误处理流程
   - 减少系统中的错误率

## 8. 示例错误处理流程

### 8.1 API 请求错误处理

```typescript
// 客户端 API 请求错误处理
async function fetchApi(endpoint, options) {
  try {
    const response = await fetch(endpoint, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiError(errorData.code, errorData.error, errorData.details);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      // 处理特定错误
      switch (error.code) {
        case 401:
          // 处理认证错误
          await handleAuthError();
          break;
        case 403:
          // 处理权限错误
          showPermissionError();
          break;
        default:
          // 处理其他错误
          showError(error.message);
      }
    } else {
      // 处理网络错误等
      showNetworkError();
    }
    throw error;
  }
}
```

### 8.2 WebSocket 错误处理

```typescript
// 客户端 WebSocket 错误处理
class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.connect();
  }
  
  connect() {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.sendSyncRequest();
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.scheduleReconnect();
    }
  }
  
  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnect attempts reached');
      showReconnectError();
    }
  }
  
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'event' && message.payload?.category === 'error') {
        const errorData = message.payload.data;
        this.handleWebSocketError(errorData);
      } else {
        // 处理正常消息
        this.onMessage(message);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }
  
  handleWebSocketError(errorData) {
    switch (errorData.code) {
      case 1003: // Token 无效
        handleAuthError();
        break;
      case 2005: // 心跳超时
        this.scheduleReconnect();
        break;
      default:
        showError(errorData.message);
    }
  }
}
```

## 9. 总结

有效的错误处理是系统稳定性和用户体验的重要组成部分。通过定义清晰的错误码、统一的错误处理策略和完善的监控机制，可以：

1. **提高系统可靠性**：及时发现和处理错误
2. **改善用户体验**：提供清晰的错误提示和解决建议
3. **简化开发调试**：统一的错误格式和详细的错误日志
4. **增强系统安全性**：适当的错误信息处理，避免信息泄露

本文档定义的错误码和处理策略应在整个系统中统一使用，确保错误处理的一致性和有效性。