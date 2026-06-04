import { ExecutionContext } from '@nestjs/common';

export function createMockExecutionContext(overrides: Record<string, unknown> = {}): ExecutionContext {
  const req = {
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: '127.0.0.1',
    user: undefined,
    ...overrides,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis(),
        getHeader: jest.fn(),
        statusCode: 200,
      }),
    }),
    getClass: jest.fn(),
    getHandler: jest.fn(),
  } as unknown as ExecutionContext;
}
