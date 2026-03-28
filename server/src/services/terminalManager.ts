import * as pty from 'node-pty';
import os from 'os';
import path from 'path';
import { logger } from '../utils/logger';

export interface TerminalSession {
  id: string;
  name: string;
  cwd: string;
  createdAt: number;
  status: 'active' | 'inactive' | 'closed';
  processId?: number;
  ptyProcess?: pty.IPty;
}

export interface TerminalOutput {
  sessionId: string;
  data: string;
  timestamp: number;
  type: 'stdout' | 'stderr';
}

export interface TerminalCommandRequest {
  sessionId: string;
  command: string;
}

export interface TerminalResizeRequest {
  sessionId: string;
  cols: number;
  rows: number;
}

type OutputCallback = (output: TerminalOutput) => void;

export class TerminalManager {
  private sessions: Map<string, TerminalSession> = new Map();
  private outputCallbacks: Map<string, OutputCallback> = new Map();

  constructor() {
    logger.info('TerminalManager initialized', {
      context: 'TerminalManager',
    });
  }

  createSession(name: string, cwd?: string): TerminalSession {
    const sessionId = `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const workingDir = cwd || process.cwd();

    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: workingDir,
      env: process.env as any,
    });

    const session: TerminalSession = {
      id: sessionId,
      name,
      cwd: workingDir,
      createdAt: Date.now(),
      status: 'active',
      processId: ptyProcess.pid,
      ptyProcess,
    };

    this.sessions.set(sessionId, session);

    ptyProcess.onData((data: string) => {
      this.emitOutput(sessionId, data, 'stdout');
    });

    ptyProcess.onExit(() => {
      this.closeSession(sessionId);
    });

    logger.info(`Terminal session created: ${sessionId}`, {
      context: 'TerminalManager',
      metadata: { sessionId, name, cwd: workingDir },
    });

    return session;
  }

  executeCommand(request: TerminalCommandRequest): boolean {
    const session = this.sessions.get(request.sessionId);
    if (!session || session.status !== 'active' || !session.ptyProcess) {
      logger.warn(`Failed to execute command: session not found or inactive`, {
        context: 'TerminalManager',
        metadata: { sessionId: request.sessionId },
      });
      return false;
    }

    session.ptyProcess.write(request.command + '\r');
    logger.info(`Command executed in session: ${request.sessionId}`, {
      context: 'TerminalManager',
      metadata: { sessionId: request.sessionId, command: request.command },
    });
    return true;
  }

  resize(request: TerminalResizeRequest): boolean {
    const session = this.sessions.get(request.sessionId);
    if (!session || session.status !== 'active' || !session.ptyProcess) {
      logger.warn(`Failed to resize: session not found or inactive`, {
        context: 'TerminalManager',
        metadata: { sessionId: request.sessionId },
      });
      return false;
    }

    session.ptyProcess.resize(request.cols, request.rows);
    logger.info(`Terminal resized: ${request.sessionId}`, {
      context: 'TerminalManager',
      metadata: { sessionId: request.sessionId, cols: request.cols, rows: request.rows },
    });
    return true;
  }

  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (session.ptyProcess) {
      session.ptyProcess.kill();
    }

    session.status = 'closed';
    this.outputCallbacks.delete(sessionId);

    logger.info(`Terminal session closed: ${sessionId}`, {
      context: 'TerminalManager',
      metadata: { sessionId },
    });

    return true;
  }

  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values()).map(session => ({
      ...session,
      ptyProcess: undefined,
    }));
  }

  registerOutputCallback(sessionId: string, callback: OutputCallback): void {
    this.outputCallbacks.set(sessionId, callback);
  }

  unregisterOutputCallback(sessionId: string): void {
    this.outputCallbacks.delete(sessionId);
  }

  private emitOutput(sessionId: string, data: string, type: 'stdout' | 'stderr'): void {
    const callback = this.outputCallbacks.get(sessionId);
    if (callback) {
      const output: TerminalOutput = {
        sessionId,
        data,
        timestamp: Date.now(),
        type,
      };
      callback(output);
    }
  }

  cleanup(): void {
    for (const sessionId of this.sessions.keys()) {
      this.closeSession(sessionId);
    }
    this.sessions.clear();
    this.outputCallbacks.clear();
  }
}

export const terminalManager = new TerminalManager();
