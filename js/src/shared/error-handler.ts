import { Logger } from './logger.js';
import { Request, Response } from 'express';

export interface ErrorContext {
  request?: Request;
  url?: string;
  userId?: string;
  operation?: string;
  metadata?: Record<string, any>;
}

export interface ErrorResponse {
  error: string;
  message: string;
  code: number;
  timestamp: string;
  requestId?: string;
  details?: any;
}

export class ApplicationError extends Error {
  public readonly code: number;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: ErrorContext;

  constructor(
    message: string,
    code: number = 500,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: ErrorContext
  ) {
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
  constructor(message: string, context?: ErrorContext) {
    super(message, 400, 400, true, context);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string, context?: ErrorContext) {
    super(`${resource} not found`, 404, 404, true, context);
  }
}

export class TimeoutError extends ApplicationError {
  constructor(operation: string, timeout: number, context?: ErrorContext) {
    super(`${operation} timed out after ${timeout}ms`, 408, 408, true, context);
  }
}

export class RateLimitError extends ApplicationError {
  constructor(message: string = 'Rate limit exceeded', context?: ErrorContext) {
    super(message, 429, 429, true, context);
  }
}

export class ExternalServiceError extends ApplicationError {
  constructor(service: string, message: string, context?: ErrorContext) {
    super(`External service error (${service}): ${message}`, 502, 502, true, context);
  }
}

export class ErrorHandler {
  private logger = new Logger('ErrorHandler');

  /**
   * Handle application errors with proper logging and response formatting
   */
  public handleError(error: Error, context?: ErrorContext): ErrorResponse {
    const timestamp = new Date().toISOString();
    const requestId = context?.request?.headers?.['x-request-id'] as string;

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
  public expressErrorHandler() {
    return (err: Error, req: Request, res: Response, next: any) => {
      const context: ErrorContext = {
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
  public async safeExecute<T>(
    operation: () => Promise<T>,
    context?: ErrorContext,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error: any) {
      const errorResponse = this.handleError(error, context);
      
      if (error instanceof ApplicationError && error.isOperational) {
        // Log operational errors as warnings
        this.logger.warn('Operational error in safe execution', {
          error: errorResponse,
          context
        });
      } else {
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
  public wrapAsync(fn: (req: Request, res: Response, next: any) => Promise<any>) {
    return (req: Request, res: Response, next: any) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Circuit breaker pattern for external service calls
   */
  public async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitBreakerKey: string,
    fallback?: T,
    timeout: number = 5000
  ): Promise<T> {
    // Simple circuit breaker implementation
    const startTime = Date.now();
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new TimeoutError('Circuit breaker', timeout)), timeout);
      });

      const result = await Promise.race([operation(), timeoutPromise]);
      
      // Log successful operation
      this.logger.debug('Circuit breaker operation succeeded', {
        key: circuitBreakerKey,
        duration: Date.now() - startTime
      });

      return result;
      
    } catch (error: any) {
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
  public async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    context?: ErrorContext
  ): Promise<T> {
    let lastError: Error = new Error('Unknown error');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
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

    throw new ApplicationError(
      `Operation failed after ${maxRetries} attempts: ${lastError.message}`,
      500,
      500,
      true,
      context
    );
  }

  /**
   * Resource cleanup helper
   */
  public async cleanupResources(resources: Array<{ cleanup: () => Promise<void> | void; name: string }>) {
    const cleanupPromises = resources.map(async (resource) => {
      try {
        await resource.cleanup();
        this.logger.debug(`Resource cleaned up: ${resource.name}`);
      } catch (error: any) {
        this.logger.warn(`Failed to cleanup resource: ${resource.name}`, { error: error.message });
      }
    });

    await Promise.allSettled(cleanupPromises);
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();
