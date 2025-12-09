// Environment variables configuration
export const env = {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',

  // App Configuration
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',

  // LlamaCloud
  LLAMACLOUD_API_KEY: process.env.LLAMACLOUD_API_KEY || '',
  LLAMACLOUD_API_KEY_INTERNAL: process.env.LLAMACLOUD_API_KEY_INTERNAL || '',
  LLAMACLOUD_BASE_URL: process.env.LLAMACLOUD_BASE_URL || 'https://api.cloud.llamaindex.ai/api/v1',
  INTERNAL_EMAIL_DOMAIN: process.env.INTERNAL_EMAIL_DOMAIN || '@runllama.ai',

  // System
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Function to validate required environment variables
export function validateEnv() {
  const requiredVars = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', value: env.NEXT_PUBLIC_SUPABASE_URL },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    { key: 'OPENAI_API_KEY', value: env.OPENAI_API_KEY },
    { key: 'LLAMACLOUD_API_KEY', value: env.LLAMACLOUD_API_KEY },
  ];

  const missingVars = requiredVars.filter(v => !v.value);

  if (missingVars.length > 0) {
    console.error(`
      Missing required environment variables:
      ${missingVars.map(v => `- ${v.key}`).join('\n      ')}

      Please set these in your .env.local file
    `);
    return false;
  }

  return true;
}

// Helper function to get the appropriate LlamaCloud API key based on user email
export function getLlamaCloudApiKey(userEmail?: string | null): string {
  // If user has internal email domain and internal key is configured, use internal key
  if (userEmail?.endsWith(env.INTERNAL_EMAIL_DOMAIN) && env.LLAMACLOUD_API_KEY_INTERNAL) {
    return env.LLAMACLOUD_API_KEY_INTERNAL;
  }
  
  // Otherwise, use the regular API key
  return env.LLAMACLOUD_API_KEY;
} 