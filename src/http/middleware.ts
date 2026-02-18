import {
  RequestConfig,
  RequestMiddleware,
  ResponseInterceptor,
  ErrorHandler,
  Response,
} from "./types";

/**
 * Logging middleware - logs request details
 */
export const loggingMiddleware = (): RequestMiddleware => {
  return (config: RequestConfig) => {
    console.log(`[HTTP] ${config.method} ${config.endpoint}`);
    if (config.query) {
      console.log("[HTTP] Query:", config.query);
    }
    return config;
  };
};

/**
 * Timeout middleware - adds a timeout to requests
 */
export const timeoutMiddleware = (timeoutMs: number): RequestMiddleware => {
  return (config: RequestConfig) => {
    // Note: This is a placeholder. Actual timeout implementation
    // would require AbortController integration in the Connector
    console.warn(
      `[HTTP] Timeout middleware: ${timeoutMs}ms (not implemented in fetch)`,
    );
    return config;
  };
};

/**
 * Custom header middleware - adds custom headers to all requests
 */
export const customHeaderMiddleware = (
  headers: Record<string, string>,
): RequestMiddleware => {
  return (config: RequestConfig) => {
    return {
      ...config,
      headers: {
        ...config.headers,
        ...headers,
      },
    };
  };
};

/**
 * Query parameter middleware - adds default query parameters
 */
export const defaultQueryMiddleware = (
  defaultQuery: Record<string, string | number | boolean>,
): RequestMiddleware => {
  return (config: RequestConfig) => {
    return {
      ...config,
      query: {
        ...defaultQuery,
        ...config.query,
      },
    };
  };
};

/**
 * Response logging interceptor
 */
export const responseLoggingInterceptor = (): ResponseInterceptor => {
  return <T>(response: Response<T>) => {
    console.log(`[HTTP] Response: ${response.status} ${response.statusText}`);
    return response;
  };
};

/**
 * Response transformation interceptor
 */
export const transformResponseInterceptor = <TInput, TOutput>(
  transformer: (data: TInput) => TOutput,
): ResponseInterceptor => {
  return <T>(response: Response<T>) => {
    return {
      ...response,
      data: transformer(response.data as unknown as TInput) as unknown as T,
    };
  };
};

/**
 * Error logging handler
 */
export const errorLoggingHandler = (): ErrorHandler => {
  return (error) => {
    console.error(`[HTTP Error] ${error.message}`, {
      status: error.status,
      response: error.response,
    });
  };
};

/**
 * Retry error handler - identifies retryable failures.
 *
 * Note: This is a placeholder and does NOT perform automatic retries.
 * Actual retry logic should be implemented in the Connector or caller,
 * using `maxRetries` and `retryableStatuses` as configuration.
 */
export const retryErrorHandler = (
  maxRetries: number = 3,
  retryableStatuses: number[] = [408, 429, 500, 502, 503, 504],
): ErrorHandler => {
  return (error) => {
    if (retryableStatuses.includes(error.status)) {
      console.log(
        `[HTTP] Request failed with retryable status ${error.status}. ` +
          `Max retries configured: ${maxRetries}. ` +
          "No automatic retry is performed by retryErrorHandler; " +
          "implement retry logic in the Connector.",
      );
    }
  };
};
