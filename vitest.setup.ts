import { afterEach, afterAll, vi } from 'vitest';

// Mock environment variables
vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
vi.stubEnv('LLAMACLOUD_API_KEY', 'test-llamacloud-key');
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');

// Global fetch mock
global.fetch = vi.fn();

afterEach(() => {
  // Reset all mocks between tests
  vi.clearAllMocks();
});

afterAll(() => {
  // Global teardown
  vi.unstubAllEnvs();
});
