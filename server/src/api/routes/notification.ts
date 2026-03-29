import { Router, Request, Response } from 'express';
import { notificationConfigManager } from '../../services/notification/config';
import { UserNotificationPreferences, NotificationConfig } from '../../../shared/types/notification';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();
const userPreferencesPath = path.join(__dirname, '../../../../storage/user-notification-preferences.json');

// 确保存储目录存在
const ensureStorageDir = () => {
  const dir = path.dirname(userPreferencesPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 加载用户偏好
const loadUserPreferences = (): Record<string, UserNotificationPreferences> => {
  ensureStorageDir();
  try {
    if (fs.existsSync(userPreferencesPath)) {
      const data = fs.readFileSync(userPreferencesPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Failed to load user preferences:', error);
  }
  return {};
};

// 保存用户偏好
const saveUserPreferences = (preferences: Record<string, UserNotificationPreferences>): void => {
  ensureStorageDir();
  try {
    fs.writeFileSync(userPreferencesPath, JSON.stringify(preferences, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Failed to save user preferences:', error);
  }
};

// 获取服务端通知配置
router.get('/config', (req: Request, res: Response) => {
  try {
    const config = notificationConfigManager.getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notification config' });
  }
});

// 更新服务端通知配置
router.put('/config', (req: Request, res: Response) => {
  try {
    const partialConfig = req.body as Partial<NotificationConfig>;
    notificationConfigManager.updateConfig(partialConfig);
    res.json({ success: true, config: notificationConfigManager.getConfig() });
  } catch (error) {
    res.status(400).json({ error: 'Invalid config data' });
  }
});

// 获取当前客户端的个性化偏好
router.get('/user-preferences', (req: Request, res: Response) => {
  try {
    const deviceId = req.headers['x-device-id'] as string;
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const preferences = loadUserPreferences();
    const userPrefs = preferences[deviceId] || {
      deviceId,
      preferences: {},
      lastUpdated: Date.now()
    };

    res.json(userPrefs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user preferences' });
  }
});

// 更新当前客户端的个性化偏好
router.put('/user-preferences', (req: Request, res: Response) => {
  try {
    const deviceId = req.headers['x-device-id'] as string;
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const { preferences } = req.body as { preferences: Partial<Record<string, boolean>> };
    if (!preferences) {
      return res.status(400).json({ error: 'Preferences are required' });
    }

    const allPrefs = loadUserPreferences();
    allPrefs[deviceId] = {
      deviceId,
      preferences,
      lastUpdated: Date.now()
    };

    saveUserPreferences(allPrefs);
    res.json({ success: true, preferences: allPrefs[deviceId] });
  } catch (error) {
    res.status(400).json({ error: 'Invalid preferences data' });
  }
});

export default router;
