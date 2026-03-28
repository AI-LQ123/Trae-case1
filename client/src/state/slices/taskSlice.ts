import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Task {
  id: string;
  name: string;
  command: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  logs: string[];
}

interface TaskState {
  activeTasks: Task[];
  taskHistory: Task[];
  loading: boolean;
}

const initialState: TaskState = {
  activeTasks: [],
  taskHistory: [],
  loading: false,
};

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setActiveTasks: (state, action: PayloadAction<Task[]>) => {
      state.activeTasks = action.payload;
    },
    addTask: (state, action: PayloadAction<Task>) => {
      state.activeTasks.push(action.payload);
    },
    updateTask: (state, action: PayloadAction<Partial<Task> & { id: string }>) => {
      const task = state.activeTasks.find(t => t.id === action.payload.id);
      if (task) {
        Object.assign(task, action.payload);
      }
    },
    removeTask: (state, action: PayloadAction<string>) => {
      const task = state.activeTasks.find(t => t.id === action.payload);
      if (task) {
        state.activeTasks = state.activeTasks.filter(t => t.id !== action.payload);
        state.taskHistory.unshift(task);
      }
    },
    addTaskLog: (state, action: PayloadAction<{ taskId: string; log: string }>) => {
      const task = state.activeTasks.find(t => t.id === action.payload.taskId);
      if (task) {
        task.logs.push(action.payload.log);
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const {
  setActiveTasks,
  addTask,
  updateTask,
  removeTask,
  addTaskLog,
  setLoading,
} = taskSlice.actions;

export default taskSlice.reducer;
