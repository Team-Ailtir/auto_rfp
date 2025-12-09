import { validateEnv } from '@/lib/env';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate and log environment variables on server startup
    validateEnv();
  }
}
