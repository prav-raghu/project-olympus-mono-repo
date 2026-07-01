process.env.NODE_ENV = 'test';
process.env.PORT = '4000';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.AZURE_TENANT_ID = '00000000-0000-0000-0000-000000000000';
process.env.AZURE_CLIENT_ID = '00000000-0000-0000-0000-000000000000';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.DATABASE_URL_ADMIN = 'mysql://test:test@localhost:3306/test_admin';
process.env.DATABASE_URL_CUSTOMER = 'mysql://test:test@localhost:3306/test_customer';
process.env.DATABASE_URL_SCHEDULE = 'mysql://test:test@localhost:3306/test_schedule';
process.env.DATABASE_URL_SHARED = 'mysql://test:test@localhost:3306/test_shared';

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
