export function createMockEmailService() {
  return {
    sendMail: jest.fn().mockResolvedValue(true),
  };
}
