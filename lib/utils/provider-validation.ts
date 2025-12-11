/**
 * Provider Validation Utilities
 *
 * Validates provider configuration and credentials
 */

import { env, getLlamaSdkProvider, getProviderCredentials } from '@/lib/env';
import { ProviderType } from '@/lib/interfaces/document-index-provider';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate LLAMA_SDK_PROVIDER environment variable
 */
export function validateProviderType(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  const providerType = env.LLAMA_SDK_PROVIDER;

  if (!providerType) {
    result.valid = false;
    result.errors.push('LLAMA_SDK_PROVIDER environment variable is not set');
    return result;
  }

  const validProviders: ProviderType[] = ['llamacloud', 'bedrock'];
  if (!validProviders.includes(providerType as ProviderType)) {
    result.valid = false;
    result.errors.push(
      `Invalid LLAMA_SDK_PROVIDER: "${providerType}". Must be one of: ${validProviders.join(', ')}`
    );
  }

  return result;
}

/**
 * Validate LlamaCloud credentials
 */
export function validateLlamaCloudCredentials(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (!env.LLAMACLOUD_API_KEY) {
    result.valid = false;
    result.errors.push('LLAMACLOUD_API_KEY environment variable is not set');
  } else if (env.LLAMACLOUD_API_KEY.length < 10) {
    result.valid = false;
    result.errors.push('LLAMACLOUD_API_KEY appears to be invalid (too short)');
  }

  // Check for internal API key configuration
  if (env.LLAMACLOUD_API_KEY_INTERNAL) {
    if (!env.INTERNAL_EMAIL_DOMAIN) {
      result.warnings.push(
        'LLAMACLOUD_API_KEY_INTERNAL is set but INTERNAL_EMAIL_DOMAIN is not configured'
      );
    }
  }

  return result;
}

/**
 * Validate AWS Bedrock credentials
 */
export function validateBedrockCredentials(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (!env.AWS_ACCESS_KEY_ID) {
    result.valid = false;
    result.errors.push('AWS_ACCESS_KEY_ID environment variable is not set');
  }

  if (!env.AWS_SECRET_ACCESS_KEY) {
    result.valid = false;
    result.errors.push('AWS_SECRET_ACCESS_KEY environment variable is not set');
  }

  if (!env.AWS_REGION) {
    result.valid = false;
    result.errors.push('AWS_REGION environment variable is not set');
  }

  // Validate region format
  if (env.AWS_REGION && !env.AWS_REGION.match(/^[a-z]{2}-[a-z]+-\d$/)) {
    result.warnings.push(
      `AWS_REGION "${env.AWS_REGION}" may not be valid. Expected format: us-east-1, eu-west-1, etc.`
    );
  }

  return result;
}

/**
 * Validate credentials for the currently selected provider
 */
export function validateCurrentProviderCredentials(): ValidationResult {
  const providerValidation = validateProviderType();
  if (!providerValidation.valid) {
    return providerValidation;
  }

  const providerType = getLlamaSdkProvider();

  if (providerType === 'llamacloud') {
    return validateLlamaCloudCredentials();
  } else if (providerType === 'bedrock') {
    return validateBedrockCredentials();
  }

  return {
    valid: false,
    errors: [`Unknown provider type: ${providerType}`],
    warnings: [],
  };
}

/**
 * Validate complete provider configuration
 */
export function validateProviderConfiguration(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Validate provider type
  const providerValidation = validateProviderType();
  result.errors.push(...providerValidation.errors);
  result.warnings.push(...providerValidation.warnings);
  result.valid = result.valid && providerValidation.valid;

  if (!providerValidation.valid) {
    return result;
  }

  // Validate credentials for selected provider
  const credentialsValidation = validateCurrentProviderCredentials();
  result.errors.push(...credentialsValidation.errors);
  result.warnings.push(...credentialsValidation.warnings);
  result.valid = result.valid && credentialsValidation.valid;

  return result;
}

/**
 * Get a human-readable error message for validation failures
 */
export function getValidationErrorMessage(validation: ValidationResult): string {
  if (validation.valid) {
    return '';
  }

  const messages: string[] = [];

  if (validation.errors.length > 0) {
    messages.push('Configuration errors:');
    validation.errors.forEach((error) => {
      messages.push(`  - ${error}`);
    });
  }

  if (validation.warnings.length > 0) {
    messages.push('Configuration warnings:');
    validation.warnings.forEach((warning) => {
      messages.push(`  - ${warning}`);
    });
  }

  return messages.join('\n');
}

/**
 * Throw an error if provider configuration is invalid
 */
export function assertValidProviderConfiguration(): void {
  const validation = validateProviderConfiguration();
  if (!validation.valid) {
    throw new Error(getValidationErrorMessage(validation));
  }
}
