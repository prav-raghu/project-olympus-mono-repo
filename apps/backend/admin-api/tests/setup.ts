process.env.DATABASE_URL_ADMIN = 'mysql://test:test@localhost:3306/test_admin';
process.env.DATABASE_URL_CUSTOMER = 'mysql://test:test@localhost:3306/test_customer';
process.env.DATABASE_URL_SCHEDULE = 'mysql://test:test@localhost:3306/test_schedule';
process.env.DATABASE_URL_SHARED = 'mysql://test:test@localhost:3306/test_shared';

jest.mock('otplib', () => ({
  generateSecret: jest.fn(() => 'MOCKSECRET'),
  generateURI: jest.fn(() => 'otpauth://totp/mock'),
  verify: jest.fn(() => true),
}));

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
