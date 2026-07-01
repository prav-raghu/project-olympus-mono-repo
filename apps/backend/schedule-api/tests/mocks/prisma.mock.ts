import { type PrismaClient } from '@project-olympus/database';

interface MockPrismaModel {
  findMany: jest.Mock;
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
  upsert: jest.Mock;
}

type MockPrismaClient = {
  [K in keyof PrismaClient]: K extends 'webhookSubscription' | 'webhookDelivery'
    ? MockPrismaModel
    : jest.Mock;
} & {
  $transaction: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
};

export function createMockPrisma(): MockPrismaClient {
  const createModel = (): MockPrismaModel => ({
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  });

  return {
    webhookSubscription: createModel(),
    webhookDelivery: createModel(),
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => {
      const txClient = {
        webhookSubscription: createModel(),
        webhookDelivery: createModel(),
      };
      return fn(txClient);
    }),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  } as unknown as MockPrismaClient;
}
