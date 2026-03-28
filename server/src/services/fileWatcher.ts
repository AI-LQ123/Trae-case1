import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

interface FileWatcherOptions {
  rootPath: string;
  ignored?: string[];
  debounceTime?: number; // 防抖时间，单位毫秒
}

interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  stats?: { size: number; mtime: number };
}

class FileWatcher {
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private readonly rootPath: string;
  private readonly ignored: string[];
  private readonly debounceTime: number;
  private callbacks: ((event: FileChangeEvent) => void)[] = [];
  private isWatching: boolean = false;
  private eventCache: Map<string, NodeJS.Timeout> = new Map();
  private processedFiles: Set<string> = new Set();

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
      this.traverseAndWatch(this.rootPath);
      this.isWatching = true;
      logger.info(`File watcher started for: ${this.rootPath}`);
    } catch (error) {
      logger.error(`Failed to start file watcher: ${(error as Error).message}`);
      this.isWatching = false;
    }
  }

  /**
   * 遍历目录并开始监听
   */
  private traverseAndWatch(dirPath: string): void {
    // 检查是否被忽略
    if (this.isIgnored(dirPath)) {
      return;
    }

    // 监听当前目录
    const watcher = fs.watch(dirPath, { recursive: false }, (eventType, filename) => {
      if (!filename) return;

      const fullPath = path.join(dirPath, filename);
      
      // 检查是否被忽略
      if (this.isIgnored(fullPath)) {
        return;
      }

      // 延迟处理，避免频繁触发
      const cacheKey = `${eventType}:${fullPath}`;
      if (this.eventCache.has(cacheKey)) {
        clearTimeout(this.eventCache.get(cacheKey)!);
      }
      
      const timeout = setTimeout(() => {
        this.handleFileEvent(eventType, fullPath);
        this.eventCache.delete(cacheKey);
      }, this.debounceTime);
      
      this.eventCache.set(cacheKey, timeout);
    });

    this.watchers.set(dirPath, watcher);

    // 遍历子目录
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDirPath = path.join(dirPath, entry.name);
          this.traverseAndWatch(subDirPath);
        }
      }
    } catch (error) {
      logger.warn(`Failed to traverse directory ${dirPath}: ${(error as Error).message}`);
    }
  }

  /**
   * 处理文件事件
   */
  private handleFileEvent(eventType: string, filePath: string): void {
    try {
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        // 检查是否是新创建的目录
        if (!this.watchers.has(filePath)) {
          this.traverseAndWatch(filePath);
          this.emitEvent('addDir', filePath);
        }
      } else {
        // 文件事件
        if (eventType === 'change') {
          this.emitEvent('change', filePath, stats);
        } else if (eventType === 'rename') {
          // 检查文件是否存在
          try {
            fs.accessSync(filePath);
            this.emitEvent('add', filePath, stats);
          } catch {
            this.emitEvent('unlink', filePath);
          }
        }
      }
    } catch (error) {
      // 文件可能已被删除
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // 检查是否是目录
        if (this.watchers.has(filePath)) {
          const watcher = this.watchers.get(filePath);
          if (watcher) {
            watcher.close();
          }
          this.watchers.delete(filePath);
          this.emitEvent('unlinkDir', filePath);
        } else {
          // 只处理文件删除事件，避免目录删除时的大量事件
          if (!fs.existsSync(path.dirname(filePath))) {
            // 父目录不存在，可能是目录被删除，跳过
            return;
          }
          this.emitEvent('unlink', filePath);
        }
      } else {
        logger.warn(`Failed to handle file event for ${filePath}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * 停止文件监听
   */
  stop(): void {
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

      // 关闭所有监听器
      for (const [dirPath, watcher] of this.watchers) {
        watcher.close();
      }
      this.watchers.clear();
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
    
    // 1秒后移除标记，允许相同事件再次触发
    setTimeout(() => {
      this.processedFiles.delete(eventKey);
    }, 1000);
    
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
    watchedDirectories: number;
  } {
    return {
      isWatching: this.isWatching,
      rootPath: this.rootPath,
      ignored: this.ignored,
      watchedDirectories: this.watchers.size
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