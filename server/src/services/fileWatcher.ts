import fs from 'fs';
import path from 'path';
import * as chokidar from 'chokidar';
import { logger } from '../utils/logger';

interface FileWatcherOptions {
  rootPath: string;
  ignored?: string[];
  debounceTime?: number; // 防抖时间，单位毫秒
  eventDebounceTime?: number; // 事件去重时间，单位毫秒
  maxWatchers?: number; // 最大监听器数量
}

interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  stats?: { size: number; mtime: number };
}

class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private readonly rootPath: string;
  private readonly ignored: string[];
  private readonly debounceTime: number;
  private readonly eventDebounceTime: number;
  private readonly maxWatchers: number;
  private callbacks: ((event: FileChangeEvent) => void)[] = [];
  private isWatching: boolean = false;
  private eventCache: Map<string, NodeJS.Timeout> = new Map();
  private processedFiles: Set<string> = new Set();
  private fileMoveMap: Map<string, string> = new Map(); // 用于跟踪文件移动

  constructor(options: FileWatcherOptions) {
    this.rootPath = path.resolve(options.rootPath);
    this.ignored = options.ignored || [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.log',
      '**/.DS_Store',
      '**/Thumbs.db'
    ];
    this.debounceTime = options.debounceTime || 300;
    this.eventDebounceTime = options.eventDebounceTime || 1000;
    this.maxWatchers = options.maxWatchers || 10000;
  }

  /**
   * 启动文件监听
   */
  start(): void {
    if (this.isWatching) {
      logger.warn('File watcher is already running');
      return;
    }

    try {
      // 检查目录数量
      const dirCount = this.countDirectories(this.rootPath);
      if (dirCount > this.maxWatchers) {
        logger.warn(`Directory count (${dirCount}) exceeds max watchers (${this.maxWatchers})`);
      }

      // 使用chokidar创建监听器
      this.watcher = chokidar.watch(this.rootPath, {
        ignored: this.ignored,
        persistent: true,
        depth: 99,
        ignoreInitial: true,
        followSymlinks: false,
        usePolling: false,
        interval: 100,
        binaryInterval: 300,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 100
        }
      });

      // 监听事件
      this.watcher
        .on('add', (filePath: string) => this.handleDebouncedEvent('add', filePath))
        .on('change', (filePath: string) => this.handleDebouncedEvent('change', filePath))
        .on('unlink', (filePath: string) => {
          // 记录可能的移动操作
          this.fileMoveMap.set(filePath, Date.now().toString());
          this.handleDebouncedEvent('unlink', filePath);
        })
        .on('addDir', (dirPath: string) => this.handleDebouncedEvent('addDir', dirPath))
        .on('unlinkDir', (dirPath: string) => this.handleDebouncedEvent('unlinkDir', dirPath))
        .on('error', (error: unknown) => {
          logger.error(`File watcher error: ${(error as Error).message}`);
        });

      this.isWatching = true;
      logger.info(`File watcher started for: ${this.rootPath}`);
    } catch (error) {
      logger.error(`Failed to start file watcher: ${(error as Error).message}`);
      this.isWatching = false;
    }
  }

  /**
   * 处理防抖事件
   */
  private handleDebouncedEvent(eventType: FileChangeEvent['type'], filePath: string): void {
    // 延迟处理，避免频繁触发
    const cacheKey = `${eventType}:${filePath}`;
    if (this.eventCache.has(cacheKey)) {
      clearTimeout(this.eventCache.get(cacheKey)!);
    }
    
    const timeout = setTimeout(() => {
      this.handleFileEvent(eventType, filePath);
      this.eventCache.delete(cacheKey);
    }, this.debounceTime);
    
    this.eventCache.set(cacheKey, timeout);
  }

  /**
   * 处理文件事件
   */
  private async handleFileEvent(eventType: FileChangeEvent['type'], filePath: string): Promise<void> {
    try {
      if (eventType === 'add') {
        // 检查是否是移动操作
        const movedFrom = this.checkFileMove(filePath);
        if (movedFrom) {
          logger.debug(`File moved from ${movedFrom} to ${filePath}`);
          // 可以在这里触发移动事件
        }
      }

      let stats: fs.Stats | undefined;
      try {
        stats = await fs.promises.stat(filePath);
      } catch (error) {
        // 文件可能已被删除
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }

      this.emitEvent(eventType, filePath, stats);
    } catch (error) {
      logger.warn(`Failed to handle file event for ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * 检查文件是否是从其他位置移动过来的
   */
  private checkFileMove(newPath: string): string | null {
    // 简单的移动检测逻辑
    // 实际项目中可能需要更复杂的实现
    for (const [oldPath, timestamp] of this.fileMoveMap.entries()) {
      const timeDiff = Date.now() - parseInt(timestamp);
      if (timeDiff < 1000) { // 1秒内的操作视为可能的移动
        // 检查文件名是否相同
        if (path.basename(oldPath) === path.basename(newPath)) {
          this.fileMoveMap.delete(oldPath);
          return oldPath;
        }
      } else {
        // 清理过期的移动记录
        this.fileMoveMap.delete(oldPath);
      }
    }
    return null;
  }

  /**
   * 统计目录数量
   */
  private countDirectories(dirPath: string): number {
    let count = 0;
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !this.isIgnored(path.join(dirPath, entry.name))) {
          count++;
          count += this.countDirectories(path.join(dirPath, entry.name));
        }
      }
    } catch (error) {
      logger.warn(`Failed to count directories in ${dirPath}: ${(error as Error).message}`);
    }
    return count;
  }

  /**
   * 停止文件监听
   */
  async stop(): Promise<void> {
    if (!this.isWatching) {
      logger.warn('File watcher is not running');
      return;
    }

    try {
      // 清除所有防抖定时器
      for (const timeout of this.eventCache.values()) {
        clearTimeout(timeout);
      }
      this.eventCache.clear();
      this.processedFiles.clear();
      this.fileMoveMap.clear();

      // 关闭监听器
      if (this.watcher) {
        await this.watcher.close();
        this.watcher = null;
      }
      this.isWatching = false;
      logger.info('File watcher stopped');
    } catch (error) {
      logger.error(`Failed to stop file watcher: ${(error as Error).message}`);
    }
  }

  /**
   * 订阅文件变化事件
   */
  onFileChange(callback: (event: FileChangeEvent) => void): () => void {
    this.callbacks.push(callback);
    
    // 返回取消订阅的函数
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * 触发事件
   */
  private emitEvent(type: FileChangeEvent['type'], filePath: string, stats?: fs.Stats): void {
    // 生成事件唯一键
    const eventKey = `${type}:${filePath}`;
    
    // 检查是否已经处理过这个事件
    if (this.processedFiles.has(eventKey)) {
      return;
    }
    
    // 对于change事件，检查是否刚刚触发了add事件
    if (type === 'change') {
      const addEventKey = `add:${filePath}`;
      if (this.processedFiles.has(addEventKey)) {
        return;
      }
    }
    
    // 标记为已处理
    this.processedFiles.add(eventKey);
    
    // 事件去重时间后移除标记，允许相同事件再次触发
    setTimeout(() => {
      this.processedFiles.delete(eventKey);
    }, this.eventDebounceTime);
    
    const event: FileChangeEvent = {
      type,
      path: filePath
    };

    if (stats) {
      event.stats = {
        size: stats.size,
        mtime: stats.mtime.getTime()
      };
    }

    // 通知所有订阅者
    this.callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error(`Error in file change callback: ${(error as Error).message}`);
      }
    });

    // 记录事件
    logger.debug(`File change event: ${type} - ${filePath}`);
  }

  /**
   * 检查路径是否被忽略
   */
  private isIgnored(filePath: string): boolean {
    // 检查路径是否包含被忽略的目录
    const relativePath = path.relative(this.rootPath, filePath);
    
    // 检查是否在被忽略的目录中
    for (const pattern of this.ignored) {
      const patternWithoutGlob = pattern.replace('**/', '');
      // 检查路径的任何部分是否匹配被忽略的模式
      const patternParts = patternWithoutGlob.split('/');
      const pathParts = relativePath.split(path.sep);
      
      // 检查路径是否包含被忽略的目录
      for (const part of patternParts) {
        if (pathParts.includes(part)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 获取当前监听状态
   */
  getStatus(): {
    isWatching: boolean;
    rootPath: string;
    ignored: string[];
    watching: boolean;
  } {
    return {
      isWatching: this.isWatching,
      rootPath: this.rootPath,
      ignored: this.ignored,
      watching: this.watcher !== null
    };
  }

  /**
   * 手动触发一次文件扫描
   */
  async scan(): Promise<string[]> {
    if (!this.isWatching) {
      throw new Error('File watcher is not running');
    }

    try {
      const files: string[] = [];

      const traverse = async (dirPath: string) => {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          // 检查是否被忽略
          if (this.isIgnored(fullPath)) continue;

          if (entry.isFile()) {
            files.push(fullPath);
          } else if (entry.isDirectory()) {
            await traverse(fullPath);
          }
        }
      };

      await traverse(this.rootPath);
      logger.info(`File scan completed. Found ${files.length} files.`);
      return files;
    } catch (error) {
      logger.error(`Failed to scan files: ${(error as Error).message}`);
      throw new Error(`Failed to scan files: ${(error as Error).message}`);
    }
  }
}

// 导出类
export { FileWatcher };

// 导出默认实例创建函数
export default (options: FileWatcherOptions) => new FileWatcher(options);