import { Response } from "./types";

/**
 * Base response handler for extracting and validating data
 */
export abstract class ResponseHandler<TRaw, TProcessed> {
  abstract process(data: TRaw): TProcessed | Promise<TProcessed>;

  validate(_data: TProcessed): boolean {
    return true;
  }

  async handle(response: Response<TRaw>): Promise<TProcessed> {
    const processed = await this.process(response.data);

    if (!this.validate(processed)) {
      throw new Error("Response validation failed");
    }

    return processed;
  }
}

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

export class TextResponseHandler extends ResponseHandler<string, string> {
  process(data: string): string {
    return data;
  }
}

export class BlobResponseHandler extends ResponseHandler<Blob, Blob> {
  process(data: Blob): Blob {
    return data;
  }
}

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
