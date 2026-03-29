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
