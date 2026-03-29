import { z } from 'zod';

// 通知通道配置模式
const channelSchema = z.object({
  enabled: z.boolean(),
  sound: z.boolean(),
  vibration: z.boolean()
});

// 通知类型配置模式
const notificationTypeSchema = z.object({
  enabled: z.boolean(),
  channel: z.enum(['default', 'important', 'silent'])
});

// 通知配置模式
const notificationConfigSchema = z.object({
  general: z.object({
    enabled: z.boolean(),
    maxNotifications: z.number().min(1).max(1000),
    expirationTime: z.number().min(0)
  }).optional(),
  channels: z.object({
    default: channelSchema,
    important: channelSchema,
    silent: channelSchema
  }).optional(),
  types: z.object({
    mention: notificationTypeSchema,
    error: notificationTypeSchema,
    system: notificationTypeSchema,
    info: notificationTypeSchema,
    success: notificationTypeSchema,
    warning: notificationTypeSchema,
    fileChange: notificationTypeSchema,
    taskCompleted: notificationTypeSchema,
    taskFailed: notificationTypeSchema,
    terminalOutput: notificationTypeSchema
  }).optional()
});

// 用户偏好模式
const userPreferencesSchema = z.object({
  preferences: z.record(z.string(), z.boolean())
});

export {
  notificationConfigSchema,
  userPreferencesSchema
};