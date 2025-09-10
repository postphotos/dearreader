import { Logger } from './logger.js';
export class ApplicationError extends Error {
    constructor(message, code = 500, statusCode = 500, isOperational = true, context) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.context = context;
        // Ensure the stack trace starts from the caller
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
export class ValidationError extends ApplicationError {
    constructor(message, context) {
        super(message, 400, 400, true, context);
    }
}
export class NotFoundError extends ApplicationError {
    constructor(resource, context) {
        super(`${resource} not found`, 404, 404, true, context);
    }
}
export class TimeoutError extends ApplicationError {
    constructor(operation, timeout, context) {
        super(`${operation} timed out after ${timeout}ms`, 408, 408, true, context);
    }
}
export class RateLimitError extends ApplicationError {
    constructor(message = 'Rate limit exceeded', context) {
        super(message, 429, 429, true, context);
    }
}
export class ExternalServiceError extends ApplicationError {
    constructor(service, message, context) {
        super(`External service error (${service}): ${message}`, 502, 502, true, context);
    }
}
export class ErrorHandler {
    constructor() {
        this.logger = new Logger('ErrorHandler');
    }
    /**
     * Handle application errors with proper logging and response formatting
     */
    handleError(error, context) {
        const timestamp = new Date().toISOString();
        const requestId = context?.request?.headers?.['x-request-id'];
        // Log the error with context
        this.logger.errorWithStack('Application error occurred', error, {
            context,
            requestId,
            timestamp
        });
        // Determine error type and response
        if (error instanceof ApplicationError) {
            return {
                error: error.name,
                message: error.message,
                code: error.statusCode,
                timestamp,
                requestId,
                details: process.env.NODE_ENV === 'development' ? {
                    stack: error.stack,
                    context: error.context
                } : undefined
            };
        }
        // Handle specific known errors
        if (error.message?.includes('Invalid TLD')) {
            return {
                error: 'ValidationError',
                message: 'Invalid URL or domain',
                code: 400,
                timestamp,
                requestId
            };
        }
        if (error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
            return {
                error: 'NotFoundError',
                message: 'Domain could not be resolved',
                code: 404,
                timestamp,
                requestId
            };
        }
        if (error.message?.includes('TimeoutError') || error.name === 'TimeoutError') {
            return {
                error: 'TimeoutError',
                message: 'Request timed out',
                code: 408,
                timestamp,
                requestId
            };
        }
        // Default server error
        return {
            error: 'InternalServerError',
            message: process.env.NODE_ENV === 'production'
                ? 'An internal server error occurred'
                : error.message,
            code: 500,
            timestamp,
            requestId,
            details: process.env.NODE_ENV === 'development' ? {
                stack: error.stack,
                type: error.constructor.name
            } : undefined
        };
    }
    /**
     * Express error handling middleware
     */
    expressErrorHandler() {
        return (err, req, res, next) => {
            const context = {
                request: req,
                url: req.url,
                operation: `${req.method} ${req.path}`
            };
            const errorResponse = this.handleError(err, context);
            // Set CORS headers if needed
            if (req.headers.origin) {
                res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
                res.setHeader('Access-Control-Allow-Credentials', 'true');
            }
            res.status(errorResponse.code).json(errorResponse);
        };
    }
    /**
     * Async operation wrapper that handles errors gracefully
     */
    async safeExecute(operation, context, fallback) {
        try {
            return await operation();
        }
        catch (error) {
            const errorResponse = this.handleError(error, context);
            if (error instanceof ApplicationError && error.isOperational) {
                // Log operational errors as warnings
                this.logger.warn('Operational error in safe execution', {
                    error: errorResponse,
                    context
                });
            }
            else {
                // Log programming errors as errors
                this.logger.errorWithStack('Programming error in safe execution', error, {
                    context
                });
            }
            return fallback;
        }
    }
    /**
     * Wrap async functions with error boundaries
     */
    wrapAsync(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
    /**
     * Circuit breaker pattern for external service calls
     */
    async withCircuitBreaker(operation, circuitBreakerKey, fallback, timeout = 5000) {
        // Simple circuit breaker implementation
        const startTime = Date.now();
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new TimeoutError('Circuit breaker', timeout)), timeout);
            });
            const result = await Promise.race([operation(), timeoutPromise]);
            // Log successful operation
            this.logger.debug('Circuit breaker operation succeeded', {
                key: circuitBreakerKey,
                duration: Date.now() - startTime
            });
            return result;
        }
        catch (error) {
            this.logger.warn('Circuit breaker operation failed', {
                key: circuitBreakerKey,
                error: error.message,
                duration: Date.now() - startTime
            });
            if (fallback !== undefined) {
                return fallback;
            }
            throw error;
        }
    }
    /**
     * Retry mechanism with exponential backoff
     */
    async withRetry(operation, maxRetries = 3, baseDelay = 1000, context) {
        let lastError = new Error('Unknown error');
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                this.logger.debug('Retry attempt failed', {
                    attempt,
                    maxRetries,
                    error: error.message,
                    context
                });
                // Don't retry on certain error types
                if (error instanceof ValidationError ||
                    error instanceof NotFoundError ||
                    error.message?.includes('Invalid TLD')) {
                    throw error;
                }
                if (attempt < maxRetries) {
                    const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw new ApplicationError(`Operation failed after ${maxRetries} attempts: ${lastError.message}`, 500, 500, true, context);
    }
    /**
     * Resource cleanup helper
     */
    async cleanupResources(resources) {
        const cleanupPromises = resources.map(async (resource) => {
            try {
                await resource.cleanup();
                this.logger.debug(`Resource cleaned up: ${resource.name}`);
            }
            catch (error) {
                this.logger.warn(`Failed to cleanup resource: ${resource.name}`, { error: error.message });
            }
        });
        await Promise.allSettled(cleanupPromises);
    }
}
// Export singleton instance
export const errorHandler = new ErrorHandler();
//# sourceMappingURL=error-handler.js.map