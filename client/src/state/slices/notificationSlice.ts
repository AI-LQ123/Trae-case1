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
      // 修复：检查通知是否存在且未被dismissed过
      if (notification && !notification.dismissed) {
        notification.dismissed = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
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
    // 添加清理过期通知的reducer
    clearExpiredNotifications: (state, action: PayloadAction<number>) => {
      const expirationTime = action.payload;
      const now = Date.now();
      state.notifications = state.notifications.filter(n => {
        if (now - n.timestamp > expirationTime) {
          // 如果过期通知未读，减少未读计数
          if (!n.dismissed) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          return false;
        }
        return true;
      });
    },
  },
});

export const {
  addNotification,
  dismissNotification,
  dismissAllNotifications,
  clearDismissedNotifications,
  clearAllNotifications,
  clearExpiredNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;
