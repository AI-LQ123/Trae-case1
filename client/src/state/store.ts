import { configureStore } from '@reduxjs/toolkit';
import websocketReducer from './slices/websocketSlice';
import chatReducer from './slices/chatSlice';
import terminalReducer from './slices/terminalSlice';
import taskReducer from './slices/taskSlice';
import projectReducer from './slices/projectSlice';
import settingsReducer from './slices/settingsSlice';
import notificationReducer from './slices/notificationSlice';

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
