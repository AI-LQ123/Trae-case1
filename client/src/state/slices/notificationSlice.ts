import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  data?: Record<string, any>;
  dismissed?: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      state.unreadCount += 1;
      
      // 限制通知数量，只保留最近20条
      if (state.notifications.length > 20) {
        state.notifications = state.notifications.slice(0, 20);
      }
    },
    dismissNotification: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.dismissed = true;
        if (state.unreadCount > 0) {
          state.unreadCount -= 1;
        }
      }
    },
    dismissAllNotifications: (state) => {
      state.notifications.forEach(notification => {
        notification.dismissed = true;
      });
      state.unreadCount = 0;
    },
    clearDismissedNotifications: (state) => {
      state.notifications = state.notifications.filter(n => !n.dismissed);
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
  },
});

export const {
  addNotification,
  dismissNotification,
  dismissAllNotifications,
  clearDismissedNotifications,
  clearAllNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;