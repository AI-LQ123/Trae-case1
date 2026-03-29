export interface TerminalSessionCreatedData {
  sessionId: string;
  name: string;
  cwd: string;
  createdAt: number;
  status: 'active' | 'inactive' | 'closed';
}

export interface TerminalCommandExecutedData {
  sessionId: string;
  command: string;
}

export interface TerminalSessionClosedData {
  sessionId: string;
}

export interface TerminalSessionsListData {
  sessions: Array<{
    id: string;
    name: string;
    cwd: string;
    createdAt: number;
    status: 'active' | 'inactive' | 'closed';
  }>;
}

export interface TerminalErrorData {
  message: string;
}

export interface TerminalOutputData {
  sessionId: string;
  data: string;
  timestamp: number;
  type: 'stdout' | 'stderr';
}

export interface TerminalEventPayload {
  category: 'terminal' | 'terminal_output';
  action: 'session_created' | 'command_executed' | 'session_closed' | 'sessions_list' | 'error';
  data: TerminalSessionCreatedData | TerminalCommandExecutedData | TerminalSessionClosedData | TerminalSessionsListData | TerminalErrorData | TerminalOutputData;
}
