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
  private sessions: Map<string, TerminalSession & { ptyProcess?: pty.IPty; processId?: number }> = new Map();
  private outputCallbacks: Map<string, Set<OutputCallback>> = new Map();
  private static readonly MAX_SESSIONS = 20;
  private static readonly SAFE_ENV_VARS = [
    'PATH',
    'HOME',
    'USER',
    'USERNAME',
    'SHELL',
    'TERM',
    'LANG',
    'LC_ALL',
    'TMP',
    'TEMP',
    'TMPDIR',
    'PWD',
    'OLDPWD',
  ];

  constructor() {
    logger.info('TerminalManager initialized', {
      context: 'TerminalManager',
    });
  }

  createSession(name: string, cwd?: string): TerminalSession {
    if (this.sessions.size >= TerminalManager.MAX_SESSIONS) {
      logger.warn(`Max sessions limit reached: ${TerminalManager.MAX_SESSIONS}`, {
        context: 'TerminalManager',
        metadata: { maxSessions: TerminalManager.MAX_SESSIONS },
      });
      throw new Error(`Maximum terminal sessions limit (${TerminalManager.MAX_SESSIONS}) reached`);
    }

    const sessionId = `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const workingDir = cwd || process.cwd();

    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const filteredEnv = this.filterEnvironmentVariables();

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: workingDir,
      env: filteredEnv,
    });

    const session: TerminalSession & { ptyProcess?: pty.IPty; processId?: number } = {
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
      const session = this.sessions.get(sessionId);
      if (session && session.status === 'active') {
        this.emitOutput(sessionId, data, 'stdout');
      }
    });

    ptyProcess.onExit(() => {
      const session = this.sessions.get(sessionId);
      if (session && session.status !== 'closed') {
        this.closeSession(sessionId);
      }
    });

    logger.info(`Terminal session created: ${sessionId}`, {
      context: 'TerminalManager',
      metadata: { sessionId, name, cwd: workingDir },
    });

    return session;
  }

  private filterEnvironmentVariables(): Record<string, string | undefined> {
    const filtered: Record<string, string | undefined> = {};
    
    for (const key of TerminalManager.SAFE_ENV_VARS) {
      if (process.env[key] !== undefined) {
        filtered[key] = process.env[key];
      }
    }
    
    return filtered;
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

    try {
      session.ptyProcess.resize(request.cols, request.rows);
      logger.info(`Terminal resized: ${request.sessionId}`, {
        context: 'TerminalManager',
        metadata: { sessionId: request.sessionId, cols: request.cols, rows: request.rows },
      });
      return true;
    } catch (error) {
      const errorMessage = (error as Error).message || String(error);
      logger.warn(`Failed to resize terminal: ${errorMessage}`, {
        context: 'TerminalManager',
        metadata: { sessionId: request.sessionId, error: errorMessage },
      });
      
      if (errorMessage.includes('already exited')) {
        session.status = 'closed';
        session.ptyProcess = undefined;
        this.outputCallbacks.delete(request.sessionId);
        logger.info(`Marked terminal session as closed: ${request.sessionId}`, {
          context: 'TerminalManager',
          metadata: { sessionId: request.sessionId },
        });
      }
      
      return false;
    }
  }

  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (session.ptyProcess) {
      try {
        session.ptyProcess.kill();
      } catch (error) {
        logger.warn(`Error killing pty process: ${(error as Error).message}`, {
          context: 'TerminalManager',
          metadata: { sessionId },
        });
      }
    }

    session.status = 'closed';
    session.ptyProcess = undefined;
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
      id: session.id,
      name: session.name,
      cwd: session.cwd,
      createdAt: session.createdAt,
      status: session.status,
    }));
  }

  registerOutputCallback(sessionId: string, callback: OutputCallback): void {
    if (!this.outputCallbacks.has(sessionId)) {
      this.outputCallbacks.set(sessionId, new Set());
    }
    this.outputCallbacks.get(sessionId)!.add(callback);
  }

  unregisterOutputCallback(sessionId: string, callback?: OutputCallback): void {
    if (callback) {
      const callbacks = this.outputCallbacks.get(sessionId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.outputCallbacks.delete(sessionId);
        }
      }
    } else {
      this.outputCallbacks.delete(sessionId);
    }
  }

  private emitOutput(sessionId: string, data: string, type: 'stdout' | 'stderr'): void {
    const callbacks = this.outputCallbacks.get(sessionId);
    if (callbacks) {
      const output: TerminalOutput = {
        sessionId,
        data,
        timestamp: Date.now(),
        type,
      };
      callbacks.forEach(callback => {
        try {
          callback(output);
        } catch (error) {
          logger.error(`Error in output callback: ${(error as Error).message}`, {
            context: 'TerminalManager',
            metadata: { sessionId, error: (error as Error).message },
          });
        }
      });
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
