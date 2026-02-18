/**
 * Tests for middleware and interceptors
 */

import {
  loggingMiddleware,
  timeoutMiddleware,
  customHeaderMiddleware,
  defaultQueryMiddleware,
  responseLoggingInterceptor,
  transformResponseInterceptor,
  errorLoggingHandler,
} from "../../src/http/middleware";
import {
  RequestConfig,
  HttpMethod,
  Response,
  HttpError,
} from "../../src/http/types";

describe("loggingMiddleware", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should log request method and endpoint", () => {
    const middleware = loggingMiddleware();
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/api/test",
    };

    middleware(config);

    expect(consoleSpy).toHaveBeenCalledWith("[HTTP] GET /api/test");
  });

  it("should log query parameters if present", () => {
    const middleware = loggingMiddleware();
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/api/search",
      query: { q: "test", limit: 10 },
    };

    middleware(config);

    expect(consoleSpy).toHaveBeenCalledWith("[HTTP] GET /api/search");
    expect(consoleSpy).toHaveBeenCalledWith("[HTTP] Query:", {
      q: "test",
      limit: 10,
    });
  });

  it("should not log query if not present", () => {
    const middleware = loggingMiddleware();
    const config: RequestConfig = {
      method: HttpMethod.POST,
      endpoint: "/api/create",
    };

    middleware(config);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith("[HTTP] POST /api/create");
  });

  it("should return the config unchanged", () => {
    const middleware = loggingMiddleware();
    const config: RequestConfig = {
      method: HttpMethod.PUT,
      endpoint: "/api/update",
      headers: { "Content-Type": "application/json" },
    };

    const result = middleware(config);

    expect(result).toEqual(config);
  });
});

describe("timeoutMiddleware", () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it("should log timeout warning", () => {
    const middleware = timeoutMiddleware(5000);
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
    };

    middleware(config);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[HTTP] Timeout middleware: 5000ms (not implemented in fetch)",
    );
  });

  it("should return config unchanged", () => {
    const middleware = timeoutMiddleware(3000);
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
    };

    const result = middleware(config);

    expect(result).toEqual(config);
  });
});

describe("customHeaderMiddleware", () => {
  it("should add custom headers to config", () => {
    const middleware = customHeaderMiddleware({
      "X-Custom-Header": "value",
      "X-App-Version": "1.0.0",
    });
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {},
    };

    const result = middleware(config) as RequestConfig;

    expect(result.headers?.["X-Custom-Header"]).toBe("value");
    expect(result.headers?.["X-App-Version"]).toBe("1.0.0");
  });

  it("should merge with existing headers", () => {
    const middleware = customHeaderMiddleware({
      "X-Custom": "custom-value",
    });
    const config: RequestConfig = {
      method: HttpMethod.POST,
      endpoint: "/api",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const result = middleware(config) as RequestConfig;

    expect(result.headers?.["Content-Type"]).toBe("application/json");
    expect(result.headers?.["X-Custom"]).toBe("custom-value");
  });

  it("should override existing headers with same name", () => {
    const middleware = customHeaderMiddleware({
      Authorization: "Bearer new-token",
    });
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {
        Authorization: "Bearer old-token",
      },
    };

    const result = middleware(config) as RequestConfig;

    expect(result.headers?.["Authorization"]).toBe("Bearer new-token");
  });
});

describe("defaultQueryMiddleware", () => {
  it("should add default query parameters", () => {
    const middleware = defaultQueryMiddleware({
      apiVersion: "2024-01",
      format: "json",
    });
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/api",
    };

    const result = middleware(config) as RequestConfig;

    expect(result.query).toEqual({
      apiVersion: "2024-01",
      format: "json",
    });
  });

  it("should merge with existing query parameters", () => {
    const middleware = defaultQueryMiddleware({
      apiVersion: "v1",
    });
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/api",
      query: {
        search: "test",
      },
    };

    const result = middleware(config) as RequestConfig;

    expect(result.query).toEqual({
      apiVersion: "v1",
      search: "test",
    });
  });

  it("should allow existing query to override defaults", () => {
    const middleware = defaultQueryMiddleware({
      limit: 10,
      sort: "asc",
    });
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/api",
      query: {
        limit: 50,
      },
    };

    const result = middleware(config) as RequestConfig;

    expect(result.query).toEqual({
      limit: 50,
      sort: "asc",
    });
  });

  it("should handle different value types", () => {
    const middleware = defaultQueryMiddleware({
      string: "value",
      number: 42,
      boolean: true,
    });
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/api",
    };

    const result = middleware(config) as RequestConfig;

    expect(result.query).toEqual({
      string: "value",
      number: 42,
      boolean: true,
    });
  });
});

describe("responseLoggingInterceptor", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should log response status", () => {
    const interceptor = responseLoggingInterceptor();
    const response: Response<unknown> = {
      status: 200,
      statusText: "OK",
      headers: {},
      data: {},
      ok: true,
    };

    interceptor(response);

    expect(consoleSpy).toHaveBeenCalledWith("[HTTP] Response: 200 OK");
  });

  it("should return response unchanged", () => {
    const interceptor = responseLoggingInterceptor();
    const response: Response<{ id: number }> = {
      status: 201,
      statusText: "Created",
      headers: {},
      data: { id: 123 },
      ok: true,
    };

    const result = interceptor(response);

    expect(result).toEqual(response);
  });

  it("should log error responses", () => {
    const interceptor = responseLoggingInterceptor();
    const response: Response<unknown> = {
      status: 404,
      statusText: "Not Found",
      headers: {},
      data: {},
      ok: false,
    };

    interceptor(response);

    expect(consoleSpy).toHaveBeenCalledWith("[HTTP] Response: 404 Not Found");
  });
});

describe("transformResponseInterceptor", () => {
  it("should transform response data", () => {
    const transformer = (data: { value: number }) => ({
      doubled: data.value * 2,
    });
    const interceptor = transformResponseInterceptor(transformer);
    const response: Response<{ value: number }> = {
      status: 200,
      statusText: "OK",
      headers: {},
      data: { value: 5 },
      ok: true,
    };

    const result = interceptor(response) as unknown as Response<{
      doubled: number;
    }>;

    expect(result.data).toEqual({ doubled: 10 });
  });

  it("should preserve other response properties", () => {
    const transformer = (data: string) => data.toUpperCase();
    const interceptor = transformResponseInterceptor(transformer);
    const response: Response<string> = {
      status: 200,
      statusText: "OK",
      headers: { "content-type": "text/plain" },
      data: "hello",
      ok: true,
    };

    const result = interceptor(response) as Response<string>;

    expect(result.status).toBe(200);
    expect(result.statusText).toBe("OK");
    expect(result.headers).toEqual({ "content-type": "text/plain" });
    expect(result.ok).toBe(true);
    expect(result.data).toBe("HELLO");
  });

  it("should handle complex transformations", () => {
    interface Input {
      items: Array<{ id: number; name: string }>;
    }
    interface Output {
      count: number;
      names: string[];
    }

    const transformer = (data: Input): Output => ({
      count: data.items.length,
      names: data.items.map((item) => item.name),
    });

    const interceptor = transformResponseInterceptor<Input, Output>(
      transformer,
    );
    const response: Response<Input> = {
      status: 200,
      statusText: "OK",
      headers: {},
      data: {
        items: [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ],
      },
      ok: true,
    };

    const result = interceptor(response) as unknown as Response<Output>;

    expect(result.data).toEqual({
      count: 2,
      names: ["Alice", "Bob"],
    });
  });
});

describe("errorLoggingHandler", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should log error message and details", () => {
    const handler = errorLoggingHandler();
    const error = new HttpError("Not Found", 404);

    handler(error);

    expect(consoleErrorSpy).toHaveBeenCalledWith("[HTTP Error] Not Found", {
      status: 404,
      response: undefined,
    });
  });

  it("should log error with response", () => {
    const handler = errorLoggingHandler();
    const response: Response<unknown> = {
      status: 500,
      statusText: "Internal Server Error",
      headers: {},
      data: { error: "Database connection failed" },
      ok: false,
    };
    const error = new HttpError("Server error", 500, response);

    handler(error);

    expect(consoleErrorSpy).toHaveBeenCalledWith("[HTTP Error] Server error", {
      status: 500,
      response,
    });
  });

  it("should handle different error types", () => {
    const handler = errorLoggingHandler();
    const errors = [
      new HttpError("Bad Request", 400),
      new HttpError("Unauthorized", 401),
      new HttpError("Forbidden", 403),
      new HttpError("Too Many Requests", 429),
      new HttpError("Service Unavailable", 503),
    ];

    errors.forEach((error) => handler(error));

    expect(consoleErrorSpy).toHaveBeenCalledTimes(5);
  });
});
