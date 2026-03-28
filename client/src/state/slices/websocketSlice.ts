import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WebSocketState {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempt: number;
  lastPingTime: number;
  latency: number;
  error: string | null;
}

const initialState: WebSocketState = {
  connected: false,
  reconnecting: false,
  reconnectAttempt: 0,
  lastPingTime: 0,
  latency: 0,
  error: null,
};

const websocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
      if (action.payload) {
        state.error = null;
        state.reconnectAttempt = 0;
      }
    },
    setReconnecting: (state, action: PayloadAction<boolean>) => {
      state.reconnecting = action.payload;
    },
    incrementReconnectAttempt: state => {
      state.reconnectAttempt += 1;
    },
    setLastPingTime: (state, action: PayloadAction<number>) => {
      state.lastPingTime = action.payload;
    },
    setLatency: (state, action: PayloadAction<number>) => {
      state.latency = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    resetState: state => {
      return initialState;
    },
  },
});

export const {
  setConnected,
  setReconnecting,
  incrementReconnectAttempt,
  setLastPingTime,
  setLatency,
  setError,
  resetState,
} = websocketSlice.actions;

export default websocketSlice.reducer;
