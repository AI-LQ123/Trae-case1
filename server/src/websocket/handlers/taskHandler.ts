import { WebSocketMessage, CommandPayload, Task, TaskCreateRequest, TaskOperationRequest } from '../../models/types';
import { MessageHandler } from '../messageRouter';
import { ConnectionManager } from '../connectionManager';
import { taskScheduler } from '../../services/taskScheduler';
import { taskStore } from '../../store/taskStore';
import { logger } from '../../utils/logger';

export class TaskHandler implements MessageHandler {
  private connectionManager: ConnectionManager;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
    this.setupTaskUpdateCallback();
  }

  private setupTaskUpdateCallback(): void {
    taskScheduler.setUpdateCallback((taskId: string, updates: Partial<Task>) => {
      this.broadcastTaskUpdate(taskId, updates);
    });
  }

  private broadcastTaskUpdate(taskId: string, updates: Partial<Task>): void {
    const message: WebSocketMessage = {
      type: 'event',
      id: `evt-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      deviceId: 'server',
      payload: {
        category: 'task_update',
        data: {
          taskId,
          ...updates,
        },
      },
    };

    for (const connection of this.connectionManager.getAllConnections()) {
      if (connection.ws.readyState === 1) {
        connection.ws.send(JSON.stringify(message));
      }
    }
  }

  private sendToDevice(deviceId: string, message: WebSocketMessage): void {
    const connection = this.connectionManager.getConnection(deviceId);
    if (connection && connection.ws.readyState === 1) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  private sendError(deviceId: string, id: string, errorMessage: string): void {
    const message: WebSocketMessage = {
      type: 'event',
      id,
      timestamp: Date.now(),
      deviceId: 'server',
      payload: {
        category: 'error',
        data: {
          code: 'TASK_ERROR',
          message: errorMessage,
        },
      },
    };
    this.sendToDevice(deviceId, message);
  }

  private sendSuccess(deviceId: string, id: string, data: any): void {
    const message: WebSocketMessage = {
      type: 'event',
      id,
      timestamp: Date.now(),
      deviceId: 'server',
      payload: {
        category: 'task_response',
        data,
      },
    };
    this.sendToDevice(deviceId, message);
  }

  async handle(message: WebSocketMessage, deviceId: string): Promise<void> {
    try {
      if (message.type !== 'command' || !message.payload || !('category' in message.payload)) {
        return;
      }

      const payload = message.payload as CommandPayload;
      if (payload.category !== 'task') {
        return;
      }

      const action = payload.action;
      const data = payload.data;

      logger.info('Handling task command', {
        context: 'TaskHandler',
        metadata: { deviceId, action, data },
      });

      switch (action) {
        case 'create':
          await this.handleCreateTask(message.id, deviceId, data as unknown as TaskCreateRequest);
          break;
        case 'start':
          await this.handleStartTask(message.id, deviceId, data);
          break;
        case 'operate':
          await this.handleOperateTask(message.id, deviceId, data as unknown as TaskOperationRequest);
          break;
        case 'list':
          await this.handleListTasks(message.id, deviceId, data);
          break;
        case 'get':
          await this.handleGetTask(message.id, deviceId, data);
          break;
        case 'delete':
          await this.handleDeleteTask(message.id, deviceId, data);
          break;
        default:
          this.sendError(deviceId, message.id, `Unknown task action: ${action}`);
      }
    } catch (error) {
      logger.error('Error handling task command', {
        context: 'TaskHandler',
        metadata: { deviceId, error: (error as Error).message },
      });
      this.sendError(deviceId, message.id, (error as Error).message);
    }
  }

  private async handleCreateTask(messageId: string, deviceId: string, data: TaskCreateRequest): Promise<void> {
    if (!data.name || !data.command) {
      this.sendError(deviceId, messageId, 'Missing required fields: name and command');
      return;
    }

    const task = await taskScheduler.createTask(data);
    this.sendSuccess(deviceId, messageId, { task });
  }

  private async handleStartTask(messageId: string, deviceId: string, data: any): Promise<void> {
    const taskId = data.taskId;
    if (!taskId) {
      this.sendError(deviceId, messageId, 'Missing taskId');
      return;
    }

    const success = await taskScheduler.startTask(taskId);
    if (success) {
      const task = taskStore.getTask(taskId);
      this.sendSuccess(deviceId, messageId, { task });
    } else {
      this.sendError(deviceId, messageId, 'Failed to start task');
    }
  }

  private async handleOperateTask(messageId: string, deviceId: string, data: TaskOperationRequest): Promise<void> {
    if (!data.taskId || !data.operation) {
      this.sendError(deviceId, messageId, 'Missing required fields: taskId and operation');
      return;
    }

    if (data.operation === 'cancel') {
      const success = await taskScheduler.cancelTask(data.taskId);
      if (success) {
        const task = taskStore.getTask(data.taskId);
        this.sendSuccess(deviceId, messageId, { task });
      } else {
        this.sendError(deviceId, messageId, 'Failed to cancel task');
      }
    } else {
      this.sendError(deviceId, messageId, `Unsupported operation: ${data.operation}`);
    }
  }

  private async handleListTasks(messageId: string, deviceId: string, data: any): Promise<void> {
    const page = data.page || 1;
    const pageSize = data.pageSize || 100;
    const status = data.status;

    let tasks;
    if (status) {
      tasks = taskStore.getTasksByStatus(status);
    } else {
      tasks = taskStore.getAllTasks(page, pageSize);
    }

    this.sendSuccess(deviceId, messageId, { tasks });
  }

  private async handleGetTask(messageId: string, deviceId: string, data: any): Promise<void> {
    const taskId = data.taskId;
    if (!taskId) {
      this.sendError(deviceId, messageId, 'Missing taskId');
      return;
    }

    const task = taskStore.getTask(taskId);
    if (task) {
      this.sendSuccess(deviceId, messageId, { task });
    } else {
      this.sendError(deviceId, messageId, 'Task not found');
    }
  }

  private async handleDeleteTask(messageId: string, deviceId: string, data: any): Promise<void> {
    const taskId = data.taskId;
    if (!taskId) {
      this.sendError(deviceId, messageId, 'Missing taskId');
      return;
    }

    if (taskScheduler.isTaskRunning(taskId)) {
      this.sendError(deviceId, messageId, 'Cannot delete a running task');
      return;
    }

    const success = await taskStore.deleteTask(taskId);
    if (success) {
      this.sendSuccess(deviceId, messageId, { taskId, deleted: true });
    } else {
      this.sendError(deviceId, messageId, 'Task not found');
    }
  }
}
