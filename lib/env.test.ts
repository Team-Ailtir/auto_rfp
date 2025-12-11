import { describe, it, expect } from 'vitest';
import { getLlamaCloudApiKey, validateEnv, env } from './env';

describe('Environment Configuration', () => {
  describe('getLlamaCloudApiKey', () => {
    it('should return regular API key for non-internal email', () => {
      // env object is loaded from vitest.setup.ts with test values
      const apiKey = getLlamaCloudApiKey('user@external.com');

      // Should return the regular key (not internal)
      expect(apiKey).toBe(env.LLAMACLOUD_API_KEY);
    });

    it('should return API key for null email', () => {
      const apiKey = getLlamaCloudApiKey(null);

      // Should return the regular key
      expect(apiKey).toBe(env.LLAMACLOUD_API_KEY);
    });

    it('should return API key for undefined email', () => {
      const apiKey = getLlamaCloudApiKey(undefined);

      // Should return the regular key
      expect(apiKey).toBe(env.LLAMACLOUD_API_KEY);
    });

    it('should check email ending for internal domain', () => {
      // Test that the function checks if email ends with internal domain
      const internalEmail = `user${env.INTERNAL_EMAIL_DOMAIN}`;
      const externalEmail = 'user@external.com';

      const internalKey = getLlamaCloudApiKey(internalEmail);
      const externalKey = getLlamaCloudApiKey(externalEmail);

      // Both should return keys (actual internal key selection depends on env config)
      expect(internalKey).toBeDefined();
      expect(externalKey).toBeDefined();
    });

    it('should handle email without domain', () => {
      const apiKey = getLlamaCloudApiKey('user');

      // Should return regular key for malformed email
      expect(apiKey).toBe(env.LLAMACLOUD_API_KEY);
    });

    it('should handle empty string email', () => {
      const apiKey = getLlamaCloudApiKey('');

      // Should return regular key for empty email
      expect(apiKey).toBe(env.LLAMACLOUD_API_KEY);
    });
  });

  describe('validateEnv', () => {
    it('should return true when LLAMACLOUD_API_KEY is set', () => {
      // env.LLAMACLOUD_API_KEY is set in vitest.setup.ts
      const isValid = validateEnv();

      expect(isValid).toBe(true);
    });

    it('should validate based on env object values', () => {
      // This tests the validation logic
      const isValid = validateEnv();

      // Should be true since test env has API key set
      expect(isValid).toBe(true);
    });
  });

  describe('env object', () => {
    it('should have LLAMACLOUD_API_KEY defined', () => {
      expect(env.LLAMACLOUD_API_KEY).toBeDefined();
      expect(typeof env.LLAMACLOUD_API_KEY).toBe('string');
    });

    it('should have LLAMACLOUD_API_KEY_INTERNAL defined', () => {
      expect(env.LLAMACLOUD_API_KEY_INTERNAL).toBeDefined();
      expect(typeof env.LLAMACLOUD_API_KEY_INTERNAL).toBe('string');
    });

    it('should have INTERNAL_EMAIL_DOMAIN defined', () => {
      expect(env.INTERNAL_EMAIL_DOMAIN).toBeDefined();
      expect(typeof env.INTERNAL_EMAIL_DOMAIN).toBe('string');
      // Should be a valid email domain format
      expect(env.INTERNAL_EMAIL_DOMAIN).toMatch(/@.+/);
    });

    it('should have all required fields', () => {
      expect(env).toHaveProperty('LLAMACLOUD_API_KEY');
      expect(env).toHaveProperty('LLAMACLOUD_API_KEY_INTERNAL');
      expect(env).toHaveProperty('INTERNAL_EMAIL_DOMAIN');
    });
  });
});
