export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'taskCompleted'
  | 'taskFailed'
  | 'mention'
  | 'fileChange'
  | 'terminalOutput';

export type NotificationChannel =
  | 'default'
  | 'important'
  | 'silent';

export interface NotificationChannelConfig {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
}

export interface NotificationTypeConfig {
  enabled: boolean;
  channel: NotificationChannel;
}

export interface NotificationConfig {
  general: {
    enabled: boolean;
    maxNotifications: number;
    expirationTime: number;
  };
  types: Record<NotificationType, NotificationTypeConfig>;
  channels: {
    default: NotificationChannelConfig;
    important: NotificationChannelConfig;
    silent: NotificationChannelConfig;
  };
}

export interface NotificationSettings {
  enabled: boolean;
  info: boolean;
  success: boolean;
  warning: boolean;
  error: boolean;
  taskCompleted: boolean;
  taskFailed: boolean;
  mention: boolean;
  fileChange: boolean;
  terminalOutput: boolean;
}

export interface UserNotificationPreferences {
  deviceId: string;
  preferences: Partial<Record<NotificationType, boolean>>;
  lastUpdated: number;
}
