import { configureStore } from '@reduxjs/toolkit';
import { enableMapSet } from 'immer';
import websocketReducer from './slices/websocketSlice';
import chatReducer from './slices/chatSlice';
import terminalReducer from './slices/terminalSlice';
import taskReducer from './slices/taskSlice';
import projectReducer from './slices/projectSlice';
import settingsReducer from './slices/settingsSlice';
import notificationReducer from './slices/notificationSlice';

// 启用 Immer 的 MapSet 插件以支持 Set 类型的状态管理
enableMapSet();

export const store = configureStore({
  reducer: {
    websocket: websocketReducer,
    chat: chatReducer,
    terminal: terminalReducer,
    tasks: taskReducer,
    project: projectReducer,
    settings: settingsReducer,
    notification: notificationReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['websocket/setSocket'],
        ignoredPaths: ['websocket.socket'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
