import * as path from 'path';
import * as fs from 'fs';
import { SQLiteService } from './sqliteService';

describe('SQLiteService', () => {
  let testDbPath: string;
  let sqliteService: SQLiteService;

  beforeEach(() => {
    const storageDir = path.join(__dirname, '../../../../storage/test');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    testDbPath = path.join(storageDir, `test-notification-${Date.now()}.db`);
    sqliteService = new SQLiteService(testDbPath);
  });

  afterEach(() => {
    sqliteService.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('user preferences operations', () => {
    test('should save and retrieve user preferences', () => {
      const deviceId = 'test-device-1';
      const preferences = {
        info: true,
        error: false,
        mention: true
      };

      sqliteService.saveUserPreferences(deviceId, preferences);
      const result = sqliteService.getUserPreferences(deviceId);

      expect(result).not.toBeNull();
      expect(result?.deviceId).toBe(deviceId);
      expect(result?.preferences).toEqual(preferences);
      expect(result?.lastUpdated).toBeDefined();
    });

    test('should return null for non-existent device', () => {
      const result = sqliteService.getUserPreferences('non-existent-device');
      expect(result).toBeNull();
    });

    test('should update existing user preferences', () => {
      const deviceId = 'test-device-2';
      const initialPrefs = { info: true, error: true };
      const updatedPrefs = { info: false, error: false, mention: true };

      sqliteService.saveUserPreferences(deviceId, initialPrefs);
      sqliteService.saveUserPreferences(deviceId, updatedPrefs);
      const result = sqliteService.getUserPreferences(deviceId);

      expect(result?.preferences).toEqual(updatedPrefs);
    });

    test('should get all user preferences', () => {
      sqliteService.saveUserPreferences('device1', { info: true });
      sqliteService.saveUserPreferences('device2', { error: false });

      const allPrefs = sqliteService.getAllUserPreferences();

      expect(Object.keys(allPrefs)).toHaveLength(2);
      expect(allPrefs['device1']).toBeDefined();
      expect(allPrefs['device2']).toBeDefined();
    });

    test('should delete user preferences', () => {
      const deviceId = 'test-device-3';
      sqliteService.saveUserPreferences(deviceId, { info: true });

      sqliteService.deleteUserPreferences(deviceId);
      const result = sqliteService.getUserPreferences(deviceId);

      expect(result).toBeNull();
    });
  });

  describe('global config operations', () => {
    test('should save and retrieve global config', () => {
      const config = {
        general: { enabled: true, maxNotifications: 50, expirationTime: 86400000 },
        types: {},
        channels: {}
      };

      sqliteService.saveGlobalConfig(config);
      const result = sqliteService.getGlobalConfig();

      expect(result).not.toBeNull();
      expect(result?.config).toEqual(config);
      expect(result?.lastUpdated).toBeDefined();
    });

    test('should return null when no global config exists', () => {
      const result = sqliteService.getGlobalConfig();
      expect(result).toBeNull();
    });

    test('should update existing global config', () => {
      const initialConfig = { general: { enabled: true } };
      const updatedConfig = { general: { enabled: false, maxNotifications: 100 } };

      sqliteService.saveGlobalConfig(initialConfig);
      sqliteService.saveGlobalConfig(updatedConfig);
      const result = sqliteService.getGlobalConfig();

      expect(result?.config).toEqual(updatedConfig);
    });
  });
});
