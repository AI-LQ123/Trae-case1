import { Router, Request, Response } from 'express';
import { NotificationConfigManager } from '../../services/notification/config';
import { UserNotificationPreferences, NotificationConfig } from '../../../../shared/types/notification';
import { sqliteService } from '../../services/db/sqliteService';
import { notificationConfigSchema, userPreferencesSchema } from '../../schemas/notificationSchema';
import { AppError, ErrorCode, createErrorResponse } from '../../utils/errorHandler';

const router = Router();
const notificationConfigManager = new NotificationConfigManager();

// 获取服务端通知配置
router.get('/config', (req: Request, res: Response) => {
  try {
    const config = notificationConfigManager.getConfig();
    res.json(config);
  } catch (error) {
    const errorResponse = createErrorResponse(
      new AppError('Failed to get notification config', ErrorCode.INTERNAL_ERROR, 500),
      req.path
    );
    res.status(500).json(errorResponse);
  }
});

// 更新服务端通知配置
router.put('/config', (req: Request, res: Response) => {
  try {
    const validationResult = notificationConfigSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorResponse = createErrorResponse(
        new AppError('Invalid config data', ErrorCode.BAD_REQUEST, 400, {
          details: validationResult.error.errors
        }),
        req.path
      );
      return res.status(400).json(errorResponse);
    }
    
    const partialConfig = validationResult.data as Partial<NotificationConfig>;
    notificationConfigManager.updateConfig(partialConfig);
    res.json({ success: true, config: notificationConfigManager.getConfig() });
  } catch (error) {
    const errorResponse = createErrorResponse(
      new AppError('Invalid config data', ErrorCode.BAD_REQUEST, 400),
      req.path
    );
    res.status(400).json(errorResponse);
  }
});

// 获取当前客户端的个性化偏好
router.get('/user-preferences', (req: Request, res: Response) => {
  try {
    const deviceId = req.headers['x-device-id'] as string;
    if (!deviceId) {
      const errorResponse = createErrorResponse(
        new AppError('Device ID is required', ErrorCode.BAD_REQUEST, 400),
        req.path
      );
      return res.status(400).json(errorResponse);
    }

    const userPrefs = sqliteService.getUserPreferences(deviceId);
    if (userPrefs) {
      res.json(userPrefs);
    } else {
      const defaultPrefs = {
        deviceId,
        preferences: {},
        lastUpdated: Date.now()
      };
      sqliteService.saveUserPreferences(deviceId, defaultPrefs.preferences);
      res.json(defaultPrefs);
    }
  } catch (error) {
    const errorResponse = createErrorResponse(
      new AppError('Failed to get user preferences', ErrorCode.INTERNAL_ERROR, 500),
      req.path
    );
    res.status(500).json(errorResponse);
  }
});

// 更新当前客户端的个性化偏好
router.put('/user-preferences', (req: Request, res: Response) => {
  try {
    const deviceId = req.headers['x-device-id'] as string;
    if (!deviceId) {
      const errorResponse = createErrorResponse(
        new AppError('Device ID is required', ErrorCode.BAD_REQUEST, 400),
        req.path
      );
      return res.status(400).json(errorResponse);
    }

    const validationResult = userPreferencesSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorResponse = createErrorResponse(
        new AppError('Invalid preferences data', ErrorCode.BAD_REQUEST, 400, {
          details: validationResult.error.errors
        }),
        req.path
      );
      return res.status(400).json(errorResponse);
    }

    const { preferences } = validationResult.data;

    const userPrefs = {
      deviceId,
      preferences,
      lastUpdated: Date.now()
    };

    sqliteService.saveUserPreferences(deviceId, preferences);
    res.json({ success: true, preferences: userPrefs });
  } catch (error) {
    const errorResponse = createErrorResponse(
      new AppError('Invalid preferences data', ErrorCode.BAD_REQUEST, 400),
      req.path
    );
    res.status(400).json(errorResponse);
  }
});

export default router;
