import request from 'supertest';
import express from 'express';
import cors from 'cors';
import notificationRouter from '../src/api/routes/notification';

// 创建一个独立的Express应用进行测试
const app = express();

// 配置CORS
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id']
};
app.use(cors(corsOptions));
app.use(express.json());

// 注册通知路由
app.use('/api/notification', notificationRouter);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const TEST_DEVICE_ID = 'test-device-123';

describe('Notification API Integration Tests', () => {
  describe('GET /api/notification/config', () => {
    it('should return the current notification config', async () => {
      const response = await request(app).get('/api/notification/config');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('general');
      expect(response.body).toHaveProperty('channels');
      expect(response.body).toHaveProperty('types');
    });
  });

  describe('PUT /api/notification/config', () => {
    it('should update the notification config', async () => {
      const newConfig = {
        general: {
          enabled: false,
          maxNotifications: 50,
          expirationTime: 86400000
        },
        channels: {
          default: { enabled: true, sound: true, vibration: true },
          important: { enabled: true, sound: true, vibration: true },
          silent: { enabled: true, sound: false, vibration: false }
        },
        types: {
          mention: { enabled: false, channel: 'important' },
          error: { enabled: true, channel: 'important' },
          system: { enabled: false, channel: 'default' },
          info: { enabled: true, channel: 'default' },
          success: { enabled: true, channel: 'default' },
          warning: { enabled: true, channel: 'default' },
          fileChange: { enabled: true, channel: 'default' },
          taskCompleted: { enabled: true, channel: 'default' },
          taskFailed: { enabled: true, channel: 'important' },
          terminalOutput: { enabled: false, channel: 'silent' }
        }
      };

      const response = await request(app)
        .put('/api/notification/config')
        .send(newConfig);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('config');
    });

    it('should handle invalid config data', async () => {
      const invalidConfig = {
        general: {
          enabled: 'not a boolean' // 无效类型
        }
      };

      const response = await request(app)
        .put('/api/notification/config')
        .send(invalidConfig);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/notification/user-preferences', () => {
    it('should return user notification preferences', async () => {
      const response = await request(app)
        .get('/api/notification/user-preferences')
        .set('x-device-id', TEST_DEVICE_ID);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('deviceId', TEST_DEVICE_ID);
      expect(response.body).toHaveProperty('preferences');
      expect(response.body).toHaveProperty('lastUpdated');
    });

    it('should require device ID', async () => {
      const response = await request(app)
        .get('/api/notification/user-preferences');
      
      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/notification/user-preferences', () => {
    it('should update user notification preferences', async () => {
      const newPreferences = {
        preferences: {
          mention: false,
          error: true,
          system: false
        }
      };

      const response = await request(app)
        .put('/api/notification/user-preferences')
        .set('x-device-id', TEST_DEVICE_ID)
        .send(newPreferences);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('preferences');
    });

    it('should require device ID', async () => {
      const newPreferences = {
        preferences: {
          mention: false
        }
      };

      const response = await request(app)
        .put('/api/notification/user-preferences')
        .send(newPreferences);

      expect(response.status).toBe(400);
    });

    it('should require preferences', async () => {
      const response = await request(app)
        .put('/api/notification/user-preferences')
        .set('x-device-id', TEST_DEVICE_ID)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('Notification flow end-to-end', () => {
    it('should complete the full notification flow', async () => {
      // 1. 获取初始配置
      const getConfigResponse = await request(app).get('/api/notification/config');
      expect(getConfigResponse.status).toBe(200);

      // 2. 更新配置
      const updatedConfig = {
        general: {
          enabled: true,
          maxNotifications: 50,
          expirationTime: 86400000
        }
      };

      const updateConfigResponse = await request(app)
        .put('/api/notification/config')
        .send(updatedConfig);
      expect(updateConfigResponse.status).toBe(200);

      // 3. 获取用户偏好
      const getUserPrefsResponse = await request(app)
        .get('/api/notification/user-preferences')
        .set('x-device-id', TEST_DEVICE_ID);
      expect(getUserPrefsResponse.status).toBe(200);

      // 4. 更新用户偏好
      const updatedPrefs = {
        preferences: {
          mention: true,
          error: false,
          system: true
        }
      };

      const updatePrefsResponse = await request(app)
        .put('/api/notification/user-preferences')
        .set('x-device-id', TEST_DEVICE_ID)
        .send(updatedPrefs);
      expect(updatePrefsResponse.status).toBe(200);

      // 5. 验证配置和偏好已更新
      const finalConfigResponse = await request(app).get('/api/notification/config');
      expect(finalConfigResponse.status).toBe(200);

      const finalPrefsResponse = await request(app)
        .get('/api/notification/user-preferences')
        .set('x-device-id', TEST_DEVICE_ID);
      expect(finalPrefsResponse.status).toBe(200);
    });
  });
});
