
// Polyfill for DOMMatrix (needed for pdfjs-dist)
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixPolyfill {
    constructor(init) {
      this.a = 1;
      this.b = 0;
      this.c = 0;
      this.d = 1;
      this.e = 0;
      this.f = 0;
      if (typeof init === 'string') {
        // ignore matrix string
      }
      else if (Array.isArray(init)) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init.concat([1, 0, 0, 1, 0, 0]).slice(0, 6);
      }
      else if (init && typeof init === 'object') {
        Object.assign(this, init);
      }
    }
    multiply() { return this; }
    multiplySelf() { return this; }
    translateSelf() { return this; }
    scaleSelf() { return this; }
    toString() { return '' + this.a + ',' + this.b + ',' + this.c + ',' + this.d + ',' + this.e + ',' + this.f; }
  }
  globalThis.DOMMatrix = DOMMatrixPolyfill;
}

// Polyfill for Promise.withResolvers (Node.js 18+)
if (typeof globalThis.Promise.withResolvers === 'undefined') {
  globalThis.Promise.withResolvers = function() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

import { Logger } from "./logger.js";
class ApplicationError extends Error {
  constructor(message, code = 500, statusCode = 500, isOperational = true, context) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
class ValidationError extends ApplicationError {
  constructor(message, context) {
    super(message, 400, 400, true, context);
  }
}
class NotFoundError extends ApplicationError {
  constructor(resource, context) {
    super(`${resource} not found`, 404, 404, true, context);
  }
}
class TimeoutError extends ApplicationError {
  constructor(operation, timeout, context) {
    super(`${operation} timed out after ${timeout}ms`, 408, 408, true, context);
  }
}
class RateLimitError extends ApplicationError {
  constructor(message = "Rate limit exceeded", context) {
    super(message, 429, 429, true, context);
  }
}
class ExternalServiceError extends ApplicationError {
  constructor(service, message, context) {
    super(`External service error (${service}): ${message}`, 502, 502, true, context);
  }
}
class ErrorHandler {
  constructor() {
    this.logger = new Logger("ErrorHandler");
  }
  /**
   * Handle application errors with proper logging and response formatting
   */
  handleError(error, context) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const requestId = context?.request?.headers?.["x-request-id"];
    this.logger.errorWithStack("Application error occurred", error, {
      context,
      requestId,
      timestamp
    });
    if (error instanceof ApplicationError) {
      return {
        error: error.name,
        message: error.message,
        code: error.statusCode,
        timestamp,
        requestId,
        details: process.env.NODE_ENV === "development" ? {
          stack: error.stack,
          context: error.context
        } : void 0
      };
    }
    if (error.message?.includes("Invalid TLD")) {
      return {
        error: "ValidationError",
        message: "Invalid URL or domain",
        code: 400,
        timestamp,
        requestId
      };
    }
    if (error.message?.includes("ERR_NAME_NOT_RESOLVED")) {
      return {
        error: "NotFoundError",
        message: "Domain could not be resolved",
        code: 404,
        timestamp,
        requestId
      };
    }
    if (error.message?.includes("TimeoutError") || error.name === "TimeoutError") {
      return {
        error: "TimeoutError",
        message: "Request timed out",
        code: 408,
        timestamp,
        requestId
      };
    }
    return {
      error: "InternalServerError",
      message: process.env.NODE_ENV === "production" ? "An internal server error occurred" : error.message,
      code: 500,
      timestamp,
      requestId,
      details: process.env.NODE_ENV === "development" ? {
        stack: error.stack,
        type: error.constructor.name
      } : void 0
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
      if (req.headers.origin) {
        res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
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
    } catch (error) {
      const errorResponse = this.handleError(error, context);
      if (error instanceof ApplicationError && error.isOperational) {
        this.logger.warn("Operational error in safe execution", {
          error: errorResponse,
          context
        });
      } else {
        this.logger.errorWithStack("Programming error in safe execution", error, {
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
  async withCircuitBreaker(operation, circuitBreakerKey, fallback, timeout = 5e3) {
    const startTime = Date.now();
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new TimeoutError("Circuit breaker", timeout)), timeout);
      });
      const result = await Promise.race([operation(), timeoutPromise]);
      this.logger.debug("Circuit breaker operation succeeded", {
        key: circuitBreakerKey,
        duration: Date.now() - startTime
      });
      return result;
    } catch (error) {
      this.logger.warn("Circuit breaker operation failed", {
        key: circuitBreakerKey,
        error: error.message,
        duration: Date.now() - startTime
      });
      if (fallback !== void 0) {
        return fallback;
      }
      throw error;
    }
  }
  /**
   * Retry mechanism with exponential backoff
   */
  async withRetry(operation, maxRetries = 3, baseDelay = 1e3, context) {
    let lastError = new Error("Unknown error");
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.logger.debug("Retry attempt failed", {
          attempt,
          maxRetries,
          error: error.message,
          context
        });
        if (error instanceof ValidationError || error instanceof NotFoundError || error.message?.includes("Invalid TLD")) {
          throw error;
        }
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
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
  async cleanupResources(resources) {
    const cleanupPromises = resources.map(async (resource) => {
      try {
        await resource.cleanup();
        this.logger.debug(`Resource cleaned up: ${resource.name}`);
      } catch (error) {
        this.logger.warn(`Failed to cleanup resource: ${resource.name}`, { error: error.message });
      }
    });
    await Promise.allSettled(cleanupPromises);
  }
}
const errorHandler = new ErrorHandler();
export {
  ApplicationError,
  ErrorHandler,
  ExternalServiceError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  ValidationError,
  errorHandler
};
//# sourceMappingURL=error-handler.js.map
