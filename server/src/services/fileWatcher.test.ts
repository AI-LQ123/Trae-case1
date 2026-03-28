import fs from 'fs';
import path from 'path';
import { FileWatcher } from './fileWatcher';

// 创建临时测试目录
const testDir = path.join(__dirname, 'test-watcher');
const testFile = path.join(testDir, 'test.txt');
const testSubDir = path.join(testDir, 'subdir');
const testSubFile = path.join(testSubDir, 'subtest.txt');

describe('FileWatcher', () => {
  let watcher: FileWatcher;
  let events: any[] = [];

  beforeEach(async () => {
    // 创建测试目录结构
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (!fs.existsSync(testSubDir)) {
      fs.mkdirSync(testSubDir, { recursive: true });
    }

    // 清空事件数组
    events = [];

    // 创建文件监听器
    watcher = new FileWatcher({
      rootPath: testDir,
      ignored: ['**/node_modules/**', '**/.git/**'],
      debounceTime: 100
    });

    // 订阅事件
    watcher.onFileChange((event) => {
      events.push(event);
    });
  });

  afterEach(async () => {
    // 停止监听器
    await watcher.stop();

    // 清理测试目录
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should start watching without errors', () => {
    watcher.start();
    const status = watcher.getStatus();
    expect(status.isWatching).toBe(true);
    expect(status.rootPath).toBe(testDir);
  });

  test('should stop watching when stop() is called', async () => {
    watcher.start();
    expect(watcher.getStatus().isWatching).toBe(true);

    await watcher.stop();
    expect(watcher.getStatus().isWatching).toBe(false);
  });

  test('should handle file creation event', async () => {
    watcher.start();

    // 等待监听器启动
    await new Promise(resolve => setTimeout(resolve, 500));

    // 创建文件
    fs.writeFileSync(testFile, 'test content');

    // 等待事件触发
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('add');
    expect(events[0].path).toBe(testFile);
    expect(events[0].stats).toBeDefined();
  });

  test('should handle file modification event', async () => {
    // 先创建文件
    fs.writeFileSync(testFile, 'initial content');

    watcher.start();

    // 等待监听器启动
    await new Promise(resolve => setTimeout(resolve, 500));

    // 修改文件
    fs.writeFileSync(testFile, 'modified content');

    // 等待事件触发
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('change');
    expect(events[0].path).toBe(testFile);
    expect(events[0].stats).toBeDefined();
  });

  test('should handle file deletion event', async () => {
    // 先创建文件
    fs.writeFileSync(testFile, 'test content');

    watcher.start();

    // 等待监听器启动
    await new Promise(resolve => setTimeout(resolve, 500));

    // 删除文件
    fs.unlinkSync(testFile);

    // 等待事件触发
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('unlink');
    expect(events[0].path).toBe(testFile);
  });

  test('should handle directory creation event', async () => {
    const newDir = path.join(testDir, 'newdir');

    watcher.start();

    // 等待监听器启动
    await new Promise(resolve => setTimeout(resolve, 500));

    // 创建目录
    fs.mkdirSync(newDir);

    // 等待事件触发
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('addDir');
    expect(events[0].path).toBe(newDir);
  });

  test('should handle directory deletion event', async () => {
    watcher.start();

    // 等待监听器启动
    await new Promise(resolve => setTimeout(resolve, 500));

    // 删除目录
    fs.rmSync(testSubDir, { recursive: true, force: true });

    // 等待事件触发
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('unlinkDir');
    expect(events[0].path).toBe(testSubDir);
  });

  test('should ignore specified patterns', async () => {
    const ignoredFile = path.join(testDir, 'node_modules', 'test.js');

    // 创建被忽略的目录和文件
    fs.mkdirSync(path.join(testDir, 'node_modules'), { recursive: true });
    fs.writeFileSync(ignoredFile, 'ignored content');

    watcher.start();

    // 等待监听器启动
    await new Promise(resolve => setTimeout(resolve, 500));

    // 修改被忽略的文件
    fs.writeFileSync(ignoredFile, 'modified ignored content');

    // 等待事件触发
    await new Promise(resolve => setTimeout(resolve, 500));

    // 应该没有事件触发，因为文件被忽略了
    expect(events.length).toBe(0);
  });

  test('should return correct status', () => {
    const status = watcher.getStatus();
    expect(status.isWatching).toBe(false);
    expect(status.rootPath).toBe(testDir);
    expect(status.ignored).toContain('**/node_modules/**');
    expect(status.watching).toBe(false);

    watcher.start();
    const runningStatus = watcher.getStatus();
    expect(runningStatus.isWatching).toBe(true);
    expect(runningStatus.watching).toBe(true);
  });

  test('should handle scan operation', async () => {
    // 创建测试文件
    fs.writeFileSync(testFile, 'test content');
    fs.writeFileSync(testSubFile, 'subtest content');

    watcher.start();

    // 等待监听器启动
    await new Promise(resolve => setTimeout(resolve, 500));

    const files = await watcher.scan();
    expect(files.length).toBe(2);
    expect(files).toContain(testFile);
    expect(files).toContain(testSubFile);
  });

  test('should allow unsubscribing from events', async () => {
    let eventCount = 0;

    // 订阅事件
    const unsubscribe = watcher.onFileChange(() => {
      eventCount++;
    });

    watcher.start();

    // 等待监听器启动
    await new Promise(resolve => setTimeout(resolve, 500));

    // 创建文件
    fs.writeFileSync(testFile, 'test content');

    // 等待事件触发
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(eventCount).toBe(1);

    // 取消订阅
    unsubscribe();

    // 再次修改文件
    fs.writeFileSync(testFile, 'modified content');

    // 等待事件触发
    await new Promise(resolve => setTimeout(resolve, 500));

    // 事件计数应该保持不变
    expect(eventCount).toBe(1);
  });
});