import { ProviderCredentials, ProviderType } from './interfaces/document-index-provider';

// Environment variables configuration
export const env = {
  // Provider selection
  LLAMA_SDK_PROVIDER: process.env.LLAMA_SDK_PROVIDER || 'llamacloud',

  // LlamaCloud credentials
  LLAMACLOUD_API_KEY: process.env.LLAMACLOUD_API_KEY || '',
  LLAMACLOUD_API_KEY_INTERNAL: process.env.LLAMACLOUD_API_KEY_INTERNAL || '',
  INTERNAL_EMAIL_DOMAIN: process.env.INTERNAL_EMAIL_DOMAIN || '@runllama.ai',

  // AWS Bedrock credentials
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
};

// Function to validate required environment variables
export function validateEnv() {
  const requiredVars = [
    { key: 'LLAMACLOUD_API_KEY', value: env.LLAMACLOUD_API_KEY }
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

/**
 * Get the configured provider type
 *
 * @returns Provider type from LLAMA_SDK_PROVIDER env var
 * @throws {Error} If provider type is invalid
 */
export function getLlamaSdkProvider(): ProviderType {
  const provider = env.LLAMA_SDK_PROVIDER;

  if (provider !== 'llamacloud' && provider !== 'bedrock') {
    throw new Error(
      `Invalid LLAMA_SDK_PROVIDER: "${provider}". Must be "llamacloud" or "bedrock".`
    );
  }

  return provider as ProviderType;
}

/**
 * Get provider-specific credentials based on user email and provider type
 *
 * @param userEmail - User's email address (for internal key selection)
 * @returns Provider credentials object
 */
export function getProviderCredentials(userEmail?: string | null): ProviderCredentials {
  const providerType = getLlamaSdkProvider();

  const credentials: ProviderCredentials = {
    type: providerType,
  };

  if (providerType === 'llamacloud') {
    credentials.llamaCloudApiKey = getLlamaCloudApiKey(userEmail);
  } else if (providerType === 'bedrock') {
    credentials.awsAccessKeyId = env.AWS_ACCESS_KEY_ID;
    credentials.awsSecretAccessKey = env.AWS_SECRET_ACCESS_KEY;
    credentials.awsRegion = env.AWS_REGION;
  }

  return credentials;
} 