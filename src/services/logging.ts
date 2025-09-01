export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  module: string;
  metadata?: Record<string, any>;
  userId?: string;
  organizationId?: string;
}

export class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private currentLogLevel = LogLevel.INFO;

  constructor(private module: string) {}

  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>
  ): LogEntry {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level,
      message,
      module: this.module,
      metadata,
      // In a real app, get from auth context
      userId: undefined,
      organizationId: undefined
    };
  }

  private addLog(entry: LogEntry): void {
    if (entry.level >= this.currentLogLevel) {
      this.logs.unshift(entry);
      
      // Keep only the latest logs
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(0, this.maxLogs);
      }

      // Console output for development
      const levelName = LogLevel[entry.level];
      console.log(
        `[${entry.timestamp.toISOString()}] ${levelName} [${entry.module}] ${entry.message}`,
        entry.metadata || ''
      );
    }
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.addLog(this.createLogEntry(LogLevel.DEBUG, message, metadata));
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.addLog(this.createLogEntry(LogLevel.INFO, message, metadata));
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.addLog(this.createLogEntry(LogLevel.WARN, message, metadata));
  }

  error(message: string, metadata?: Record<string, any>): void {
    this.addLog(this.createLogEntry(LogLevel.ERROR, message, metadata));
  }

  critical(message: string, metadata?: Record<string, any>): void {
    this.addLog(this.createLogEntry(LogLevel.CRITICAL, message, metadata));
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }
}

// Factory for creating module-specific loggers
export const createLogger = (module: string): Logger => {
  return new Logger(module);
};

// Global logger instance
export const logger = createLogger('StagAlgo');

// Service-style interface for compatibility
export class LoggingService {
  log(level: 'debug' | 'info' | 'warn' | 'error' | 'critical', message: string, metadata?: Record<string, any>): void {
    switch (level) {
      case 'debug':
        logger.debug(message, metadata);
        break;
      case 'info':
        logger.info(message, metadata);
        break;
      case 'warn':
        logger.warn(message, metadata);
        break;
      case 'error':
        logger.error(message, metadata);
        break;
      case 'critical':
        logger.critical(message, metadata);
        break;
    }
  }

  getLogs(level?: LogLevel): LogEntry[] {
    return logger.getLogs(level);
  }

  clearLogs(): void {
    logger.clearLogs();
  }
}

// Export service instance for compatibility
export const logService = new LoggingService();
