/**
 * Main entry point for the HTTP connector/request pattern
 *
 * This module provides a clean, object-oriented way to interact with external APIs.
 */

// Core classes
export { Connector, Request } from "./Connector";

// Types
export {
  HttpMethod,
  RequestConfig,
  Response,
  RequestMiddleware,
  ResponseInterceptor,
  ErrorHandler,
  HttpError,
  AuthHandler,
} from "./types";

// Authentication handlers
export {
  BearerTokenAuth,
  ApiKeyAuth,
  BasicAuth,
  CustomHeaderAuth,
  QueryParamAuth,
} from "./auth";

// Middleware and interceptors
export {
  loggingMiddleware,
  timeoutMiddleware,
  customHeaderMiddleware,
  defaultQueryMiddleware,
  responseLoggingInterceptor,
  transformResponseInterceptor,
  errorLoggingHandler,
  retryErrorHandler,
} from "./middleware";

// Response handlers
export {
  ResponseHandler,
  JsonResponseHandler,
  TextResponseHandler,
  BlobResponseHandler,
  ArrayResponseHandler,
} from "./ResponseHandler";
