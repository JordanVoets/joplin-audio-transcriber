/**
 * Main entry point for the HTTP connector/request pattern
 *
 * This module provides a clean, object-oriented way to interact with external APIs.
 */

export { Connector, Request } from "./Connector";

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

export {
  BearerTokenAuth,
  ApiKeyAuth,
  BasicAuth,
  CustomHeaderAuth,
  QueryParamAuth,
} from "./auth";

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

export {
  ResponseHandler,
  JsonResponseHandler,
  TextResponseHandler,
  BlobResponseHandler,
  ArrayResponseHandler,
} from "./ResponseHandler";
