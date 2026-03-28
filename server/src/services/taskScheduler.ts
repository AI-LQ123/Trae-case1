import { spawn, ChildProcess } from 'child_process';
import { Task, TaskCreateRequest } from '../models/types';
import { taskStore } from '../store/taskStore';
import { logger } from '../utils/logger';

export interface TaskUpdateCallback {
  (taskId: string, updates: Partial<Task>): void;
}

export class TaskScheduler {
  private runningTasks: Map<string, ChildProcess> = new Map();
  private updateCallback: TaskUpdateCallback | null = null;
  private taskTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {}

  setUpdateCallback(callback: TaskUpdateCallback): void {
    this.updateCallback = callback;
  }

  private notifyUpdate(taskId: string, updates: Partial<Task>): void {
    if (this.updateCallback) {
      this.updateCallback(taskId, updates);
    }
  }

  async createTask(request: TaskCreateRequest): Promise<Task> {
    const task: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: request.name,
      command: request.command,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      cwd: request.cwd,
      env: request.env,
      timeout: request.timeout,
    };

    await taskStore.addTask(task);
    logger.info('Task created', {
      context: 'TaskScheduler',
      metadata: { taskId: task.id, name: task.name },
    });

    return task;
  }

  async startTask(taskId: string): Promise<boolean> {
    const task = taskStore.getTask(taskId);
    if (!task || task.status !== 'pending') {
      logger.warn('Cannot start task', {
        context: 'TaskScheduler',
        metadata: { taskId, reason: 'Task not found or not pending' },
      });
      return false;
    }

    try {
      const updatedTask = await taskStore.updateTask(taskId, {
        status: 'running',
        startedAt: Date.now(),
        progress: 0,
      });

      if (!updatedTask) return false;

      this.notifyUpdate(taskId, {
        status: 'running',
        startedAt: Date.now(),
        progress: 0,
      });

      logger.info('Starting task', {
        context: 'TaskScheduler',
        metadata: { taskId, command: task.command },
      });

      const childProcess = spawn(task.command, {
        shell: true,
        cwd: task.cwd,
        env: { ...process.env, ...task.env },
      });

      this.runningTasks.set(taskId, childProcess);

      if (task.timeout) {
        const timeoutId = setTimeout(() => {
          this.timeoutTask(taskId);
        }, task.timeout * 1000);
        this.taskTimeouts.set(taskId, timeoutId);
      }

      let output = '';

      childProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        this.appendOutput(taskId, chunk);
      });

      childProcess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        this.appendOutput(taskId, chunk);
      });

      childProcess.on('close', async (code) => {
        this.clearTimeout(taskId);
        this.runningTasks.delete(taskId);

        const finalStatus = code === 0 ? 'completed' : 'failed';
        const finalProgress = code === 0 ? 100 : 0;

        await taskStore.updateTask(taskId, {
          status: finalStatus,
          completedAt: Date.now(),
          progress: finalProgress,
          output,
          error: code !== 0 ? `Process exited with code ${code}` : undefined,
        });

        this.notifyUpdate(taskId, {
          status: finalStatus,
          completedAt: Date.now(),
          progress: finalProgress,
          output,
          error: code !== 0 ? `Process exited with code ${code}` : undefined,
        });

        logger.info('Task completed', {
          context: 'TaskScheduler',
          metadata: { taskId, status: finalStatus, code },
        });
      });

      childProcess.on('error', async (error) => {
        this.clearTimeout(taskId);
        this.runningTasks.delete(taskId);

        await taskStore.updateTask(taskId, {
          status: 'failed',
          completedAt: Date.now(),
          progress: 0,
          output,
          error: error.message,
        });

        this.notifyUpdate(taskId, {
          status: 'failed',
          completedAt: Date.now(),
          progress: 0,
          output,
          error: error.message,
        });

        logger.error('Task error', {
          context: 'TaskScheduler',
          metadata: { taskId, error: error.message },
        });
      });

      return true;
    } catch (error) {
      logger.error('Failed to start task', {
        context: 'TaskScheduler',
        metadata: { taskId, error: (error as Error).message },
      });
      await taskStore.updateTask(taskId, {
        status: 'failed',
        error: (error as Error).message,
      });
      this.notifyUpdate(taskId, {
        status: 'failed',
        error: (error as Error).message,
      });
      return false;
    }
  }

  private appendOutput(taskId: string, chunk: string): void {
    const task = taskStore.getTask(taskId);
    if (task) {
      const newOutput = (task.output || '') + chunk;
      taskStore.updateTask(taskId, { output: newOutput });
      this.notifyUpdate(taskId, { output: newOutput });
    }
  }

  private clearTimeout(taskId: string): void {
    const timeoutId = this.taskTimeouts.get(taskId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.taskTimeouts.delete(taskId);
    }
  }

  private timeoutTask(taskId: string): void {
    const childProcess = this.runningTasks.get(taskId);
    if (childProcess) {
      childProcess.kill('SIGTERM');
      taskStore.updateTask(taskId, {
        status: 'failed',
        completedAt: Date.now(),
        error: 'Task timed out',
      });
      this.notifyUpdate(taskId, {
        status: 'failed',
        completedAt: Date.now(),
        error: 'Task timed out',
      });
      logger.warn('Task timed out', {
        context: 'TaskScheduler',
        metadata: { taskId },
      });
    }
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = taskStore.getTask(taskId);
    if (!task || task.status !== 'running') {
      logger.warn('Cannot cancel task', {
        context: 'TaskScheduler',
        metadata: { taskId, reason: 'Task not found or not running' },
      });
      return false;
    }

    const childProcess = this.runningTasks.get(taskId);
    if (childProcess) {
      this.clearTimeout(taskId);
      childProcess.kill('SIGTERM');
      this.runningTasks.delete(taskId);

      await taskStore.updateTask(taskId, {
        status: 'cancelled',
        completedAt: Date.now(),
      });
      this.notifyUpdate(taskId, {
        status: 'cancelled',
        completedAt: Date.now(),
      });

      logger.info('Task cancelled', {
        context: 'TaskScheduler',
        metadata: { taskId },
      });
      return true;
    }

    return false;
  }

  isTaskRunning(taskId: string): boolean {
    return this.runningTasks.has(taskId);
  }

  getRunningTasksCount(): number {
    return this.runningTasks.size;
  }

  shutdown(): void {
    for (const [taskId, childProcess] of this.runningTasks.entries()) {
      this.clearTimeout(taskId);
      childProcess.kill('SIGTERM');
      taskStore.updateTask(taskId, {
        status: 'cancelled',
        completedAt: Date.now(),
      });
    }
    this.runningTasks.clear();
    this.taskTimeouts.clear();
  }
}

export const taskScheduler = new TaskScheduler();
