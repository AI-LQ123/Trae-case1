import {
  NotificationType,
  NotificationChannel,
  NotificationChannelConfig,
  NotificationTypeConfig,
  NotificationConfig
} from '../../../../shared/types/notification';
import { sqliteService } from '../db/sqliteService';

export const defaultNotificationConfig: NotificationConfig = {
  general: {
    enabled: true,
    maxNotifications: 50,
    expirationTime: 86400000,
  },
  types: {
    info: {
      enabled: true,
      channel: 'default',
    },
    success: {
      enabled: true,
      channel: 'default',
    },
    warning: {
      enabled: true,
      channel: 'important',
    },
    error: {
      enabled: true,
      channel: 'important',
    },
    taskCompleted: {
      enabled: true,
      channel: 'default',
    },
    taskFailed: {
      enabled: true,
      channel: 'important',
    },
    mention: {
      enabled: true,
      channel: 'important',
    },
    fileChange: {
      enabled: true,
      channel: 'default',
    },
    terminalOutput: {
      enabled: false,
      channel: 'silent',
    },
  },
  channels: {
    default: {
      enabled: true,
      sound: true,
      vibration: true,
    },
    important: {
      enabled: true,
      sound: true,
      vibration: true,
    },
    silent: {
      enabled: true,
      sound: false,
      vibration: false,
    },
  },
};

export class NotificationConfigManager {
  private config: NotificationConfig;
  private listeners: Array<(config: NotificationConfig) => void> = [];

  constructor(initialConfig?: Partial<NotificationConfig>) {
    const loadedConfig = this.loadConfig();
    this.config = {
      ...defaultNotificationConfig,
      ...loadedConfig,
      ...initialConfig,
      general: {
        ...defaultNotificationConfig.general,
        ...loadedConfig?.general,
        ...initialConfig?.general,
      },
      types: {
        ...defaultNotificationConfig.types,
        ...loadedConfig?.types,
        ...initialConfig?.types,
      },
      channels: {
        ...defaultNotificationConfig.channels,
        ...loadedConfig?.channels,
        ...initialConfig?.channels,
      },
    };
  }

  private loadConfig(): Partial<NotificationConfig> | null {
    try {
      const result = sqliteService.getGlobalConfig();
      if (result) {
        return result.config;
      }
    } catch (error) {
      console.error('Failed to load notification config from SQLite:', error);
    }
    return null;
  }

  private saveConfig(): void {
    try {
      sqliteService.saveGlobalConfig(this.config);
    } catch (error) {
      console.error('Failed to save notification config to SQLite:', error);
    }
  }

  getConfig(): NotificationConfig {
    return this.config;
  }

  updateConfig(partialConfig: Partial<NotificationConfig>): void {
    this.config = {
      ...this.config,
      ...partialConfig,
      general: {
        ...this.config.general,
        ...partialConfig?.general,
      },
      types: {
        ...this.config.types,
        ...partialConfig?.types,
      },
      channels: {
        ...this.config.channels,
        ...partialConfig?.channels,
      },
    };
    
    this.saveConfig();
    this.notifyListeners();
  }

  isTypeEnabled(type: NotificationType): boolean {
    return this.config.general.enabled && this.config.types[type]?.enabled;
  }

  getChannelForType(type: NotificationType): NotificationChannelConfig {
    const channelName = this.config.types[type]?.channel || 'default';
    return this.config.channels[channelName];
  }

  shouldSendNotification(
    type: NotificationType,
    userPreferences?: Partial<Record<NotificationType, boolean>>
  ): boolean {
    if (!this.config.general.enabled) {
      return false;
    }

    if (userPreferences && userPreferences[type] !== undefined) {
      return userPreferences[type]!;
    }

    return this.config.types[type]?.enabled ?? false;
  }

  resetToDefaults(): void {
    this.config = { ...defaultNotificationConfig };
    this.saveConfig();
    this.notifyListeners();
  }

  addListener(listener: (config: NotificationConfig) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.warn('Error in config listener:', error);
      }
    });
  }
}

export const notificationConfigManager = new NotificationConfigManager();
