import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultResponseService } from '@/lib/services/default-response-service';

describe('DefaultResponseService', () => {
  let service: DefaultResponseService;

  beforeEach(() => {
    service = new DefaultResponseService();
  });

  describe('generateResponse', () => {
    it('should return security-related response for security keywords', () => {
      const keywords = ['security', 'secure', 'compliance', 'gdpr', 'hipaa', 'encrypt'];

      keywords.forEach(keyword => {
        const result = service.generateResponse(`What is your ${keyword} approach?`);
        expect(result.response).toContain('security');
        expect(result.confidence).toBe(0.7);
        expect(result.sources).toEqual([]);
        expect(result.generatedAt).toBeDefined();
      });
    });

    it('should return implementation-related response for deployment keywords', () => {
      const keywords = ['implementation', 'deploy', 'timeline', 'rollout', 'setup'];

      keywords.forEach(keyword => {
        const result = service.generateResponse(`Describe your ${keyword} process`);
        expect(result.response).toContain('implementation');
      });
    });

    it('should return pricing-related response for cost keywords', () => {
      const keywords = ['price', 'pricing', 'cost', 'budget', 'fee', 'subscription'];

      keywords.forEach(keyword => {
        const result = service.generateResponse(`What is the ${keyword}?`);
        expect(result.response).toContain('pricing');
      });
    });

    it('should return support-related response for help keywords', () => {
      const keywords = ['support', 'maintenance', 'help', 'training', 'documentation'];

      keywords.forEach(keyword => {
        const result = service.generateResponse(`Tell me about ${keyword}`);
        expect(result.response).toContain('support');
      });
    });

    it('should return integration-related response for API keywords', () => {
      const keywords = ['integration', 'api', 'connect', 'interoperability', 'sync'];

      keywords.forEach(keyword => {
        const result = service.generateResponse(`How does ${keyword} work?`);
        expect(result.response).toContain('integration');
      });
    });

    it('should return scalability-related response for performance keywords', () => {
      const keywords = ['scalability', 'performance', 'capacity', 'load', 'enterprise'];

      keywords.forEach(keyword => {
        const result = service.generateResponse(`Explain ${keyword}`);
        expect(result.response).toContain('scale');
      });
    });

    it('should return default response for unmatched questions', () => {
      const result = service.generateResponse('What is the meaning of life?');
      expect(result.response).toContain('comprehensive capabilities');
      expect(result.confidence).toBe(0.7);
    });

    it('should be case-insensitive in keyword matching', () => {
      const result1 = service.generateResponse('SECURITY measures');
      const result2 = service.generateResponse('security measures');
      expect(result1.response).toBe(result2.response);
    });

    it('should match keywords anywhere in the question', () => {
      const result = service.generateResponse('We need to know about your security protocols and compliance');
      expect(result.response).toContain('security');
    });

    it('should return response with correct structure', () => {
      const result = service.generateResponse('Any question');
      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('sources');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('generatedAt');
      expect(typeof result.response).toBe('string');
      expect(Array.isArray(result.sources)).toBe(true);
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.generatedAt).toBe('string');
    });

    it('should return ISO date string for generatedAt', () => {
      const result = service.generateResponse('Test question');
      const date = new Date(result.generatedAt);
      expect(date.toISOString()).toBe(result.generatedAt);
    });
  });

  describe('addResponseTemplate', () => {
    it('should add new response template', () => {
      const templatesBefore = service.getResponseTemplates();
      const countBefore = templatesBefore.length;

      service.addResponseTemplate(
        ['custom', 'keyword'],
        'Custom response text'
      );

      const templatesAfter = service.getResponseTemplates();
      expect(templatesAfter.length).toBe(countBefore + 1);
    });

    it('should use newly added template for matching', () => {
      service.addResponseTemplate(
        ['unicorn', 'magical'],
        'This is a magical unicorn response'
      );

      const result = service.generateResponse('Tell me about unicorns');
      expect(result.response).toBe('This is a magical unicorn response');
    });
  });

  describe('getResponseTemplates', () => {
    it('should return all templates', () => {
      const templates = service.getResponseTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should return templates with correct structure', () => {
      const templates = service.getResponseTemplates();
      templates.forEach(template => {
        expect(template).toHaveProperty('keywords');
        expect(template).toHaveProperty('response');
        expect(Array.isArray(template.keywords)).toBe(true);
        expect(typeof template.response).toBe('string');
      });
    });

    it('should return a copy of templates array', () => {
      const templates1 = service.getResponseTemplates();
      const templates2 = service.getResponseTemplates();
      expect(templates1).not.toBe(templates2);
    });

    it('should include default templates', () => {
      const templates = service.getResponseTemplates();
      const hasSecurityTemplate = templates.some(t =>
        t.keywords.includes('security')
      );
      expect(hasSecurityTemplate).toBe(true);
    });
  });
});
