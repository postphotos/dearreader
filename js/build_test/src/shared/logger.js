var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var Logger_1;
import { injectable } from 'tsyringe';
import winston from 'winston';
// Create winston logger instance
const winstonLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: winston.format.combine(winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }), winston.format.errors({ stack: true }), winston.format.json()),
    defaultMeta: { service: 'dearreader' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple(), winston.format.printf(({ timestamp, level, message, scope, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} [${scope || 'App'}] ${level}: ${message} ${metaStr}`;
            }))
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
let Logger = Logger_1 = class Logger {
    constructor(name) {
        this.name = name;
    }
    info(message, meta) {
        winstonLogger.info(message, { scope: this.name, ...meta });
    }
    warn(message, meta) {
        winstonLogger.warn(message, { scope: this.name, ...meta });
    }
    error(message, meta) {
        winstonLogger.error(message, { scope: this.name, ...meta });
    }
    debug(message, meta) {
        winstonLogger.debug(message, { scope: this.name, ...meta });
    }
    child(options) {
        return new Logger_1(`${this.name}:${options.service}`);
    }
    // Helper method for performance timing
    time(label) {
        console.time(`[${this.name}] ${label}`);
    }
    timeEnd(label) {
        console.timeEnd(`[${this.name}] ${label}`);
    }
    // Helper for logging HTTP requests
    httpRequest(method, url, statusCode, responseTime) {
        this.info('HTTP Request', {
            method,
            url,
            statusCode,
            responseTime: responseTime ? `${responseTime}ms` : undefined
        });
    }
    // Helper for logging errors with stack traces
    errorWithStack(message, error, meta) {
        this.error(message, {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            ...meta
        });
    }
};
Logger = Logger_1 = __decorate([
    injectable(),
    __metadata("design:paramtypes", [String])
], Logger);
export { Logger };
//# sourceMappingURL=logger.js.map