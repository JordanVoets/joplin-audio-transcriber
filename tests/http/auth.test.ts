/**
 * Tests for authentication handlers
 */

import {
  BearerTokenAuth,
  ApiKeyAuth,
  BasicAuth,
  CustomHeaderAuth,
  QueryParamAuth,
} from "../../src/http/auth";
import { RequestConfig, HttpMethod } from "../../src/http/types";

describe("BearerTokenAuth", () => {
  it("should add Bearer token to Authorization header", () => {
    const auth = new BearerTokenAuth("test-token-123");
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {},
    };

    const result = auth.apply(config);

    expect(result.headers?.["Authorization"]).toBe("Bearer test-token-123");
  });

  it("should preserve existing headers", () => {
    const auth = new BearerTokenAuth("test-token");
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {
        "Content-Type": "application/json",
        "X-Custom": "value",
      },
    };

    const result = auth.apply(config);

    expect(result.headers?.["Authorization"]).toBe("Bearer test-token");
    expect(result.headers?.["Content-Type"]).toBe("application/json");
    expect(result.headers?.["X-Custom"]).toBe("value");
  });

  it("should override existing Authorization header", () => {
    const auth = new BearerTokenAuth("new-token");
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {
        Authorization: "Bearer old-token",
      },
    };

    const result = auth.apply(config);

    expect(result.headers?.["Authorization"]).toBe("Bearer new-token");
  });
});

describe("ApiKeyAuth", () => {
  it("should add API key with default header name", () => {
    const auth = new ApiKeyAuth("my-api-key");
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {},
    };

    const result = auth.apply(config);

    expect(result.headers?.["X-API-Key"]).toBe("my-api-key");
  });

  it("should add API key with custom header name", () => {
    const auth = new ApiKeyAuth("secret-key", "X-Custom-API-Key");
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {},
    };

    const result = auth.apply(config);

    expect(result.headers?.["X-Custom-API-Key"]).toBe("secret-key");
    expect(result.headers?.["X-API-Key"]).toBeUndefined();
  });

  it("should preserve other headers", () => {
    const auth = new ApiKeyAuth("key123", "X-Auth");
    const config: RequestConfig = {
      method: HttpMethod.POST,
      endpoint: "/api/data",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const result = auth.apply(config);

    expect(result.headers?.["X-Auth"]).toBe("key123");
    expect(result.headers?.["Content-Type"]).toBe("application/json");
  });
});

describe("BasicAuth", () => {
  it("should add Basic auth header with base64 encoded credentials", () => {
    const auth = new BasicAuth("user", "pass");
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {},
    };

    const result = auth.apply(config);

    // btoa('user:pass') = 'dXNlcjpwYXNz'
    expect(result.headers?.["Authorization"]).toBe("Basic dXNlcjpwYXNz");
  });

  it("should handle special characters in credentials", () => {
    const auth = new BasicAuth("admin@example.com", "p@ssw0rd!");
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {},
    };

    const result = auth.apply(config);

    // Verify it's a valid Basic auth header
    expect(result.headers?.["Authorization"]).toMatch(/^Basic /);

    // Decode and verify
    const base64 = result.headers?.["Authorization"].split(" ")[1];
    const decoded = atob(base64);
    expect(decoded).toBe("admin@example.com:p@ssw0rd!");
  });

  it("should preserve existing headers", () => {
    const auth = new BasicAuth("user", "pass");
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {
        Accept: "application/json",
      },
    };

    const result = auth.apply(config);

    expect(result.headers?.["Authorization"]).toBeDefined();
    expect(result.headers?.["Accept"]).toBe("application/json");
  });
});

describe("CustomHeaderAuth", () => {
  it("should add custom headers", () => {
    const auth = new CustomHeaderAuth({
      "X-API-Token": "token123",
      "X-Client-ID": "client456",
    });
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {},
    };

    const result = auth.apply(config);

    expect(result.headers?.["X-API-Token"]).toBe("token123");
    expect(result.headers?.["X-Client-ID"]).toBe("client456");
  });

  it("should merge with existing headers", () => {
    const auth = new CustomHeaderAuth({
      "X-Custom": "value",
    });
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const result = auth.apply(config);

    expect(result.headers?.["X-Custom"]).toBe("value");
    expect(result.headers?.["Content-Type"]).toBe("application/json");
  });

  it("should override existing headers with same name", () => {
    const auth = new CustomHeaderAuth({
      "X-Version": "v2",
    });
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {
        "X-Version": "v1",
      },
    };

    const result = auth.apply(config);

    expect(result.headers?.["X-Version"]).toBe("v2");
  });

  it("should handle empty headers object", () => {
    const auth = new CustomHeaderAuth({});
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {
        "Content-Type": "text/plain",
      },
    };

    const result = auth.apply(config);

    expect(result.headers?.["Content-Type"]).toBe("text/plain");
  });

  it("should handle multiple custom headers", () => {
    const auth = new CustomHeaderAuth({
      "X-Header-1": "value1",
      "X-Header-2": "value2",
      "X-Header-3": "value3",
    });
    const config: RequestConfig = {
      method: HttpMethod.POST,
      endpoint: "/api",
      headers: {},
    };

    const result = auth.apply(config);

    expect(result.headers?.["X-Header-1"]).toBe("value1");
    expect(result.headers?.["X-Header-2"]).toBe("value2");
    expect(result.headers?.["X-Header-3"]).toBe("value3");
  });
});

describe("QueryParamAuth", () => {
  it("should add query parameter for authentication", () => {
    const auth = new QueryParamAuth("key", "my-api-key");
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {},
    };

    const result = auth.apply(config);

    expect(result.query?.["key"]).toBe("my-api-key");
  });

  it("should add query parameter with custom param name", () => {
    const auth = new QueryParamAuth("api_key", "secret123");
    const config: RequestConfig = {
      method: HttpMethod.POST,
      endpoint: "/api/data",
      headers: {},
    };

    const result = auth.apply(config);

    expect(result.query?.["api_key"]).toBe("secret123");
  });

  it("should preserve existing query parameters", () => {
    const auth = new QueryParamAuth("key", "api-key-value");
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {},
      query: {
        filter: "active",
        limit: 10,
      },
    };

    const result = auth.apply(config);

    expect(result.query?.["key"]).toBe("api-key-value");
    expect(result.query?.["filter"]).toBe("active");
    expect(result.query?.["limit"]).toBe(10);
  });

  it("should override existing query parameter with same name", () => {
    const auth = new QueryParamAuth("token", "new-token");
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {},
      query: {
        token: "old-token",
      },
    };

    const result = auth.apply(config);

    expect(result.query?.["token"]).toBe("new-token");
  });

  it("should work when config has no query parameters initially", () => {
    const auth = new QueryParamAuth("key", "value");
    const config: RequestConfig = {
      method: HttpMethod.GET,
      endpoint: "/test",
      headers: {},
    };

    const result = auth.apply(config);

    expect(result.query?.["key"]).toBe("value");
  });
});
