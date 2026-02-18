import {
  RequestConfig,
  Response,
  RequestMiddleware,
  ResponseInterceptor,
  ErrorHandler,
  HttpError,
  AuthHandler,
  HttpMethod,
} from "./types";

/**
 * Abstract base class for API connectors.
 * Each external API should extend this class to define authentication,
 * base URLs, and global middleware.
 */
export abstract class Connector {
  protected middlewares: RequestMiddleware[] = [];
  protected responseInterceptors: ResponseInterceptor[] = [];
  protected errorHandlers: ErrorHandler[] = [];
  protected authHandler?: AuthHandler;

  /**
   * The base URL for this connector's API
   */
  abstract baseUrl(): string;

  /**
   * Default headers to include with every request
   */
  protected defaultHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
    };
  }

  /**
   * Set authentication handler for this connector
   */
  withAuth(handler: AuthHandler): this {
    this.authHandler = handler;
    return this;
  }

  /**
   * Add a request middleware
   */
  withMiddleware(middleware: RequestMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Add a response interceptor
   */
  withResponseInterceptor(interceptor: ResponseInterceptor): this {
    this.responseInterceptors.push(interceptor);
    return this;
  }

  /**
   * Add an error handler
   */
  withErrorHandler(handler: ErrorHandler): this {
    this.errorHandlers.push(handler);
    return this;
  }

  /**
   * Send a request through this connector
   */
  async send<TResponse>(
    request: Request<TResponse>,
  ): Promise<Response<TResponse>> {
    try {
      // Build the initial request config
      let config = await request.buildConfig();

      // Merge with default headers
      config.headers = {
        ...this.defaultHeaders(),
        ...config.headers,
      };

      // Apply authentication
      if (this.authHandler) {
        config = await this.authHandler.apply(config);
      }

      // Apply middlewares
      for (const middleware of this.middlewares) {
        config = await middleware(config);
      }

      // Execute the request
      let response = await this.executeRequest<TResponse>(config);

      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response);
      }

      // Let the request handle the response
      return await request.handleResponse(response);
    } catch (error) {
      // Apply error handlers
      if (error instanceof HttpError) {
        for (const handler of this.errorHandlers) {
          await handler(error);
        }
      }
      throw error;
    }
  }

  /**
   * Execute the actual HTTP request
   * This method can be overridden to use different HTTP clients
   */
  protected async executeRequest<TResponse>(
    config: RequestConfig,
  ): Promise<Response<TResponse>> {
    const url = new URL(config.endpoint, this.baseUrl());

    // Add query parameters
    if (config.query) {
      Object.entries(config.query).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    // Prepare fetch options
    const options: RequestInit = {
      method: config.method,
      headers: config.headers,
    };

    // Add body for non-GET requests
    if (config.method !== HttpMethod.GET && config.body !== undefined) {
      if (config.body instanceof FormData || config.body instanceof Blob) {
        options.body = config.body as BodyInit;
        // Remove Content-Type header for FormData - let browser set it with boundary
        if (options.headers && typeof options.headers === "object") {
          const headers = { ...options.headers };
          delete headers["Content-Type"];
          options.headers = headers;
        }
      } else {
        options.body = JSON.stringify(config.body);
      }
    }

    // Execute the request
    const fetchResponse = await fetch(url.toString(), options);

    // Parse response
    const contentType = fetchResponse.headers.get("content-type") || "";
    let data: TResponse;

    if (contentType.includes("application/json")) {
      data = await fetchResponse.json();
    } else if (contentType.includes("text/")) {
      data = (await fetchResponse.text()) as TResponse;
    } else {
      data = (await fetchResponse.blob()) as TResponse;
    }

    // Convert headers to object
    const headers: Record<string, string> = {};
    fetchResponse.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const response: Response<TResponse> = {
      status: fetchResponse.status,
      statusText: fetchResponse.statusText,
      headers,
      data,
      ok: fetchResponse.ok,
    };

    // Throw error for non-ok responses
    if (!response.ok) {
      throw new HttpError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        response,
      );
    }

    return response;
  }
}

/**
 * Base class for individual requests.
 * Each API endpoint should have its own Request class.
 */
export abstract class Request<TResponse = unknown> {
  /**
   * The HTTP method for this request
   */
  abstract method(): HttpMethod;

  /**
   * The endpoint path for this request (relative to the connector's base URL)
   */
  abstract endpoint(): string;

  /**
   * Build the request configuration
   * Override this to add headers, query parameters, or body
   */
  async buildConfig(): Promise<RequestConfig> {
    return {
      method: this.method(),
      endpoint: this.endpoint(),
      headers: this.headers(),
      query: this.query(),
      body: this.body(),
    };
  }

  /**
   * Headers specific to this request
   */
  protected headers(): Record<string, string> {
    return {};
  }

  /**
   * Query parameters for this request
   */
  protected query(): Record<string, string | number | boolean> | undefined {
    return undefined;
  }

  /**
   * Request body
   */
  protected body(): unknown {
    return undefined;
  }

  /**
   * Handle the response and extract/transform the data
   * Override this to add custom validation or transformation
   */
  async handleResponse(
    response: Response<TResponse>,
  ): Promise<Response<TResponse>> {
    return response;
  }
}
