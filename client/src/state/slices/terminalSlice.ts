import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TerminalSession {
  id: string;
  name: string;
  cwd: string;
  createdAt: number;
  status: 'active' | 'inactive' | 'closed';
}

export interface TerminalOutput {
  sessionId: string;
  data: string;
  timestamp: number;
  type: 'stdout' | 'stderr';
}

export interface TerminalCommand {
  id: string;
  sessionId: string;
  command: string;
  timestamp: number;
}

interface TerminalState {
  sessions: TerminalSession[];
  currentSessionId: string | null;
  outputs: Record<string, TerminalOutput[]>;
  commandHistory: Record<string, TerminalCommand[]>;
  loading: boolean;
  error: string | null;
  cols: number;
  rows: number;
}

const initialState: TerminalState = {
  sessions: [],
  currentSessionId: null,
  outputs: {},
  commandHistory: {},
  loading: false,
  error: null,
  cols: 80,
  rows: 24,
};

const terminalSlice = createSlice({
  name: 'terminal',
  initialState,
  reducers: {
    setSessions: (state, action: PayloadAction<TerminalSession[]>) => {
      state.sessions = action.payload;
    },
    addSession: (state, action: PayloadAction<TerminalSession>) => {
      state.sessions.unshift(action.payload);
      if (!state.currentSessionId) {
        state.currentSessionId = action.payload.id;
      }
      state.outputs[action.payload.id] = [];
      state.commandHistory[action.payload.id] = [];
    },
    removeSession: (state, action: PayloadAction<string>) => {
      const sessionId = action.payload;
      const removedIndex = state.sessions.findIndex(s => s.id === sessionId);
      state.sessions = state.sessions.filter(s => s.id !== sessionId);
      delete state.outputs[sessionId];
      delete state.commandHistory[sessionId];
      if (state.currentSessionId === sessionId) {
        // 优先切换到下一个会话，如果没有则切换到上一个，否则为null
        const nextIndex = removedIndex < state.sessions.length ? removedIndex : removedIndex - 1;
        state.currentSessionId = nextIndex >= 0 ? state.sessions[nextIndex].id : null;
      }
    },
    updateSession: (state, action: PayloadAction<Partial<TerminalSession> & { id: string }>) => {
      const session = state.sessions.find(s => s.id === action.payload.id);
      if (session) {
        Object.assign(session, action.payload);
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
      const maxOutputs = 1000;
      if (state.outputs[sessionId].length > maxOutputs) {
        state.outputs[sessionId] = state.outputs[sessionId].slice(-maxOutputs);
      }
    },
    clearOutput: (state, action: PayloadAction<string>) => {
      const sessionId = action.payload;
      state.outputs[sessionId] = [];
    },
    addCommand: (state, action: PayloadAction<TerminalCommand>) => {
      const { sessionId } = action.payload;
      if (!state.commandHistory[sessionId]) {
        state.commandHistory[sessionId] = [];
      }
      state.commandHistory[sessionId].push(action.payload);
      const maxHistory = 100;
      if (state.commandHistory[sessionId].length > maxHistory) {
        state.commandHistory[sessionId] = state.commandHistory[sessionId].slice(-maxHistory);
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setTerminalSize: (state, action: PayloadAction<{ cols: number; rows: number }>) => {
      state.cols = action.payload.cols;
      state.rows = action.payload.rows;
    },
    clearAllOutputs: (state) => {
      state.outputs = {};
      state.commandHistory = {};
    },
  },
});

export const {
  setSessions,
  addSession,
  removeSession,
  updateSession,
  setCurrentSession,
  addOutput,
  clearOutput,
  addCommand,
  setLoading,
  setError,
  setTerminalSize,
  clearAllOutputs,
} = terminalSlice.actions;

export const selectCurrentSessionOutputs = (state: { terminal: { currentSessionId: string | null; outputs: Record<string, any[]>; } }) =>
  state.terminal.currentSessionId
    ? state.terminal.outputs[state.terminal.currentSessionId] || []
    : [];

export const selectCurrentSessionCommands = (state: { terminal: { currentSessionId: string | null; commandHistory: Record<string, any[]>; } }) =>
  state.terminal.currentSessionId
    ? state.terminal.commandHistory[state.terminal.currentSessionId] || []
    : [];

export const selectCurrentSession = (state: { terminal: { currentSessionId: string | null; sessions: Array<{ id: string; }>; } }) =>
  state.terminal.sessions.find(s => s.id === state.terminal.currentSessionId);

export default terminalSlice.reducer;
