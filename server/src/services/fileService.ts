import fs from 'fs';
import path from 'path';
import { FileInfo, DirectoryInfo, FileSystemItem, ProjectInfo } from '../models/types';
import { logger } from '../utils/logger';
import { FileWatcher } from './fileWatcher';

interface FileServiceOptions {
  allowedExtensions?: string[];
  maxFileSize?: number; // 单位：字节，默认10MB
  rootPath?: string; // 根路径，用于路径安全校验
}

class FileService {
  private readonly allowedExtensions: string[];
  private readonly maxFileSize: number;
  private readonly rootPath: string | null;

  constructor(options: FileServiceOptions = {}) {
    this.allowedExtensions = options.allowedExtensions || [
      '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt',
      '.html', '.css', '.scss', '.less', '.yml', '.yaml',
      '.jsonc', '.jsdoc', '.tsdoc'
    ];
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 默认10MB
    this.rootPath = options.rootPath || null;
  }

  /**
   * 验证路径安全，防止路径遍历攻击
   */
  private validatePath(targetPath: string): boolean {
    if (!this.rootPath) {
      // 如果没有设置根路径，允许所有路径（不推荐用于生产环境）
      return true;
    }

    // 解析为绝对路径
    const resolvedTarget = path.resolve(targetPath);
    const resolvedRoot = path.resolve(this.rootPath);

    // 确保目标路径在根路径之下
    return resolvedTarget.startsWith(resolvedRoot);
  }

  /**
   * 安全检查包装器
   */
  private checkPath(targetPath: string): void {
    if (!this.validatePath(targetPath)) {
      logger.warn(`Path traversal attempt detected: ${targetPath}`);
      throw new Error('Access denied: Invalid path');
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      this.checkPath(filePath);

      // 检查文件大小
      const stats = await fs.promises.stat(filePath);
      if (stats.size > this.maxFileSize) {
        throw new Error(`File size exceeds maximum limit of ${this.maxFileSize / 1024 / 1024}MB`);
      }

      const content = await fs.promises.readFile(filePath, 'utf-8');
      
      // 记录操作日志
      logger.info(`File read: ${filePath}, size: ${stats.size} bytes`);
      
      return content;
    } catch (error) {
      logger.error(`Failed to read file ${filePath}: ${(error as Error).message}`);
      throw new Error(`Failed to read file: ${(error as Error).message}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      this.checkPath(filePath);

      // 检查文件大小
      const sizeInBytes = Buffer.byteLength(content, 'utf-8');
      if (sizeInBytes > this.maxFileSize) {
        throw new Error(`File size exceeds maximum limit of ${this.maxFileSize / 1024 / 1024}MB`);
      }

      // 确保目录存在
      const dir = path.dirname(filePath);
      this.checkPath(dir); // 检查父目录路径
      await fs.promises.mkdir(dir, { recursive: true });
      
      await fs.promises.writeFile(filePath, content, 'utf-8');
      
      // 记录操作日志
      logger.info(`File written: ${filePath}, size: ${sizeInBytes} bytes`);
    } catch (error) {
      logger.error(`Failed to write file ${filePath}: ${(error as Error).message}`);
      throw new Error(`Failed to write file: ${(error as Error).message}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      this.checkPath(filePath);

      await fs.promises.unlink(filePath);
      
      // 记录操作日志
      logger.info(`File deleted: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to delete file ${filePath}: ${(error as Error).message}`);
      throw new Error(`Failed to delete file: ${(error as Error).message}`);
    }
  }

  async listDirectory(directoryPath: string): Promise<FileSystemItem[]> {
    try {
      this.checkPath(directoryPath);

      const entries = await fs.promises.readdir(directoryPath, { withFileTypes: true });
      const items: FileSystemItem[] = [];

      for (const entry of entries) {
        const fullPath = path.join(directoryPath, entry.name);
        
        // 使用 dirent 获取类型信息，避免不必要的 stat 调用
        if (entry.isFile()) {
          if (this.allowedExtensions.some((ext: string) => entry.name.endsWith(ext))) {
            // 仅在需要时获取文件详情
            const stats = await fs.promises.stat(fullPath);
            items.push({
              name: entry.name,
              path: fullPath,
              size: stats.size,
              mtime: stats.mtimeMs,
              isFile: true,
              isDirectory: false
            });
          }
        } else if (entry.isDirectory()) {
          items.push({
            name: entry.name,
            path: fullPath,
            isFile: false,
            isDirectory: true
          });
        }
      }

      return items.sort((a, b) => {
        // 目录排在前面
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        // 按名称排序
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      logger.error(`Failed to list directory ${directoryPath}: ${(error as Error).message}`);
      throw new Error(`Failed to list directory: ${(error as Error).message}`);
    }
  }

  async getFileTree(directoryPath: string, maxDepth: number = 3, currentDepth: number = 0): Promise<DirectoryInfo> {
    try {
      this.checkPath(directoryPath);

      // 添加绝对深度上限，防止无限递归
      const ABSOLUTE_MAX_DEPTH = 10;
      if (maxDepth > ABSOLUTE_MAX_DEPTH) {
        maxDepth = ABSOLUTE_MAX_DEPTH;
      }

      if (currentDepth >= maxDepth) {
        return {
          name: path.basename(directoryPath),
          path: directoryPath,
          isFile: false,
          isDirectory: true
        };
      }

      const entries = await fs.promises.readdir(directoryPath, { withFileTypes: true });
      const children: FileSystemItem[] = [];

      for (const entry of entries) {
        const fullPath = path.join(directoryPath, entry.name);
        
        // 跳过隐藏文件和目录
        if (entry.name.startsWith('.')) continue;

        // 使用 dirent 获取类型信息，避免不必要的 stat 调用
        if (entry.isFile()) {
          if (this.allowedExtensions.some((ext: string) => entry.name.endsWith(ext))) {
            // 仅在需要时获取文件详情
            const stats = await fs.promises.stat(fullPath);
            children.push({
              name: entry.name,
              path: fullPath,
              size: stats.size,
              mtime: stats.mtimeMs,
              isFile: true,
              isDirectory: false
            });
          }
        } else if (entry.isDirectory()) {
          const dirInfo = await this.getFileTree(fullPath, maxDepth, currentDepth + 1);
          children.push(dirInfo);
        }
      }

      return {
        name: path.basename(directoryPath),
        path: directoryPath,
        isFile: false,
        isDirectory: true,
        children: children.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        })
      };
    } catch (error) {
      logger.error(`Failed to get file tree ${directoryPath}: ${(error as Error).message}`);
      throw new Error(`Failed to get file tree: ${(error as Error).message}`);
    }
  }

  async getProjectInfo(projectPath: string): Promise<ProjectInfo> {
    try {
      this.checkPath(projectPath);

      const stats = await fs.promises.stat(projectPath);
      if (!stats.isDirectory()) {
        throw new Error('Project path is not a directory');
      }

      const { files, directories } = await this.countFilesAndDirectories(projectPath);
      const projectType = this.determineProjectType(projectPath);

      return {
        name: path.basename(projectPath),
        path: projectPath,
        type: projectType,
        files,
        directories
      };
    } catch (error) {
      logger.error(`Failed to get project info ${projectPath}: ${(error as Error).message}`);
      throw new Error(`Failed to get project info: ${(error as Error).message}`);
    }
  }

  private async countFilesAndDirectories(directoryPath: string): Promise<{ files: number; directories: number }> {
    let files = 0;
    let directories = 0;

    const traverse = async (dirPath: string) => {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        // 使用 dirent 获取类型信息，避免不必要的 stat 调用
        if (entry.isFile()) {
          if (this.allowedExtensions.some((ext: string) => entry.name.endsWith(ext))) {
            files++;
          }
        } else if (entry.isDirectory()) {
          directories++;
          const fullPath = path.join(dirPath, entry.name);
          await traverse(fullPath);
        }
      }
    };

    await traverse(directoryPath);
    return { files, directories };
  }

  private determineProjectType(projectPath: string): string {
    const files = fs.readdirSync(projectPath);
    
    if (files.includes('package.json')) return 'Node.js';
    if (files.includes('tsconfig.json')) return 'TypeScript';
    if (files.includes('requirements.txt')) return 'Python';
    if (files.includes('pom.xml')) return 'Java';
    if (files.includes('Cargo.toml')) return 'Rust';
    if (files.includes('go.mod')) return 'Go';
    if (files.includes('Gemfile')) return 'Ruby';
    if (files.includes('pubspec.yaml')) return 'Flutter';
    if (files.includes('build.gradle')) return 'Android';
    if (files.includes('Podfile')) return 'iOS';
    
    return 'Unknown';
  }

  async searchFiles(directoryPath: string, query: string, maxResults: number = 50): Promise<FileInfo[]> {
    try {
      this.checkPath(directoryPath);

      const results: FileInfo[] = [];

      const search = async (dirPath: string) => {
        if (results.length >= maxResults) return;

        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          if (results.length >= maxResults) break;

          const fullPath = path.join(dirPath, entry.name);

          // 使用 dirent 获取类型信息，避免不必要的 stat 调用
          if (entry.isFile()) {
            if (this.allowedExtensions.some((ext: string) => entry.name.endsWith(ext)) &&
                entry.name.toLowerCase().includes(query.toLowerCase())) {
              const stats = await fs.promises.stat(fullPath);
              results.push({
                name: entry.name,
                path: fullPath,
                size: stats.size,
                mtime: stats.mtimeMs,
                isFile: true,
                isDirectory: false
              });
            }
          } else if (entry.isDirectory()) {
            if (!entry.name.startsWith('.')) {
              await search(fullPath);
            }
          }
        }
      };

      await search(directoryPath);
      return results;
    } catch (error) {
      logger.error(`Failed to search files ${directoryPath}: ${(error as Error).message}`);
      throw new Error(`Failed to search files: ${(error as Error).message}`);
    }
  }

  /**
   * 获取文件统计信息
   */
  async getFileStats(filePath: string): Promise<fs.Stats> {
    try {
      this.checkPath(filePath);
      const stats = await fs.promises.stat(filePath);
      return stats;
    } catch (error) {
      logger.error(`Failed to get file stats ${filePath}: ${(error as Error).message}`);
      throw new Error(`Failed to get file stats: ${(error as Error).message}`);
    }
  }

  /**
   * 监听目录变化
   */
  async watchDirectory(
    directoryPath: string,
    callback: (event: string, path: string) => void
  ): Promise<{ close: () => Promise<void> }> {
    this.checkPath(directoryPath);

    const watcher = new FileWatcher({
      rootPath: directoryPath,
      debounceTime: 100,
      eventDebounceTime: 500,
    });

    watcher.onFileChange((event) => {
      callback(event.type, event.path);
    });

    watcher.start();

    return {
      close: async () => {
        await watcher.stop();
      },
    };
  }
}

// 导出单例实例，使用默认配置
export default new FileService();

// 导出类，允许自定义配置
export { FileService };
