import { vi } from 'vitest';
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

export type MockPrismaClient = DeepMockProxy<PrismaClient>;

export const createPrismaMock = (): MockPrismaClient => mockDeep<PrismaClient>();

let prismaMock: MockPrismaClient | null = null;

export const getPrismaMock = () => {
  if (!prismaMock) {
    prismaMock = createPrismaMock();
  }
  return prismaMock;
};

export const resetPrismaMock = () => {
  prismaMock = createPrismaMock();
  return prismaMock;
};

// Mock the db module
vi.mock('@/lib/db', () => ({
  db: getPrismaMock(),
}));
