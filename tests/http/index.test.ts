/**
 * Tests for index.ts exports
 */

import * as HttpModule from "../../src/http";

describe("HTTP Module Exports", () => {
  describe("Core classes", () => {
    it("should export Connector", () => {
      expect(HttpModule.Connector).toBeDefined();
      expect(typeof HttpModule.Connector).toBe("function");
    });

    it("should export Request", () => {
      expect(HttpModule.Request).toBeDefined();
      expect(typeof HttpModule.Request).toBe("function");
    });
  });

  describe("Types", () => {
    it("should export HttpMethod", () => {
      expect(HttpModule.HttpMethod).toBeDefined();
      expect(HttpModule.HttpMethod.GET).toBe("GET");
      expect(HttpModule.HttpMethod.POST).toBe("POST");
      expect(HttpModule.HttpMethod.PUT).toBe("PUT");
      expect(HttpModule.HttpMethod.PATCH).toBe("PATCH");
      expect(HttpModule.HttpMethod.DELETE).toBe("DELETE");
      expect(HttpModule.HttpMethod.HEAD).toBe("HEAD");
      expect(HttpModule.HttpMethod.OPTIONS).toBe("OPTIONS");
    });

    it("should export HttpError", () => {
      expect(HttpModule.HttpError).toBeDefined();
      expect(typeof HttpModule.HttpError).toBe("function");

      const error = new HttpModule.HttpError("Test", 500);
      expect(error).toBeInstanceOf(Error);
      expect(error.status).toBe(500);
    });
  });

  describe("Authentication handlers", () => {
    it("should export BearerTokenAuth", () => {
      expect(HttpModule.BearerTokenAuth).toBeDefined();
      expect(typeof HttpModule.BearerTokenAuth).toBe("function");

      const auth = new HttpModule.BearerTokenAuth("token");
      expect(auth).toBeDefined();
    });

    it("should export ApiKeyAuth", () => {
      expect(HttpModule.ApiKeyAuth).toBeDefined();
      expect(typeof HttpModule.ApiKeyAuth).toBe("function");

      const auth = new HttpModule.ApiKeyAuth("key");
      expect(auth).toBeDefined();
    });

    it("should export BasicAuth", () => {
      expect(HttpModule.BasicAuth).toBeDefined();
      expect(typeof HttpModule.BasicAuth).toBe("function");

      const auth = new HttpModule.BasicAuth("user", "pass");
      expect(auth).toBeDefined();
    });

    it("should export CustomHeaderAuth", () => {
      expect(HttpModule.CustomHeaderAuth).toBeDefined();
      expect(typeof HttpModule.CustomHeaderAuth).toBe("function");

      const auth = new HttpModule.CustomHeaderAuth({});
      expect(auth).toBeDefined();
    });
  });

  describe("Middleware and interceptors", () => {
    it("should export loggingMiddleware", () => {
      expect(HttpModule.loggingMiddleware).toBeDefined();
      expect(typeof HttpModule.loggingMiddleware).toBe("function");

      const middleware = HttpModule.loggingMiddleware();
      expect(typeof middleware).toBe("function");
    });

    it("should export timeoutMiddleware", () => {
      expect(HttpModule.timeoutMiddleware).toBeDefined();
      expect(typeof HttpModule.timeoutMiddleware).toBe("function");

      const middleware = HttpModule.timeoutMiddleware(5000);
      expect(typeof middleware).toBe("function");
    });

    it("should export customHeaderMiddleware", () => {
      expect(HttpModule.customHeaderMiddleware).toBeDefined();
      expect(typeof HttpModule.customHeaderMiddleware).toBe("function");

      const middleware = HttpModule.customHeaderMiddleware({});
      expect(typeof middleware).toBe("function");
    });

    it("should export defaultQueryMiddleware", () => {
      expect(HttpModule.defaultQueryMiddleware).toBeDefined();
      expect(typeof HttpModule.defaultQueryMiddleware).toBe("function");

      const middleware = HttpModule.defaultQueryMiddleware({});
      expect(typeof middleware).toBe("function");
    });

    it("should export responseLoggingInterceptor", () => {
      expect(HttpModule.responseLoggingInterceptor).toBeDefined();
      expect(typeof HttpModule.responseLoggingInterceptor).toBe("function");

      const interceptor = HttpModule.responseLoggingInterceptor();
      expect(typeof interceptor).toBe("function");
    });

    it("should export transformResponseInterceptor", () => {
      expect(HttpModule.transformResponseInterceptor).toBeDefined();
      expect(typeof HttpModule.transformResponseInterceptor).toBe("function");

      const interceptor = HttpModule.transformResponseInterceptor(
        (x: unknown) => x,
      );
      expect(typeof interceptor).toBe("function");
    });

    it("should export errorLoggingHandler", () => {
      expect(HttpModule.errorLoggingHandler).toBeDefined();
      expect(typeof HttpModule.errorLoggingHandler).toBe("function");

      const handler = HttpModule.errorLoggingHandler();
      expect(typeof handler).toBe("function");
    });

    it("should export retryErrorHandler", () => {
      expect(HttpModule.retryErrorHandler).toBeDefined();
      expect(typeof HttpModule.retryErrorHandler).toBe("function");

      const handler = HttpModule.retryErrorHandler();
      expect(typeof handler).toBe("function");
    });
  });

  describe("Response handlers", () => {
    it("should export ResponseHandler", () => {
      expect(HttpModule.ResponseHandler).toBeDefined();
      expect(typeof HttpModule.ResponseHandler).toBe("function");
    });

    it("should export JsonResponseHandler", () => {
      expect(HttpModule.JsonResponseHandler).toBeDefined();
      expect(typeof HttpModule.JsonResponseHandler).toBe("function");

      const handler = new HttpModule.JsonResponseHandler();
      expect(handler).toBeDefined();
    });

    it("should export TextResponseHandler", () => {
      expect(HttpModule.TextResponseHandler).toBeDefined();
      expect(typeof HttpModule.TextResponseHandler).toBe("function");

      const handler = new HttpModule.TextResponseHandler();
      expect(handler).toBeDefined();
    });

    it("should export BlobResponseHandler", () => {
      expect(HttpModule.BlobResponseHandler).toBeDefined();
      expect(typeof HttpModule.BlobResponseHandler).toBe("function");

      const handler = new HttpModule.BlobResponseHandler();
      expect(handler).toBeDefined();
    });

    it("should export ArrayResponseHandler", () => {
      expect(HttpModule.ArrayResponseHandler).toBeDefined();
      expect(typeof HttpModule.ArrayResponseHandler).toBe("function");

      const handler = new HttpModule.ArrayResponseHandler();
      expect(handler).toBeDefined();
    });
  });

  describe("Integration", () => {
    it("should allow creating a functional connector", () => {
      class TestConnector extends HttpModule.Connector {
        baseUrl(): string {
          return "https://api.test.com";
        }
      }

      const connector = new TestConnector();
      expect(connector.baseUrl()).toBe("https://api.test.com");
    });

    it("should allow creating a functional request", () => {
      class TestRequest extends HttpModule.Request<{ data: string }> {
        method(): HttpModule.HttpMethod {
          return HttpModule.HttpMethod.GET;
        }

        endpoint(): string {
          return "/test";
        }
      }

      const request = new TestRequest();
      expect(request.method()).toBe("GET");
      expect(request.endpoint()).toBe("/test");
    });

    it("should allow using auth handlers with connectors", () => {
      class TestConnector extends HttpModule.Connector {
        constructor(token: string) {
          super();
          this.withAuth(new HttpModule.BearerTokenAuth(token));
        }

        baseUrl(): string {
          return "https://api.test.com";
        }
      }

      const connector = new TestConnector("test-token");
      expect(connector).toBeDefined();
    });

    it("should allow using middleware with connectors", () => {
      class TestConnector extends HttpModule.Connector {
        constructor() {
          super();
          this.withMiddleware(HttpModule.loggingMiddleware());
          this.withMiddleware(
            HttpModule.customHeaderMiddleware({ "X-Custom": "value" }),
          );
        }

        baseUrl(): string {
          return "https://api.test.com";
        }
      }

      const connector = new TestConnector();
      expect(connector).toBeDefined();
    });

    it("should allow chaining connector configuration", () => {
      class TestConnector extends HttpModule.Connector {
        baseUrl(): string {
          return "https://api.test.com";
        }
      }

      const connector = new TestConnector();

      const result = connector
        .withAuth(new HttpModule.BearerTokenAuth("token"))
        .withMiddleware(HttpModule.loggingMiddleware())
        .withResponseInterceptor(HttpModule.responseLoggingInterceptor())
        .withErrorHandler(HttpModule.errorLoggingHandler());

      expect(result).toBe(connector);
    });
  });
});
