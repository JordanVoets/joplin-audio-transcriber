/**
 * Tests for response handlers
 */

import {
  ResponseHandler,
  JsonResponseHandler,
  TextResponseHandler,
  BlobResponseHandler,
  ArrayResponseHandler,
} from '../../src/http/ResponseHandler';
import { Response } from '../../src/http/types';

describe('ResponseHandler', () => {
  class TestResponseHandler extends ResponseHandler<string, number> {
    process(data: string): number {
      return parseInt(data, 10);
    }

    validate(data: number): boolean {
      return !isNaN(data) && data > 0;
    }
  }

  it('should process and validate data successfully', async () => {
    const handler = new TestResponseHandler();
    const response: Response<string> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: '42',
      ok: true,
    };

    const result = await handler.handle(response);

    expect(result).toBe(42);
  });

  it('should throw error when validation fails', async () => {
    const handler = new TestResponseHandler();
    const response: Response<string> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: '-5',
      ok: true,
    };

    await expect(handler.handle(response)).rejects.toThrow('Response validation failed');
  });

  it('should throw error when processing invalid data', async () => {
    const handler = new TestResponseHandler();
    const response: Response<string> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: 'not-a-number',
      ok: true,
    };

    await expect(handler.handle(response)).rejects.toThrow('Response validation failed');
  });

  it('should handle async processing', async () => {
    class AsyncHandler extends ResponseHandler<string, string> {
      async process(data: string): Promise<string> {
        return new Promise((resolve) => {
          setTimeout(() => resolve(data.toUpperCase()), 10);
        });
      }
    }

    const handler = new AsyncHandler();
    const response: Response<string> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: 'hello',
      ok: true,
    };

    const result = await handler.handle(response);

    expect(result).toBe('HELLO');
  });
});

describe('JsonResponseHandler', () => {
  it('should process JSON data without validation', async () => {
    const handler = new JsonResponseHandler<{ name: string; age: number }>();
    const response: Response<unknown> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { name: 'John', age: 30 },
      ok: true,
    };

    const result = await handler.handle(response);

    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('should validate data with custom validator', async () => {
    interface User {
      id: number;
      email: string;
    }

    const validator = (data: unknown): data is User => {
      return (
        typeof data === 'object' &&
        data !== null &&
        'id' in data &&
        'email' in data &&
        typeof (data as User).id === 'number' &&
        typeof (data as User).email === 'string'
      );
    };

    const handler = new JsonResponseHandler<User>(validator);
    const response: Response<unknown> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { id: 1, email: 'test@example.com' },
      ok: true,
    };

    const result = await handler.handle(response);

    expect(result).toEqual({ id: 1, email: 'test@example.com' });
  });

  it('should throw error when validation fails', async () => {
    interface User {
      id: number;
      email: string;
    }

    const validator = (data: unknown): data is User => {
      return (
        typeof data === 'object' &&
        data !== null &&
        'id' in data &&
        'email' in data
      );
    };

    const handler = new JsonResponseHandler<User>(validator);
    const response: Response<unknown> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { name: 'Invalid' },
      ok: true,
    };

    await expect(handler.handle(response)).rejects.toThrow('Response validation failed');
  });

  it('should handle nested objects', async () => {
    interface NestedData {
      user: {
        profile: {
          name: string;
        };
      };
    }

    const handler = new JsonResponseHandler<NestedData>();
    const response: Response<unknown> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: {
        user: {
          profile: {
            name: 'Alice',
          },
        },
      },
      ok: true,
    };

    const result = await handler.handle(response);

    expect(result.user.profile.name).toBe('Alice');
  });
});

describe('TextResponseHandler', () => {
  it('should process text data', async () => {
    const handler = new TextResponseHandler();
    const response: Response<string> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: 'Hello, World!',
      ok: true,
    };

    const result = await handler.handle(response);

    expect(result).toBe('Hello, World!');
  });

  it('should handle empty string', async () => {
    const handler = new TextResponseHandler();
    const response: Response<string> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: '',
      ok: true,
    };

    const result = await handler.handle(response);

    expect(result).toBe('');
  });

  it('should handle multiline text', async () => {
    const handler = new TextResponseHandler();
    const text = 'Line 1\nLine 2\nLine 3';
    const response: Response<string> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: text,
      ok: true,
    };

    const result = await handler.handle(response);

    expect(result).toBe(text);
  });
});

describe('BlobResponseHandler', () => {
  it('should process blob data', async () => {
    const handler = new BlobResponseHandler();
    const blob = new Blob(['test content'], { type: 'text/plain' });
    const response: Response<Blob> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: blob,
      ok: true,
    };

    const result = await handler.handle(response);

    expect(result).toBe(blob);
    expect(result.type).toBe('text/plain');
  });

  it('should handle different blob types', async () => {
    const handler = new BlobResponseHandler();
    const blob = new Blob(['{"key":"value"}'], { type: 'application/json' });
    const response: Response<Blob> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: blob,
      ok: true,
    };

    const result = await handler.handle(response);

    expect(result.type).toBe('application/json');
  });

  it('should preserve blob size', async () => {
    const handler = new BlobResponseHandler();
    const content = 'This is test content';
    const blob = new Blob([content]);
    const response: Response<Blob> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: blob,
      ok: true,
    };

    const result = await handler.handle(response);

    expect(result.size).toBe(content.length);
  });
});

describe('ArrayResponseHandler', () => {
  it('should process array without item validation', async () => {
    const handler = new ArrayResponseHandler<{ id: number }>();
    const response: Response<unknown[]> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: [{ id: 1 }, { id: 2 }, { id: 3 }],
      ok: true,
    };

    const result = await handler.handle(response);

    expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it('should validate array items with custom validator', async () => {
    interface Item {
      id: number;
      name: string;
    }

    const itemValidator = (item: unknown): item is Item => {
      return (
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        'name' in item &&
        typeof (item as Item).id === 'number' &&
        typeof (item as Item).name === 'string'
      );
    };

    const handler = new ArrayResponseHandler<Item>(itemValidator);
    const response: Response<unknown[]> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ],
      ok: true,
    };

    const result = await handler.handle(response);

    expect(result).toEqual([
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ]);
  });

  it('should throw error when item validation fails', async () => {
    interface Item {
      id: number;
      name: string;
    }

    const itemValidator = (item: unknown): item is Item => {
      return (
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        'name' in item
      );
    };

    const handler = new ArrayResponseHandler<Item>(itemValidator);
    const response: Response<unknown[]> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: [
        { id: 1, name: 'Valid' },
        { invalid: 'data' },
      ],
      ok: true,
    };

    await expect(handler.handle(response)).rejects.toThrow('Response validation failed');
  });

  it('should handle empty array', async () => {
    const handler = new ArrayResponseHandler<{ id: number }>();
    const response: Response<unknown[]> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: [],
      ok: true,
    };

    const result = await handler.handle(response);

    expect(result).toEqual([]);
  });

  it('should validate that data is an array', async () => {
    const handler = new ArrayResponseHandler<number>();
    const response: Response<unknown[]> = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: [1, 2, 3],
      ok: true,
    };

    const result = await handler.handle(response);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([1, 2, 3]);
  });
});
