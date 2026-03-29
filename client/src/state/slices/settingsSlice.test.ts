import { configureStore } from '@reduxjs/toolkit';
import { NotificationSettings } from '../../../../shared/types/notification';
import settingsReducer, { 
  updateNotificationSettings, 
  syncNotificationSettings,
  fetchServerNotificationConfig
} from './settingsSlice';

jest.mock('../../services/notification/notificationService');

const mockNotificationService = require('../../services/notification/notificationService').default;

describe('settingsSlice', () => {
  const store = configureStore({
    reducer: {
      settings: settingsReducer,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with default state', () => {
    const state = store.getState().settings;
    expect(state.notifications.enabled).toBe(true);
    expect(state.notifications.info).toBe(true);
    expect(state.notifications.success).toBe(true);
    expect(state.notifications.warning).toBe(true);
    expect(state.notifications.error).toBe(true);
    expect(state.notifications.taskCompleted).toBe(true);
    expect(state.notifications.taskFailed).toBe(true);
    expect(state.notifications.mention).toBe(true);
    expect(state.notifications.fileChange).toBe(true);
    expect(state.notifications.terminalOutput).toBe(false);
    expect(state.syncStatus).toBe('idle');
    expect(state.syncError).toBeNull();
  });

  test('should update notification settings', () => {
    const newSettings: Partial<NotificationSettings> = {
      enabled: false,
      info: false,
      error: true,
    };

    store.dispatch(updateNotificationSettings(newSettings));
    const state = store.getState().settings;

    expect(state.notifications.enabled).toBe(false);
    expect(state.notifications.info).toBe(false);
    expect(state.notifications.error).toBe(true);
    expect(state.notifications.success).toBe(true); // Should not change
  });

  test('should update single notification setting', () => {
    store.dispatch(updateNotificationSettings({ info: false }));
    const state = store.getState().settings;
    expect(state.notifications.info).toBe(false);
    expect(state.notifications.success).toBe(true); // Should not change
  });

  test('should handle multiple notification setting updates', () => {
    store.dispatch(updateNotificationSettings({
      info: false,
      success: false,
      warning: false,
    }));
    const state = store.getState().settings;
    expect(state.notifications.info).toBe(false);
    expect(state.notifications.success).toBe(false);
    expect(state.notifications.warning).toBe(false);
    expect(state.notifications.error).toBe(true); // Should not change
  });

  test('should handle notification enabled toggle', () => {
    // Disable notifications
    store.dispatch(updateNotificationSettings({ enabled: false }));
    let state = store.getState().settings;
    expect(state.notifications.enabled).toBe(false);

    // Enable notifications
    store.dispatch(updateNotificationSettings({ enabled: true }));
    state = store.getState().settings;
    expect(state.notifications.enabled).toBe(true);
  });

  test('should preserve other settings when updating notifications', () => {
    // Update connection settings first
    store.dispatch({ 
      type: 'settings/updateConnectionSettings', 
      payload: { serverHost: 'test.com' } 
    });

    // Update notification settings
    store.dispatch(updateNotificationSettings({ info: false }));

    const state = store.getState().settings;
    expect(state.connection.serverHost).toBe('test.com');
    expect(state.notifications.info).toBe(false);
  });

  describe('async thunks', () => {
    test('syncNotificationSettings pending should set loading state', async () => {
      const settings: NotificationSettings = {
        enabled: true,
        info: true,
        success: true,
        warning: true,
        error: true,
        taskCompleted: true,
        taskFailed: true,
        mention: true,
        fileChange: true,
        terminalOutput: false,
      };

      mockNotificationService.syncNotificationSettings.mockImplementation(() => 
        new Promise(() => {})
      );

      const promise = store.dispatch(syncNotificationSettings(settings));
      let state = store.getState().settings;
      expect(state.syncStatus).toBe('loading');
      expect(state.syncError).toBeNull();
      
      promise.abort();
    });

    test('syncNotificationSettings fulfilled should update state', async () => {
      const settings: NotificationSettings = {
        enabled: true,
        info: false,
        success: true,
        warning: true,
        error: true,
        taskCompleted: true,
        taskFailed: true,
        mention: true,
        fileChange: true,
        terminalOutput: false,
      };

      const mockResponse = {
        success: true,
        config: {
          general: { enabled: false }
        },
        preferences: {
          deviceId: 'test-device',
          preferences: { info: false },
          lastUpdated: Date.now()
        }
      };

      mockNotificationService.syncNotificationSettings.mockResolvedValue(mockResponse);

      await store.dispatch(syncNotificationSettings(settings));
      const state = store.getState().settings;
      
      expect(state.syncStatus).toBe('succeeded');
      expect(state.syncError).toBeNull();
      expect(state.notifications.enabled).toBe(false);
    });

    test('syncNotificationSettings rejected should set error state', async () => {
      const settings: NotificationSettings = {
        enabled: true,
        info: true,
        success: true,
        warning: true,
        error: true,
        taskCompleted: true,
        taskFailed: true,
        mention: true,
        fileChange: true,
        terminalOutput: false,
      };

      const errorMessage = 'Sync failed';
      mockNotificationService.syncNotificationSettings.mockRejectedValue(new Error(errorMessage));

      await store.dispatch(syncNotificationSettings(settings));
      const state = store.getState().settings;
      
      expect(state.syncStatus).toBe('failed');
      expect(state.syncError).toBe(errorMessage);
    });

    test('fetchServerNotificationConfig should fetch config and preferences', async () => {
      const mockConfig = {
        general: { enabled: true, maxNotifications: 50, expirationTime: 86400000 },
        types: {},
        channels: {}
      };

      const mockPreferences = {
        deviceId: 'test-device',
        preferences: { info: false, error: true },
        lastUpdated: Date.now()
      };

      mockNotificationService.getServerConfig.mockResolvedValue(mockConfig);
      mockNotificationService.getUserPreferences.mockResolvedValue(mockPreferences);

      await store.dispatch(fetchServerNotificationConfig());
      const state = store.getState().settings;
      
      expect(state.syncStatus).toBe('succeeded');
      expect(state.notifications.enabled).toBe(true);
    });
  });
});
