import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Task {
  id: string;
  name: string;
  command: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  priority?: 'low' | 'medium' | 'high';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  output?: string;
  error?: string;
  metadata?: {
    estimatedTime?: number;
    remainingTime?: number;
    steps?: TaskStep[];
  };
}

export interface TaskStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: number;
  endTime?: number;
  output?: string;
  error?: string;
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
      state.activeTasks.unshift(action.payload);
    },
    updateTask: (state, action: PayloadAction<Partial<Task> & { id: string }>) => {
      const task = state.activeTasks.find(t => t.id === action.payload.id);
      if (task) {
        Object.assign(task, action.payload);
      }
      const historyTask = state.taskHistory.find(t => t.id === action.payload.id);
      if (historyTask) {
        Object.assign(historyTask, action.payload);
      }
    },
    removeTask: (state, action: PayloadAction<string>) => {
      const task = state.activeTasks.find(t => t.id === action.payload);
      if (task) {
        state.activeTasks = state.activeTasks.filter(t => t.id !== action.payload);
        state.taskHistory.unshift(task);
      }
    },
    setTaskOutput: (state, action: PayloadAction<{ taskId: string; output: string }>) => {
      const task = state.activeTasks.find(t => t.id === action.payload.taskId);
      if (task) {
        task.output = (task.output || '') + action.payload.output;
      }
    },
    setTaskError: (state, action: PayloadAction<{ taskId: string; error: string }>) => {
      const task = state.activeTasks.find(t => t.id === action.payload.taskId);
      if (task) {
        task.error = action.payload.error;
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
  updateTaskInHistory,
  removeTask,
  setTaskOutput,
  setTaskError,
  setLoading,
} = taskSlice.actions;

export default taskSlice.reducer;
