/**
 * Tests for type definitions and HttpError class
 */

import { HttpError, HttpMethod, Response } from '../../src/http/types';

describe('HttpMethod enum', () => {
  it('should define all HTTP methods', () => {
    expect(HttpMethod.GET).toBe('GET');
    expect(HttpMethod.POST).toBe('POST');
    expect(HttpMethod.PUT).toBe('PUT');
    expect(HttpMethod.PATCH).toBe('PATCH');
    expect(HttpMethod.DELETE).toBe('DELETE');
    expect(HttpMethod.HEAD).toBe('HEAD');
    expect(HttpMethod.OPTIONS).toBe('OPTIONS');
  });
});

describe('HttpError', () => {
  it('should create error with message and status', () => {
    const error = new HttpError('Not Found', 404);

    expect(error.message).toBe('Not Found');
    expect(error.status).toBe(404);
    expect(error.name).toBe('HttpError');
    expect(error.response).toBeUndefined();
  });

  it('should create error with response object', () => {
    const response: Response<unknown> = {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      data: { error: 'Something went wrong' },
      ok: false,
    };

    const error = new HttpError('Server error', 500, response);

    expect(error.message).toBe('Server error');
    expect(error.status).toBe(500);
    expect(error.response).toBe(response);
    expect(error.response?.data).toEqual({ error: 'Something went wrong' });
  });

  it('should be instanceof Error', () => {
    const error = new HttpError('Test error', 400);

    expect(error instanceof Error).toBe(true);
    expect(error instanceof HttpError).toBe(true);
  });

  it('should have correct error name', () => {
    const error = new HttpError('Test', 500);

    expect(error.name).toBe('HttpError');
  });

  it('should preserve stack trace', () => {
    const error = new HttpError('Test error', 500);

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('HttpError');
  });

  it('should handle different status codes', () => {
    const error400 = new HttpError('Bad Request', 400);
    const error401 = new HttpError('Unauthorized', 401);
    const error403 = new HttpError('Forbidden', 403);
    const error404 = new HttpError('Not Found', 404);
    const error429 = new HttpError('Too Many Requests', 429);
    const error500 = new HttpError('Internal Server Error', 500);
    const error502 = new HttpError('Bad Gateway', 502);
    const error503 = new HttpError('Service Unavailable', 503);

    expect(error400.status).toBe(400);
    expect(error401.status).toBe(401);
    expect(error403.status).toBe(403);
    expect(error404.status).toBe(404);
    expect(error429.status).toBe(429);
    expect(error500.status).toBe(500);
    expect(error502.status).toBe(502);
    expect(error503.status).toBe(503);
  });

  it('should be throwable', () => {
    expect(() => {
      throw new HttpError('Test error', 500);
    }).toThrow(HttpError);

    expect(() => {
      throw new HttpError('Test error', 500);
    }).toThrow('Test error');
  });

  it('should be catchable as HttpError', () => {
    try {
      throw new HttpError('Custom error', 418);
    } catch (error) {
      expect(error instanceof HttpError).toBe(true);
      if (error instanceof HttpError) {
        expect(error.status).toBe(418);
        expect(error.message).toBe('Custom error');
      }
    }
  });

  it('should store response headers and data', () => {
    const response: Response<{ message: string }> = {
      status: 400,
      statusText: 'Bad Request',
      headers: {
        'content-type': 'application/json',
        'x-request-id': '123456',
      },
      data: { message: 'Invalid input' },
      ok: false,
    };

    const error = new HttpError('Validation failed', 400, response);

    expect(error.response?.headers['content-type']).toBe('application/json');
    expect(error.response?.headers['x-request-id']).toBe('123456');
    expect(error.response?.data).toEqual({ message: 'Invalid input' });
  });
});
