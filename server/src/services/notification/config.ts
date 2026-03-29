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

  constructor(initialConfig?: Partial<NotificationConfig>, configPath?: string) {
    this.config = {
      ...defaultNotificationConfig,
      ...initialConfig,
      general: {
        ...defaultNotificationConfig.general,
        ...initialConfig?.general,
      },
      types: {
        ...defaultNotificationConfig.types,
        ...initialConfig?.types,
      },
      channels: {
        ...defaultNotificationConfig.channels,
        ...initialConfig?.channels,
      },
    };
    this.configPath = configPath;
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
  }
}

export const notificationConfigManager = new NotificationConfigManager();
