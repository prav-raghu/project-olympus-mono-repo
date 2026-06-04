process.env.NODE_ENV = 'test';
process.env.PORT = '4000';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.AZURE_TENANT_ID = '00000000-0000-0000-0000-000000000000';
process.env.AZURE_CLIENT_ID = '00000000-0000-0000-0000-000000000000';
process.env.REDIS_URL = 'redis://localhost:6379';

jest.mock('@project-olympus/logging', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  })),
  AzureMonitorLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  })),
  initAzureMonitor: jest.fn(),
}));
