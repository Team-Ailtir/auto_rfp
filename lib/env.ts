/**
 * Centralized environment variables configuration.
 * All environment variable access should go through this module.
 *
 * Env vars can be:
 *
 * - Mandatory: Must be set (use without test)
 * - Optional (with default): Can be set (use without test)
 * - Optional (without default): Can be set (use with test)
 */

export const env = new Map<string, string | undefined>([
  // Database
  ['DATABASE_URL', process.env.DATABASE_URL || 'mandatory-env-not-set'],
  ['DIRECT_URL', process.env.DIRECT_URL || 'mandatory-env-not-set'],

  // Supabase
  ['NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL || 'mandatory-env-not-set'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mandatory-env-not-set'],

  // OpenAI
  ['OPENAI_API_KEY', process.env.OPENAI_API_KEY || 'mandatory-env-not-set'],

  // LlamaCloud
  ['LLAMACLOUD_API_KEY', process.env.LLAMACLOUD_API_KEY || 'mandatory-env-not-set'],
  ['LLAMACLOUD_API_KEY_INTERNAL', process.env.LLAMACLOUD_API_KEY_INTERNAL],
  ['LLAMACLOUD_API_URL', process.env.LLAMACLOUD_API_URL || 'https://api.cloud.llamaindex.ai/api/v1'],
  ['INTERNAL_EMAIL_DOMAIN', process.env.INTERNAL_EMAIL_DOMAIN || '@runllama.ai'],

  // App configuration
  ['NEXT_PUBLIC_APP_URL', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'],
  ['NODE_ENV', process.env.NODE_ENV || 'development'],
]);

function logEnv() {
  const sensitiveVars = [
    'DATABASE_URL',
    'DIRECT_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'OPENAI_API_KEY',
    'LLAMACLOUD_API_KEY',
    'LLAMACLOUD_API_KEY_INTERNAL',
  ];

  console.log('=== Environment Variables ===');
  env.forEach((value, key) => {
    const displayValue = sensitiveVars.includes(key) && value !== undefined && value !== 'mandatory-env-not-set'
      ? `${value.substring(0, 8)}...`
      : value;
    console.log(`${key}: ${displayValue}`);
  });
  console.log('=============================');
}

/**
 * Validate required environment variables.
 *
 * Returns true if all required vars are set, false otherwise
 */
export function validateEnv(): boolean {
  logEnv();

  const missingVars: string[] = [];

  for (const [key, value] of env.entries()) {
    if (value === 'mandatory-env-not-set') {
      missingVars.push(key);
    }
  }

  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    return false;
  }

  return true;
}

/**
 * Get the appropriate LlamaCloud API key based on user email
 * Returns internal key for internal users, regular key otherwise
 */
export function getLlamaCloudApiKey(userEmail?: string | null): string {
  const internalDomain = env.get('INTERNAL_EMAIL_DOMAIN')!;
  const internalKey = env.get('LLAMACLOUD_API_KEY_INTERNAL');
  const regularKey = env.get('LLAMACLOUD_API_KEY')!

  // If user has internal email domain and internal key is configured, use internal key
  const key = userEmail?.endsWith(internalDomain) && internalKey ? internalKey : regularKey
  
  return key;
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return env.get('NODE_ENV') === 'production';
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return env.get('NODE_ENV') === 'development';
} 
