import fs from 'fs';
import path from 'path';
import { FileInfo, DirectoryInfo, FileSystemItem, ProjectInfo } from '../models/types';

class FileService {
  private readonly allowedExtensions = [
    '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt',
    '.html', '.css', '.scss', '.less', '.yml', '.yaml',
    '.jsonc', '.jsdoc', '.tsdoc'
  ];

  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file: ${(error as Error).message}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // 确保目录存在
      const dir = path.dirname(filePath);
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write file: ${(error as Error).message}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete file: ${(error as Error).message}`);
    }
  }

  async listDirectory(directoryPath: string): Promise<FileSystemItem[]> {
    try {
      const entries = await fs.promises.readdir(directoryPath, { withFileTypes: true });
      const items: FileSystemItem[] = [];

      for (const entry of entries) {
        const fullPath = path.join(directoryPath, entry.name);
        const stats = await fs.promises.stat(fullPath);

        if (entry.isFile()) {
          if (this.allowedExtensions.some((ext: string) => entry.name.endsWith(ext))) {
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
      throw new Error(`Failed to list directory: ${(error as Error).message}`);
    }
  }

  async getFileTree(directoryPath: string, maxDepth: number = 3, currentDepth: number = 0): Promise<DirectoryInfo> {
    try {
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

        if (entry.isFile()) {
          if (this.allowedExtensions.some((ext: string) => entry.name.endsWith(ext))) {
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
      throw new Error(`Failed to get file tree: ${(error as Error).message}`);
    }
  }

  async getProjectInfo(projectPath: string): Promise<ProjectInfo> {
    try {
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
      throw new Error(`Failed to get project info: ${(error as Error).message}`);
    }
  }

  private async countFilesAndDirectories(directoryPath: string): Promise<{ files: number; directories: number }> {
    let files = 0;
    let directories = 0;

    const traverse = async (dirPath: string) => {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isFile()) {
          if (this.allowedExtensions.some((ext: string) => entry.name.endsWith(ext))) {
            files++;
          }
        } else if (entry.isDirectory()) {
          directories++;
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
      const results: FileInfo[] = [];

      const search = async (dirPath: string) => {
        if (results.length >= maxResults) return;

        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (results.length >= maxResults) break;

          const fullPath = path.join(dirPath, entry.name);
          
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
      throw new Error(`Failed to search files: ${(error as Error).message}`);
    }
  }
}

export default new FileService();