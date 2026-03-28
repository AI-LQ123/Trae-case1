import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TerminalSession {
  id: string;
  name: string;
  cwd: string;
  createdAt: number;
}

export interface TerminalOutput {
  id: string;
  sessionId: string;
  type: 'stdout' | 'stderr' | 'command';
  content: string;
  timestamp: number;
}

interface TerminalState {
  sessions: TerminalSession[];
  currentSessionId: string | null;
  outputs: Record<string, TerminalOutput[]>;
  maxOutputLines: number;
}

const initialState: TerminalState = {
  sessions: [],
  currentSessionId: null,
  outputs: {},
  maxOutputLines: 10000,
};

const terminalSlice = createSlice({
  name: 'terminal',
  initialState,
  reducers: {
    setSessions: (state, action: PayloadAction<TerminalSession[]>) => {
      state.sessions = action.payload;
    },
    addSession: (state, action: PayloadAction<TerminalSession>) => {
      state.sessions.push(action.payload);
      if (!state.currentSessionId) {
        state.currentSessionId = action.payload.id;
      }
    },
    removeSession: (state, action: PayloadAction<string>) => {
      state.sessions = state.sessions.filter(s => s.id !== action.payload);
      delete state.outputs[action.payload];
      if (state.currentSessionId === action.payload) {
        state.currentSessionId = state.sessions[0]?.id || null;
      }
    },
    setCurrentSession: (state, action: PayloadAction<string | null>) => {
      state.currentSessionId = action.payload;
    },
    addOutput: (state, action: PayloadAction<TerminalOutput>) => {
      const { sessionId } = action.payload;
      if (!state.outputs[sessionId]) {
        state.outputs[sessionId] = [];
      }
      state.outputs[sessionId].push(action.payload);
      if (state.outputs[sessionId].length > state.maxOutputLines) {
        state.outputs[sessionId] = state.outputs[sessionId].slice(-state.maxOutputLines);
      }
    },
    clearOutput: (state, action: PayloadAction<string>) => {
      state.outputs[action.payload] = [];
    },
  },
});

export const {
  setSessions,
  addSession,
  removeSession,
  setCurrentSession,
  addOutput,
  clearOutput,
} = terminalSlice.actions;

export default terminalSlice.reducer;
