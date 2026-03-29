import { configureStore } from '@reduxjs/toolkit';
import settingsReducer, { updateNotificationSettings, NotificationSettings } from './settingsSlice';

describe('settingsSlice', () => {
  const store = configureStore({
    reducer: {
      settings: settingsReducer,
    },
  });

  beforeEach(() => {
    store.dispatch({ type: 'RESET' });
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
});
