// [retained filename for backwards compatibility — now provides NestJS-compatible HTTP mocks]
import type { AzureUser } from '@project-olympus/auth';

export function createMockRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    body: {},
    params: {},
    query: {},
    headers: { authorization: undefined },
    ip: '127.0.0.1',
    user: undefined as AzureUser | undefined,
    method: 'GET',
    url: '/test',
    ...overrides,
  };
}

export function createMockExecutionContext(user?: AzureUser) {
  const request = createMockRequest({ user });
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  };
}
