import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ConnectionSettings {
  serverHost: string;
  serverPort: number;
  useSSL: boolean;
  autoReconnect: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  taskCompleted: boolean;
  taskFailed: boolean;
  errors: boolean;
  mentions: boolean;
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
    taskCompleted: true,
    taskFailed: true,
    errors: true,
    mentions: true,
  },
  quickCommands: [
    { id: '1', name: 'Git Status', command: 'git status', category: 'terminal' },
    { id: '2', name: 'NPM Build', command: 'npm run build', category: 'terminal' },
    { id: '3', name: 'Run Tests', command: 'npm test', category: 'terminal' },
  ],
  theme: 'system',
  fontSize: 14,
};

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
} = settingsSlice.actions;

export default settingsSlice.reducer;
