export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS",
}

export interface RequestConfig {
  method: HttpMethod;
  endpoint: string;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean>;
  body?: unknown;
}

export interface Response<T = unknown> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
  ok: boolean;
}

/**
 * Middleware function type
 * Can modify the request config before sending
 */
export type RequestMiddleware = (
  config: RequestConfig,
) => RequestConfig | Promise<RequestConfig>;

/**
 * Response interceptor function type
 * Can modify or validate the response after receiving
 */
export type ResponseInterceptor = <T>(
  response: Response<T>,
) => Response<T> | Promise<Response<T>>;

export type ErrorHandler = (error: HttpError) => void | Promise<void>;

/**
 * Custom HTTP error class
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: Response<unknown>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export interface AuthHandler {
  apply(config: RequestConfig): RequestConfig | Promise<RequestConfig>;
}
