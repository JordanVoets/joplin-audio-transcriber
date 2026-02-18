/**
 * Tests for Connector and Request classes
 */

import { Connector, Request } from '../../src/http/Connector';
import {
  HttpMethod,
  RequestConfig,
  Response,
  HttpError,
  AuthHandler,
  RequestMiddleware,
  ResponseInterceptor,
} from '../../src/http/types';

// Mock Connector for testing
class MockConnector extends Connector {
  baseUrl(): string {
    return 'https://api.example.com';
  }

  // Override to return mock responses
  protected async executeRequest<TResponse>(
    config: RequestConfig,
  ): Promise<Response<TResponse>> {
    return {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: { success: true } as TResponse,
      ok: true,
    };
  }
}

// Mock Request for testing
class MockRequest extends Request<{ message: string }> {
  method(): HttpMethod {
    return HttpMethod.GET;
  }

  endpoint(): string {
    return '/test';
  }
}

describe('Connector', () => {
  describe('baseUrl', () => {
    it('should return the configured base URL', () => {
      const connector = new MockConnector();
      expect(connector.baseUrl()).toBe('https://api.example.com');
    });
  });

  describe('defaultHeaders', () => {
    it('should include default Content-Type header', async () => {
      const connector = new MockConnector();
      const executeSpy = jest.spyOn(connector as any, 'executeRequest');

      await connector.send(new MockRequest());

      expect(executeSpy).toHaveBeenCalled();
      const config = executeSpy.mock.calls[0][0] as RequestConfig;
      expect(config.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('withAuth', () => {
    it('should apply authentication handler', async () => {
      const authHandler: AuthHandler = {
        apply: jest.fn((config) => ({
          ...config,
          headers: {
            ...config.headers,
            Authorization: 'Bearer test-token',
          },
        })),
      };

      const connector = new MockConnector();
      connector.withAuth(authHandler);

      const executeSpy = jest.spyOn(connector as any, 'executeRequest');
      await connector.send(new MockRequest());

      expect(authHandler.apply).toHaveBeenCalled();
      const config = executeSpy.mock.calls[0][0] as RequestConfig;
      expect(config.headers['Authorization']).toBe('Bearer test-token');
    });

    it('should return connector instance for chaining', () => {
      const connector = new MockConnector();
      const authHandler: AuthHandler = {
        apply: (config) => config,
      };

      const result = connector.withAuth(authHandler);

      expect(result).toBe(connector);
    });
  });

  describe('withMiddleware', () => {
    it('should apply middleware to requests', async () => {
      const middleware: RequestMiddleware = jest.fn((config) => ({
        ...config,
        headers: {
          ...config.headers,
          'X-Custom': 'middleware-value',
        },
      }));

      const connector = new MockConnector();
      connector.withMiddleware(middleware);

      const executeSpy = jest.spyOn(connector as any, 'executeRequest');
      await connector.send(new MockRequest());

      expect(middleware).toHaveBeenCalled();
      const config = executeSpy.mock.calls[0][0] as RequestConfig;
      expect(config.headers['X-Custom']).toBe('middleware-value');
    });

    it('should apply multiple middlewares in order', async () => {
      const order: number[] = [];
      const middleware1: RequestMiddleware = (config) => {
        order.push(1);
        return config;
      };
      const middleware2: RequestMiddleware = (config) => {
        order.push(2);
        return config;
      };

      const connector = new MockConnector();
      connector.withMiddleware(middleware1).withMiddleware(middleware2);

      await connector.send(new MockRequest());

      expect(order).toEqual([1, 2]);
    });

    it('should return connector instance for chaining', () => {
      const connector = new MockConnector();
      const middleware: RequestMiddleware = (config) => config;

      const result = connector.withMiddleware(middleware);

      expect(result).toBe(connector);
    });
  });

  describe('withResponseInterceptor', () => {
    it('should apply response interceptor', async () => {
      let interceptorCalled = false;
      const interceptor: ResponseInterceptor = <T>(response: Response<T>): Response<T> => {
        interceptorCalled = true;
        return response;
      };

      const connector = new MockConnector();
      connector.withResponseInterceptor(interceptor);

      await connector.send(new MockRequest());

      expect(interceptorCalled).toBe(true);
    });

    it('should apply multiple interceptors in order', async () => {
      const order: number[] = [];
      const interceptor1: ResponseInterceptor = <T>(response: Response<T>): Response<T> => {
        order.push(1);
        return response;
      };
      const interceptor2: ResponseInterceptor = <T>(response: Response<T>): Response<T> => {
        order.push(2);
        return response;
      };

      const connector = new MockConnector();
      connector.withResponseInterceptor(interceptor1).withResponseInterceptor(interceptor2);

      await connector.send(new MockRequest());

      expect(order).toEqual([1, 2]);
    });

    it('should return connector instance for chaining', () => {
      const connector = new MockConnector();
      const interceptor: ResponseInterceptor = <T>(response: Response<T>) => response;

      const result = connector.withResponseInterceptor(interceptor);

      expect(result).toBe(connector);
    });
  });

  describe('withErrorHandler', () => {
    it('should call error handlers on HTTP errors', async () => {
      class ErrorConnector extends Connector {
        baseUrl(): string {
          return 'https://api.example.com';
        }

        protected async executeRequest<TResponse>(): Promise<Response<TResponse>> {
          throw new HttpError('Not Found', 404);
        }
      }

      const errorHandler = jest.fn();
      const connector = new ErrorConnector();
      connector.withErrorHandler(errorHandler);

      await expect(connector.send(new MockRequest())).rejects.toThrow('Not Found');
      expect(errorHandler).toHaveBeenCalled();
      expect(errorHandler.mock.calls[0][0]).toBeInstanceOf(HttpError);
    });

    it('should call multiple error handlers', async () => {
      class ErrorConnector extends Connector {
        baseUrl(): string {
          return 'https://api.example.com';
        }

        protected async executeRequest<TResponse>(): Promise<Response<TResponse>> {
          throw new HttpError('Server Error', 500);
        }
      }

      const handler1 = jest.fn();
      const handler2 = jest.fn();

      const connector = new ErrorConnector();
      connector.withErrorHandler(handler1).withErrorHandler(handler2);

      await expect(connector.send(new MockRequest())).rejects.toThrow();

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should return connector instance for chaining', () => {
      const connector = new MockConnector();
      const handler = jest.fn();

      const result = connector.withErrorHandler(handler);

      expect(result).toBe(connector);
    });
  });

  describe('send', () => {
    it('should send request and return response', async () => {
      const connector = new MockConnector();
      const response = await connector.send(new MockRequest());

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
      expect(response.data).toEqual({ success: true });
    });

    it('should merge default headers with request headers', async () => {
      class CustomRequest extends Request<unknown> {
        method(): HttpMethod {
          return HttpMethod.POST;
        }

        endpoint(): string {
          return '/custom';
        }

        protected headers(): Record<string, string> {
          return {
            'X-Custom-Header': 'value',
          };
        }
      }

      const connector = new MockConnector();
      const executeSpy = jest.spyOn(connector as any, 'executeRequest');

      await connector.send(new CustomRequest());

      const config = executeSpy.mock.calls[0][0] as RequestConfig;
      expect(config.headers['Content-Type']).toBe('application/json');
      expect(config.headers['X-Custom-Header']).toBe('value');
    });
  });
});

describe('Request', () => {
  class TestGetRequest extends Request<{ data: string }> {
    method(): HttpMethod {
      return HttpMethod.GET;
    }

    endpoint(): string {
      return '/test/get';
    }
  }

  class TestPostRequest extends Request<{ id: number }> {
    constructor(private payload: { name: string }) {
      super();
    }

    method(): HttpMethod {
      return HttpMethod.POST;
    }

    endpoint(): string {
      return '/test/create';
    }

    protected body(): unknown {
      return this.payload;
    }
  }

  class TestQueryRequest extends Request<unknown> {
    constructor(
      private page: number,
      private limit: number,
    ) {
      super();
    }

    method(): HttpMethod {
      return HttpMethod.GET;
    }

    endpoint(): string {
      return '/test/list';
    }

    protected query(): Record<string, string | number | boolean> {
      return {
        page: this.page,
        limit: this.limit,
      };
    }
  }

  describe('buildConfig', () => {
    it('should build config for GET request', async () => {
      const request = new TestGetRequest();
      const config = await request.buildConfig();

      expect(config.method).toBe(HttpMethod.GET);
      expect(config.endpoint).toBe('/test/get');
      expect(config.headers).toEqual({});
      expect(config.query).toBeUndefined();
      expect(config.body).toBeUndefined();
    });

    it('should build config for POST request with body', async () => {
      const request = new TestPostRequest({ name: 'Test' });
      const config = await request.buildConfig();

      expect(config.method).toBe(HttpMethod.POST);
      expect(config.endpoint).toBe('/test/create');
      expect(config.body).toEqual({ name: 'Test' });
    });

    it('should build config with query parameters', async () => {
      const request = new TestQueryRequest(2, 50);
      const config = await request.buildConfig();

      expect(config.method).toBe(HttpMethod.GET);
      expect(config.endpoint).toBe('/test/list');
      expect(config.query).toEqual({
        page: 2,
        limit: 50,
      });
    });
  });

  describe('headers', () => {
    it('should return custom headers', async () => {
      class RequestWithHeaders extends Request<unknown> {
        method(): HttpMethod {
          return HttpMethod.GET;
        }

        endpoint(): string {
          return '/test';
        }

        protected headers(): Record<string, string> {
          return {
            'X-Custom': 'value',
            'Accept': 'application/json',
          };
        }
      }

      const request = new RequestWithHeaders();
      const config = await request.buildConfig();

      expect(config.headers).toEqual({
        'X-Custom': 'value',
        'Accept': 'application/json',
      });
    });
  });

  describe('handleResponse', () => {
    it('should return response unchanged by default', async () => {
      const request = new TestGetRequest();
      const response: Response<{ data: string }> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { data: 'test' },
        ok: true,
      };

      const result = await request.handleResponse(response);

      expect(result).toEqual(response);
    });

    it('should allow custom response handling', async () => {
      class CustomHandlerRequest extends Request<{ value: number }> {
        method(): HttpMethod {
          return HttpMethod.GET;
        }

        endpoint(): string {
          return '/test';
        }

        async handleResponse(response: Response<{ value: number }>): Promise<Response<{ value: number }>> {
          return {
            ...response,
            data: {
              value: response.data.value * 2,
            },
          };
        }
      }

      const request = new CustomHandlerRequest();
      const response: Response<{ value: number }> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { value: 5 },
        ok: true,
      };

      const result = await request.handleResponse(response);

      expect(result.data.value).toBe(10);
    });
  });

  describe('different HTTP methods', () => {
    it('should support PUT method', async () => {
      class PutRequest extends Request<unknown> {
        method(): HttpMethod {
          return HttpMethod.PUT;
        }

        endpoint(): string {
          return '/test/update';
        }
      }

      const request = new PutRequest();
      const config = await request.buildConfig();

      expect(config.method).toBe(HttpMethod.PUT);
    });

    it('should support PATCH method', async () => {
      class PatchRequest extends Request<unknown> {
        method(): HttpMethod {
          return HttpMethod.PATCH;
        }

        endpoint(): string {
          return '/test/patch';
        }
      }

      const request = new PatchRequest();
      const config = await request.buildConfig();

      expect(config.method).toBe(HttpMethod.PATCH);
    });

    it('should support DELETE method', async () => {
      class DeleteRequest extends Request<unknown> {
        method(): HttpMethod {
          return HttpMethod.DELETE;
        }

        endpoint(): string {
          return '/test/delete';
        }
      }

      const request = new DeleteRequest();
      const config = await request.buildConfig();

      expect(config.method).toBe(HttpMethod.DELETE);
    });
  });

  describe('complex request scenarios', () => {
    it('should handle FormData body', async () => {
      class UploadRequest extends Request<{ uploaded: boolean }> {
        constructor(private file: Blob) {
          super();
        }

        method(): HttpMethod {
          return HttpMethod.POST;
        }

        endpoint(): string {
          return '/upload';
        }

        protected body(): unknown {
          const formData = new FormData();
          formData.append('file', this.file);
          return formData;
        }
      }

      const blob = new Blob(['test'], { type: 'text/plain' });
      const request = new UploadRequest(blob);
      const config = await request.buildConfig();

      expect(config.body).toBeInstanceOf(FormData);
    });

    it('should handle dynamic endpoints', async () => {
      class DynamicRequest extends Request<unknown> {
        constructor(private id: string) {
          super();
        }

        method(): HttpMethod {
          return HttpMethod.GET;
        }

        endpoint(): string {
          return `/users/${this.id}`;
        }
      }

      const request = new DynamicRequest('123');
      const config = await request.buildConfig();

      expect(config.endpoint).toBe('/users/123');
    });
  });
});
