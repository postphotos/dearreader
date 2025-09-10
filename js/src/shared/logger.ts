import { injectable } from 'tsyringe';
import winston from 'winston';

// Create winston logger instance
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'dearreader' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, scope, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${scope || 'App'}] ${level}: ${message} ${metaStr}`;
        })
      )
    })
  ]
});

// Add file transport for production
if (process.env.NODE_ENV === 'production') {
  winstonLogger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  winstonLogger.add(new winston.transports.File({ 
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

@injectable()
export class Logger {
    constructor(private name: string) {}

    info(message: string, meta?: any) {
        winstonLogger.info(message, { scope: this.name, ...meta });
    }

    warn(message: string, meta?: any) {
        winstonLogger.warn(message, { scope: this.name, ...meta });
    }

    error(message: string, meta?: any) {
        winstonLogger.error(message, { scope: this.name, ...meta });
    }

    debug(message: string, meta?: any) {
        winstonLogger.debug(message, { scope: this.name, ...meta });
    }

    child(options: { service: string }): Logger {
        return new Logger(`${this.name}:${options.service}`);
    }

    // Helper method for performance timing
    time(label: string): void {
        console.time(`[${this.name}] ${label}`);
    }

    timeEnd(label: string): void {
        console.timeEnd(`[${this.name}] ${label}`);
    }

    // Helper for logging HTTP requests
    httpRequest(method: string, url: string, statusCode?: number, responseTime?: number) {
        this.info('HTTP Request', {
            method,
            url,
            statusCode,
            responseTime: responseTime ? `${responseTime}ms` : undefined
        });
    }

    // Helper for logging errors with stack traces
    errorWithStack(message: string, error: Error, meta?: any) {
        this.error(message, {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            ...meta
        });
    }
}
