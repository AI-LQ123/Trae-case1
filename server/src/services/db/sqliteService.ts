import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

class SQLiteService {
  private db: Database;

  constructor() {
    const dbPath = path.join(__dirname, '../../../storage/notification.db');
    this.ensureStorageDir();
    this.db = new Database(dbPath);
    this.initTables();
  }

  private ensureStorageDir() {
    const dir = path.join(__dirname, '../../../storage');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private initTables() {
    // 创建用户通知偏好表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_notification_preferences (
        deviceId TEXT PRIMARY KEY,
        preferences TEXT NOT NULL,
        lastUpdated INTEGER NOT NULL
      );
    `);
    
    // 创建全局通知配置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS global_notification_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        config TEXT NOT NULL,
        lastUpdated INTEGER NOT NULL,
        CONSTRAINT singleton CHECK (id = 1)
      );
    `);
  }

  // 获取用户偏好
  getUserPreferences(deviceId: string): { deviceId: string; preferences: any; lastUpdated: number } | null {
    const stmt = this.db.prepare(
      'SELECT deviceId, preferences, lastUpdated FROM user_notification_preferences WHERE deviceId = ?'
    );
    const result = stmt.get(deviceId);
    
    if (result) {
      return {
        deviceId: result.deviceId,
        preferences: JSON.parse(result.preferences),
        lastUpdated: result.lastUpdated
      };
    }
    return null;
  }

  // 保存用户偏好
  saveUserPreferences(deviceId: string, preferences: any): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO user_notification_preferences (deviceId, preferences, lastUpdated)
       VALUES (?, ?, ?)`
    );
    stmt.run(deviceId, JSON.stringify(preferences), Date.now());
  }

  // 获取所有用户偏好
  getAllUserPreferences(): Record<string, any> {
    const stmt = this.db.prepare(
      'SELECT deviceId, preferences, lastUpdated FROM user_notification_preferences'
    );
    const results = stmt.all();
    const preferences: Record<string, any> = {};
    
    results.forEach((result: any) => {
      preferences[result.deviceId] = {
        deviceId: result.deviceId,
        preferences: JSON.parse(result.preferences),
        lastUpdated: result.lastUpdated
      };
    });
    
    return preferences;
  }

  // 删除用户偏好
  deleteUserPreferences(deviceId: string): void {
    const stmt = this.db.prepare(
      'DELETE FROM user_notification_preferences WHERE deviceId = ?'
    );
    stmt.run(deviceId);
  }

  // 获取全局通知配置
  getGlobalConfig(): { id: number; config: any; lastUpdated: number } | null {
    const stmt = this.db.prepare(
      'SELECT id, config, lastUpdated FROM global_notification_config WHERE id = 1'
    );
    const result = stmt.get();
    
    if (result) {
      return {
        id: result.id,
        config: JSON.parse(result.config),
        lastUpdated: result.lastUpdated
      };
    }
    return null;
  }

  // 保存全局通知配置
  saveGlobalConfig(config: any): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO global_notification_config (id, config, lastUpdated)
       VALUES (1, ?, ?)`
    );
    stmt.run(JSON.stringify(config), Date.now());
  }

  // 关闭数据库连接
  close() {
    this.db.close();
  }
}

// 导出单例实例
export const sqliteService = new SQLiteService();
export default sqliteService;