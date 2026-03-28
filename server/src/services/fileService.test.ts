import fs from 'fs';
import path from 'path';
import fileService from './fileService';

describe('FileService', () => {
  const testDir = path.join(__dirname, 'test-files');
  const testFile = path.join(testDir, 'test.txt');
  const testSubDir = path.join(testDir, 'subdir');
  const testSubFile = path.join(testSubDir, 'subfile.txt');

  beforeAll(async () => {
    // 创建测试目录
    await fs.promises.mkdir(testSubDir, { recursive: true });
    // 创建测试文件
    await fs.promises.writeFile(testFile, 'Hello, World!', 'utf-8');
    await fs.promises.writeFile(testSubFile, 'Subfile content', 'utf-8');
  });

  afterAll(async () => {
    // 清理测试目录
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const content = await fileService.readFile(testFile);
      expect(content).toBe('Hello, World!');
    });

    it('should throw error for non-existent file', async () => {
      await expect(fileService.readFile('non-existent-file.txt')).rejects.toThrow();
    });
  });

  describe('writeFile', () => {
    it('should write file content', async () => {
      const newFile = path.join(testDir, 'new-file.txt');
      await fileService.writeFile(newFile, 'New content');
      const content = await fs.promises.readFile(newFile, 'utf-8');
      expect(content).toBe('New content');
    });

    it('should create directory if it does not exist', async () => {
      const nestedFile = path.join(testDir, 'nested', 'deep', 'file.txt');
      await fileService.writeFile(nestedFile, 'Nested content');
      const content = await fs.promises.readFile(nestedFile, 'utf-8');
      expect(content).toBe('Nested content');
    });
  });

  describe('deleteFile', () => {
    it('should delete file', async () => {
      const fileToDelete = path.join(testDir, 'delete-me.txt');
      await fs.promises.writeFile(fileToDelete, 'Delete me', 'utf-8');
      await fileService.deleteFile(fileToDelete);
      await expect(fs.promises.access(fileToDelete)).rejects.toThrow();
    });
  });

  describe('listDirectory', () => {
    it('should list directory contents', async () => {
      const items = await fileService.listDirectory(testDir);
      expect(items.length).toBeGreaterThan(0);
      const fileNames = items.map(item => item.name);
      expect(fileNames).toContain('test.txt');
      expect(fileNames).toContain('subdir');
    });

    it('should sort directories before files', async () => {
      const items = await fileService.listDirectory(testDir);
      const firstItem = items[0];
      expect(firstItem.isDirectory).toBe(true);
    });
  });

  describe('getFileTree', () => {
    it('should get file tree', async () => {
      const tree = await fileService.getFileTree(testDir);
      expect(tree.name).toBe('test-files');
      expect(tree.isDirectory).toBe(true);
      expect(tree.children).toBeDefined();
      expect(tree.children?.length).toBeGreaterThan(0);
    });

    it('should respect max depth', async () => {
      const tree = await fileService.getFileTree(testDir, 1);
      expect(tree.children).toBeDefined();
      const subdir = tree.children?.find(item => item.name === 'subdir');
      expect(subdir).toBeDefined();
      expect((subdir as any).children).toBeUndefined();
    });
  });

  describe('getProjectInfo', () => {
    it('should get project info', async () => {
      const info = await fileService.getProjectInfo(testDir);
      expect(info.name).toBe('test-files');
      expect(info.path).toBe(testDir);
      expect(info.files).toBeGreaterThan(0);
      expect(info.directories).toBeGreaterThan(0);
    });

    it('should throw error for non-directory', async () => {
      await expect(fileService.getProjectInfo(testFile)).rejects.toThrow();
    });
  });

  describe('searchFiles', () => {
    it('should search files by name', async () => {
      const results = await fileService.searchFiles(testDir, 'test');
      expect(results.length).toBeGreaterThan(0);
      const fileNames = results.map(item => item.name);
      expect(fileNames).toContain('test.txt');
    });

    it('should return empty array for no matches', async () => {
      const results = await fileService.searchFiles(testDir, 'non-existent');
      expect(results.length).toBe(0);
    });

    it('should respect max results', async () => {
      // 创建多个测试文件
      for (let i = 0; i < 10; i++) {
        await fs.promises.writeFile(
          path.join(testDir, `test-${i}.txt`),
          `Content ${i}`,
          'utf-8'
        );
      }
      const results = await fileService.searchFiles(testDir, 'test', 5);
      expect(results.length).toBe(5);
    });
  });
});