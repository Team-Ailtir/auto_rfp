import { beforeEach, vi } from 'vitest';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LLAMA_SDK_PROVIDER = 'llamacloud';
process.env.LLAMACLOUD_API_KEY = 'test-key-123';

// Create mock Prisma client
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

// Mock the db module
vi.mock('@/lib/db', () => ({
  db: prismaMock,
}));

// Reset mocks between tests
beforeEach(() => {
  mockReset(prismaMock);
});
