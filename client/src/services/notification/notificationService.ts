import authService from '../auth/authService';
import { NotificationConfig, UserNotificationPreferences } from '../../../shared/types/notification';
import { handleFetchError, formatErrorForDisplay, ErrorDetails } from '../../utils/errorHandler';

class NotificationService {
  private async getServerUrl(): Promise<string> {
    const activeServer = await authService.getActiveServer();
    if (!activeServer) {
      throw new Error('No active server');
    }
    return activeServer.serverUrl;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const token = await authService.getToken();
    const deviceId = await authService.getDeviceId();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-device-id': deviceId
    };
  }

  async getServerConfig(): Promise<NotificationConfig> {
    try {
      const serverUrl = await this.getServerUrl();
      const headers = await this.getHeaders();
      
      const response = await fetch(`${serverUrl}/api/notification/config`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to get server config');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting server config:', error);
      const errorDetails = handleFetchError(error);
      throw new Error(formatErrorForDisplay(errorDetails));
    }
  }

  async updateServerConfig(config: Partial<NotificationConfig>): Promise<NotificationConfig> {
    try {
      const serverUrl = await this.getServerUrl();
      const headers = await this.getHeaders();
      
      const response = await fetch(`${serverUrl}/api/notification/config`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error('Failed to update server config');
      }

      const data = await response.json();
      return data.config;
    } catch (error) {
      console.error('Error updating server config:', error);
      const errorDetails = handleFetchError(error);
      throw new Error(formatErrorForDisplay(errorDetails));
    }
  }

  async getUserPreferences(): Promise<UserNotificationPreferences> {
    try {
      const serverUrl = await this.getServerUrl();
      const headers = await this.getHeaders();
      
      const response = await fetch(`${serverUrl}/api/notification/user-preferences`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to get user preferences');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user preferences:', error);
      const errorDetails = handleFetchError(error);
      throw new Error(formatErrorForDisplay(errorDetails));
    }
  }

  async updateUserPreferences(preferences: Partial<Record<string, boolean>>): Promise<UserNotificationPreferences> {
    try {
      const serverUrl = await this.getServerUrl();
      const headers = await this.getHeaders();
      
      const response = await fetch(`${serverUrl}/api/notification/user-preferences`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ preferences })
      });

      if (!response.ok) {
        throw new Error('Failed to update user preferences');
      }

      const data = await response.json();
      return data.preferences;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      const errorDetails = handleFetchError(error);
      throw new Error(formatErrorForDisplay(errorDetails));
    }
  }

  async syncNotificationSettings(settings: any): Promise<{ config: NotificationConfig; preferences: UserNotificationPreferences }> {
    try {
      // 将客户端设置转换为服务端偏好格式
      const preferences: Partial<Record<string, boolean>> = {
        info: settings.info,
        success: settings.success,
        warning: settings.warning,
        error: settings.error,
        taskCompleted: settings.taskCompleted,
        taskFailed: settings.taskFailed,
        mention: settings.mention,
        fileChange: settings.fileChange,
        terminalOutput: settings.terminalOutput
      };

      // 更新用户偏好
      const updatedPreferences = await this.updateUserPreferences(preferences);
      
      // 获取最新的全局配置
      const config = await this.getServerConfig();
      
      return { config, preferences: updatedPreferences };
    } catch (error) {
      console.error('Error syncing notification settings:', error);
      const errorDetails = handleFetchError(error);
      throw new Error(formatErrorForDisplay(errorDetails));
    }
  }
}

const notificationService = new NotificationService();
export default notificationService;
