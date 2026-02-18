import { Response } from './types';

/**
 * Base response handler for extracting and validating data
 */
export abstract class ResponseHandler<TRaw, TProcessed> {
  /**
   * Process the raw response data
   */
  abstract process(data: TRaw): TProcessed | Promise<TProcessed>;

  /**
   * Validate the processed data
   * Override to add custom validation logic
   */
  validate(data: TProcessed): boolean {
    return true;
  }

  /**
   * Handle the response
   */
  async handle(response: Response<TRaw>): Promise<TProcessed> {
    const processed = await this.process(response.data);

    if (!this.validate(processed)) {
      throw new Error('Response validation failed');
    }

    return processed;
  }
}

/**
 * JSON response handler with optional schema validation
 */
export class JsonResponseHandler<T> extends ResponseHandler<unknown, T> {
  constructor(private validator?: (data: unknown) => data is T) {
    super();
  }

  process(data: unknown): T {
    return data as T;
  }

  validate(data: T): boolean {
    if (this.validator) {
      return this.validator(data);
    }
    return true;
  }
}

/**
 * Text response handler
 */
export class TextResponseHandler extends ResponseHandler<string, string> {
  process(data: string): string {
    return data;
  }
}

/**
 * Blob response handler
 */
export class BlobResponseHandler extends ResponseHandler<Blob, Blob> {
  process(data: Blob): Blob {
    return data;
  }
}

/**
 * Array response handler with item validation
 */
export class ArrayResponseHandler<T> extends ResponseHandler<unknown[], T[]> {
  constructor(private itemValidator?: (item: unknown) => item is T) {
    super();
  }

  process(data: unknown[]): T[] {
    return data as T[];
  }

  validate(data: T[]): boolean {
    if (this.itemValidator) {
      return data.every((item) => this.itemValidator!(item));
    }
    return Array.isArray(data);
  }
}
