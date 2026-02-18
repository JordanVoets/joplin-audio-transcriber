import { RequestConfig, AuthHandler } from './types';

/**
 * Bearer token authentication handler
 */
export class BearerTokenAuth implements AuthHandler {
  constructor(private token: string) {}

  apply(config: RequestConfig): RequestConfig {
    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${this.token}`,
      },
    };
  }
}

/**
 * API key authentication handler (as header)
 */
export class ApiKeyAuth implements AuthHandler {
  constructor(
    private apiKey: string,
    private headerName: string = 'X-API-Key',
  ) {}

  apply(config: RequestConfig): RequestConfig {
    return {
      ...config,
      headers: {
        ...config.headers,
        [this.headerName]: this.apiKey,
      },
    };
  }
}

/**
 * Basic authentication handler
 */
export class BasicAuth implements AuthHandler {
  constructor(
    private username: string,
    private password: string,
  ) {}

  apply(config: RequestConfig): RequestConfig {
    const credentials = btoa(`${this.username}:${this.password}`);
    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Basic ${credentials}`,
      },
    };
  }
}

/**
 * Custom header authentication handler
 */
export class CustomHeaderAuth implements AuthHandler {
  constructor(private headers: Record<string, string>) {}

  apply(config: RequestConfig): RequestConfig {
    return {
      ...config,
      headers: {
        ...config.headers,
        ...this.headers,
      },
    };
  }
}
