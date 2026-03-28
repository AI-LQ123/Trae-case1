import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WebSocketState {
  connected: boolean;
  reconnecting: boolean;
  lastPingTime: number;
  latency: number;
  error: string | null;
}

const initialState: WebSocketState = {
  connected: false,
  reconnecting: false,
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
      }
    },
    setReconnecting: (state, action: PayloadAction<boolean>) => {
      state.reconnecting = action.payload;
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
    resetState: () => {
      return initialState;
    },
  },
});

export const {
  setConnected,
  setReconnecting,
  setLastPingTime,
  setLatency,
  setError,
  resetState,
} = websocketSlice.actions;

export default websocketSlice.reducer;
