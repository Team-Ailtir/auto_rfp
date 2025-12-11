import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateProviderType,
  validateLlamaCloudCredentials,
  validateBedrockCredentials,
  validateCurrentProviderCredentials,
  validateProviderConfiguration,
  getValidationErrorMessage,
  assertValidProviderConfiguration,
} from '../provider-validation';
import { env } from '@/lib/env';

describe('Provider Validation', () => {
  describe('validateProviderType', () => {
    it('should pass with valid llamacloud provider', () => {
      const result = validateProviderType();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if LLAMA_SDK_PROVIDER is not set', () => {
      const originalValue = env.LLAMA_SDK_PROVIDER;
      (env as any).LLAMA_SDK_PROVIDER = undefined;

      const result = validateProviderType();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('LLAMA_SDK_PROVIDER environment variable is not set');

      (env as any).LLAMA_SDK_PROVIDER = originalValue;
    });

    it('should fail with invalid provider type', () => {
      const originalValue = env.LLAMA_SDK_PROVIDER;
      (env as any).LLAMA_SDK_PROVIDER = 'invalid-provider';

      const result = validateProviderType();
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid LLAMA_SDK_PROVIDER');

      (env as any).LLAMA_SDK_PROVIDER = originalValue;
    });
  });

  describe('validateLlamaCloudCredentials', () => {
    it('should pass with valid LlamaCloud credentials', () => {
      const result = validateLlamaCloudCredentials();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if LLAMACLOUD_API_KEY is not set', () => {
      const originalValue = env.LLAMACLOUD_API_KEY;
      (env as any).LLAMACLOUD_API_KEY = undefined;

      const result = validateLlamaCloudCredentials();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('LLAMACLOUD_API_KEY environment variable is not set');

      (env as any).LLAMACLOUD_API_KEY = originalValue;
    });

    it('should fail if LLAMACLOUD_API_KEY is too short', () => {
      const originalValue = env.LLAMACLOUD_API_KEY;
      (env as any).LLAMACLOUD_API_KEY = 'short';

      const result = validateLlamaCloudCredentials();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('LLAMACLOUD_API_KEY appears to be invalid (too short)');

      (env as any).LLAMACLOUD_API_KEY = originalValue;
    });

    it('should warn if internal key is set without domain', () => {
      const originalInternal = env.LLAMACLOUD_API_KEY_INTERNAL;
      const originalDomain = env.INTERNAL_EMAIL_DOMAIN;
      (env as any).LLAMACLOUD_API_KEY_INTERNAL = 'llx-internal-key';
      (env as any).INTERNAL_EMAIL_DOMAIN = undefined;

      const result = validateLlamaCloudCredentials();
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('INTERNAL_EMAIL_DOMAIN is not configured');

      (env as any).LLAMACLOUD_API_KEY_INTERNAL = originalInternal;
      (env as any).INTERNAL_EMAIL_DOMAIN = originalDomain;
    });
  });

  describe('validateBedrockCredentials', () => {
    it('should fail if AWS_ACCESS_KEY_ID is not set', () => {
      const originalValue = env.AWS_ACCESS_KEY_ID;
      (env as any).AWS_ACCESS_KEY_ID = undefined;

      const result = validateBedrockCredentials();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('AWS_ACCESS_KEY_ID environment variable is not set');

      (env as any).AWS_ACCESS_KEY_ID = originalValue;
    });

    it('should fail if AWS_SECRET_ACCESS_KEY is not set', () => {
      const originalValue = env.AWS_SECRET_ACCESS_KEY;
      (env as any).AWS_SECRET_ACCESS_KEY = undefined;

      const result = validateBedrockCredentials();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('AWS_SECRET_ACCESS_KEY environment variable is not set');

      (env as any).AWS_SECRET_ACCESS_KEY = originalValue;
    });

    it('should fail if AWS_REGION is not set', () => {
      const originalValue = env.AWS_REGION;
      (env as any).AWS_REGION = undefined;

      const result = validateBedrockCredentials();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('AWS_REGION environment variable is not set');

      (env as any).AWS_REGION = originalValue;
    });

    it('should warn for invalid region format', () => {
      const originalValue = env.AWS_REGION;
      (env as any).AWS_REGION = 'invalid-region';

      const result = validateBedrockCredentials();
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('may not be valid');

      (env as any).AWS_REGION = originalValue;
    });

    it('should pass with valid AWS credentials', () => {
      const originalAccessKey = env.AWS_ACCESS_KEY_ID;
      const originalSecretKey = env.AWS_SECRET_ACCESS_KEY;
      const originalRegion = env.AWS_REGION;

      (env as any).AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
      (env as any).AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
      (env as any).AWS_REGION = 'us-east-1';

      const result = validateBedrockCredentials();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      (env as any).AWS_ACCESS_KEY_ID = originalAccessKey;
      (env as any).AWS_SECRET_ACCESS_KEY = originalSecretKey;
      (env as any).AWS_REGION = originalRegion;
    });
  });

  describe('validateCurrentProviderCredentials', () => {
    it('should validate LlamaCloud credentials when provider is llamacloud', () => {
      const result = validateCurrentProviderCredentials();
      // Should pass with test env (llamacloud)
      expect(result.valid).toBe(true);
    });

    it('should return provider validation errors if provider type is invalid', () => {
      const originalProvider = env.LLAMA_SDK_PROVIDER;
      (env as any).LLAMA_SDK_PROVIDER = undefined;

      const result = validateCurrentProviderCredentials();
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('LLAMA_SDK_PROVIDER'))).toBe(true);

      (env as any).LLAMA_SDK_PROVIDER = originalProvider;
    });
  });

  describe('validateProviderConfiguration', () => {
    it('should validate complete configuration', () => {
      const result = validateProviderConfiguration();
      expect(result.valid).toBe(true);
    });

    it('should collect all validation errors', () => {
      const originalProvider = env.LLAMA_SDK_PROVIDER;
      const originalApiKey = env.LLAMACLOUD_API_KEY;

      (env as any).LLAMA_SDK_PROVIDER = undefined;
      (env as any).LLAMACLOUD_API_KEY = undefined;

      const result = validateProviderConfiguration();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      (env as any).LLAMA_SDK_PROVIDER = originalProvider;
      (env as any).LLAMACLOUD_API_KEY = originalApiKey;
    });
  });

  describe('getValidationErrorMessage', () => {
    it('should return empty string for valid configuration', () => {
      const validation = { valid: true, errors: [], warnings: [] };
      const message = getValidationErrorMessage(validation);
      expect(message).toBe('');
    });

    it('should format error messages', () => {
      const validation = {
        valid: false,
        errors: ['Error 1', 'Error 2'],
        warnings: ['Warning 1'],
      };
      const message = getValidationErrorMessage(validation);
      expect(message).toContain('Configuration errors:');
      expect(message).toContain('Error 1');
      expect(message).toContain('Error 2');
      expect(message).toContain('Configuration warnings:');
      expect(message).toContain('Warning 1');
    });
  });

  describe('assertValidProviderConfiguration', () => {
    it('should not throw for valid configuration', () => {
      expect(() => assertValidProviderConfiguration()).not.toThrow();
    });

    it('should throw for invalid configuration', () => {
      const originalProvider = env.LLAMA_SDK_PROVIDER;
      (env as any).LLAMA_SDK_PROVIDER = undefined;

      expect(() => assertValidProviderConfiguration()).toThrow();

      (env as any).LLAMA_SDK_PROVIDER = originalProvider;
    });
  });
});
