import { Task } from '../models/types';
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(__dirname, '../../storage');
const TASKS_FILE = path.join(STORAGE_DIR, 'tasks.json');

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export class TaskStore {
  private tasks: Map<string, Task> = new Map();
  private loaded = false;
  private writeQueue: Promise<void> = Promise.resolve();
  private static cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.loadTasks().catch(error => {
      console.error('Error loading tasks in constructor:', error);
    });
    if (!TaskStore.cleanupTimer) {
      TaskStore.cleanupTimer = setInterval(() => this.cleanupOldTasks(), 24 * 60 * 60 * 1000);
    }
  }

  private async loadTasks(): Promise<void> {
    try {
      if (await fs.promises.access(TASKS_FILE).then(() => true).catch(() => false)) {
        const data = await fs.promises.readFile(TASKS_FILE, 'utf8');
        const tasks = JSON.parse(data);
        tasks.forEach((task: Task) => {
          this.tasks.set(task.id, task);
        });
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      this.loaded = true;
    }
  }

  private async saveTasks(): Promise<void> {
    if (!this.loaded) return;
    
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        const tasks = Array.from(this.tasks.values());
        await fs.promises.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
      } catch (error) {
        console.error('Failed to save tasks:', error);
      }
    }).catch(error => {
      console.error('Error in write queue:', error);
    });
    
    await this.writeQueue;
  }

  async addTask(task: Task): Promise<void> {
    this.tasks.set(task.id, task);
    await this.saveTasks();
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(taskId);
    if (task) {
      const updatedTask = { ...task, ...updates };
      this.tasks.set(taskId, updatedTask);
      await this.saveTasks();
      return updatedTask;
    }
    return undefined;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const deleted = this.tasks.delete(taskId);
    if (deleted) {
      await this.saveTasks();
    }
    return deleted;
  }

  getAllTasks(page: number = 1, pageSize: number = 100): Task[] {
    const tasks = Array.from(this.tasks.values());
    
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 100;
    if (pageSize > 1000) pageSize = 1000;
    
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return tasks.slice(startIndex, endIndex).sort((a, b) => b.createdAt - a.createdAt);
  }

  getTasksByStatus(status: Task['status']): Task[] {
    return Array.from(this.tasks.values())
      .filter(task => task.status === status)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async cleanupOldTasks(): Promise<number> {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const [taskId, task] of this.tasks.entries()) {
      const taskDate = task.completedAt || task.createdAt;
      if (taskDate < thirtyDaysAgo) {
        this.tasks.delete(taskId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      await this.saveTasks();
    }

    return deletedCount;
  }

  clearAllTasks(): void {
    this.tasks.clear();
    this.saveTasks().catch(error => {
      console.error('Error saving tasks after clear:', error);
    });
  }
}

export const taskStore = new TaskStore();
