import * as fs from 'fs';
import * as path from 'path';

export interface NotificationChannelConfig {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
}

export interface NotificationTypeConfig {
  enabled: boolean;
  channel: 'default' | 'important' | 'silent';
}

export interface NotificationConfig {
  general: {
    enabled: boolean;
    maxNotifications: number;
    expirationTime: number;
  };
  types: {
    info: NotificationTypeConfig;
    success: NotificationTypeConfig;
    warning: NotificationTypeConfig;
    error: NotificationTypeConfig;
    taskCompleted: NotificationTypeConfig;
    taskFailed: NotificationTypeConfig;
    mention: NotificationTypeConfig;
    fileChange: NotificationTypeConfig;
    terminalOutput: NotificationTypeConfig;
  };
  channels: {
    default: NotificationChannelConfig;
    important: NotificationChannelConfig;
    silent: NotificationChannelConfig;
  };
}

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
  private configPath?: string;
  private listeners: Array<(config: NotificationConfig) => void> = [];

  constructor(initialConfig?: Partial<NotificationConfig>, configPath?: string) {
    this.configPath = configPath;
    
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
    if (!this.configPath) {
      return null;
    }

    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load notification config:', error);
    }
    return null;
  }

  private saveConfig(): void {
    if (!this.configPath) {
      return;
    }

    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.warn('Failed to save notification config:', error);
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

  isTypeEnabled(type: keyof NotificationConfig['types']): boolean {
    return this.config.general.enabled && this.config.types[type]?.enabled;
  }

  getChannelForType(type: keyof NotificationConfig['types']): NotificationChannelConfig {
    const channelName = this.config.types[type]?.channel || 'default';
    return this.config.channels[channelName];
  }

  shouldSendNotification(
    type: keyof NotificationConfig['types'],
    userPreferences?: Partial<NotificationConfig['types']>
  ): boolean {
    if (!this.config.general.enabled) {
      return false;
    }

    if (userPreferences && userPreferences[type]?.enabled !== undefined) {
      return userPreferences[type].enabled;
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
