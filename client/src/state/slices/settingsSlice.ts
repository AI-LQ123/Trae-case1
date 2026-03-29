import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { NotificationSettings } from '../../../../shared/types/notification';
import notificationService from '../../services/notification/notificationService';

export interface ConnectionSettings {
  serverHost: string;
  serverPort: number;
  useSSL: boolean;
  autoReconnect: boolean;
}

export interface QuickCommand {
  id: string;
  name: string;
  command: string;
  category: 'terminal' | 'ai';
}

interface SettingsState {
  connection: ConnectionSettings;
  notifications: NotificationSettings;
  quickCommands: QuickCommand[];
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  syncStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  syncError: string | null;
}

const initialState: SettingsState = {
  connection: {
    serverHost: '',
    serverPort: 3001,
    useSSL: false,
    autoReconnect: true,
  },
  notifications: {
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
  },
  quickCommands: [
    { id: '1', name: 'Git Status', command: 'git status', category: 'terminal' },
    { id: '2', name: 'NPM Build', command: 'npm run build', category: 'terminal' },
    { id: '3', name: 'Run Tests', command: 'npm test', category: 'terminal' },
  ],
  theme: 'system',
  fontSize: 14,
  syncStatus: 'idle',
  syncError: null,
};

// 异步thunk：同步通知设置到服务端
export const syncNotificationSettings = createAsyncThunk(
  'settings/syncNotificationSettings',
  async (settings: NotificationSettings, { rejectWithValue }) => {
    try {
      const result = await notificationService.syncNotificationSettings(settings);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sync notification settings');
    }
  }
);

// 异步thunk：从服务端获取最新的通知配置
export const fetchServerNotificationConfig = createAsyncThunk(
  'settings/fetchServerNotificationConfig',
  async (_, { rejectWithValue }) => {
    try {
      const config = await notificationService.getServerConfig();
      const preferences = await notificationService.getUserPreferences();
      return { config, preferences };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch server notification config');
    }
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateConnectionSettings: (state, action: PayloadAction<Partial<ConnectionSettings>>) => {
      state.connection = { ...state.connection, ...action.payload };
    },
    updateNotificationSettings: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    addQuickCommand: (state, action: PayloadAction<QuickCommand>) => {
      state.quickCommands.push(action.payload);
    },
    removeQuickCommand: (state, action: PayloadAction<string>) => {
      state.quickCommands = state.quickCommands.filter(cmd => cmd.id !== action.payload);
    },
    updateQuickCommand: (state, action: PayloadAction<QuickCommand>) => {
      const index = state.quickCommands.findIndex(cmd => cmd.id === action.payload.id);
      if (index !== -1) {
        state.quickCommands[index] = action.payload;
      }
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    setFontSize: (state, action: PayloadAction<number>) => {
      state.fontSize = action.payload;
    },
    resetSyncStatus: (state) => {
      state.syncStatus = 'idle';
      state.syncError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncNotificationSettings.pending, (state) => {
        state.syncStatus = 'loading';
        state.syncError = null;
      })
      .addCase(syncNotificationSettings.fulfilled, (state, action) => {
        state.syncStatus = 'succeeded';
        state.syncError = null;
        // 更新客户端状态为服务端返回的配置
        if (action.payload?.config) {
          // 确保通知总开关与服务端一致
          state.notifications.enabled = action.payload.config.general.enabled;
        }
      })
      .addCase(syncNotificationSettings.rejected, (state, action) => {
        state.syncStatus = 'failed';
        state.syncError = action.payload as string;
      })
      .addCase(fetchServerNotificationConfig.pending, (state) => {
        state.syncStatus = 'loading';
        state.syncError = null;
      })
      .addCase(fetchServerNotificationConfig.fulfilled, (state, action) => {
        state.syncStatus = 'succeeded';
        state.syncError = null;
        // 更新客户端状态为服务端返回的配置
        if (action.payload?.config) {
          // 确保通知总开关与服务端一致
          state.notifications.enabled = action.payload.config.general.enabled;
        }
        // 更新客户端的通知类型设置为用户偏好
        if (action.payload?.preferences?.preferences) {
          Object.entries(action.payload.preferences.preferences).forEach(([key, value]) => {
            if (key in state.notifications) {
              (state.notifications as any)[key] = value;
            }
          });
        }
      })
      .addCase(fetchServerNotificationConfig.rejected, (state, action) => {
        state.syncStatus = 'failed';
        state.syncError = action.payload as string;
      });
  },
});

export const {
  updateConnectionSettings,
  updateNotificationSettings,
  addQuickCommand,
  removeQuickCommand,
  updateQuickCommand,
  setTheme,
  setFontSize,
  resetSyncStatus,
} = settingsSlice.actions;

export default settingsSlice.reducer;
