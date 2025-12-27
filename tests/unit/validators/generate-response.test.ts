import { describe, it, expect } from 'vitest';
import {
  generateResponseSchema,
  generateResponseMetadataSchema,
  generateResponseSchema_Response,
} from '@/lib/validators/generate-response';

describe('generateResponseSchema', () => {
  it('should validate a minimal valid request', () => {
    const request = {
      question: 'What is your approach?',
      projectId: 'proj-123',
    };
    const result = generateResponseSchema.safeParse(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.question).toBe('What is your approach?');
      expect(result.data.projectId).toBe('proj-123');
      expect(result.data.documentIds).toEqual([]);
      expect(result.data.selectedIndexIds).toEqual([]);
      expect(result.data.useAllIndexes).toBe(false);
    }
  });

  it('should validate a complete request with all fields', () => {
    const request = {
      question: 'Describe your security measures',
      projectId: 'proj-123',
      documentIds: ['doc-1', 'doc-2'],
      selectedIndexIds: ['idx-1'],
      useAllIndexes: true,
    };
    const result = generateResponseSchema.safeParse(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documentIds).toEqual(['doc-1', 'doc-2']);
      expect(result.data.useAllIndexes).toBe(true);
    }
  });

  it('should reject empty question', () => {
    const request = {
      question: '',
      projectId: 'proj-123',
    };
    const result = generateResponseSchema.safeParse(request);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Question is required');
    }
  });

  it('should reject question exceeding max length', () => {
    const request = {
      question: 'a'.repeat(1001),
      projectId: 'proj-123',
    };
    const result = generateResponseSchema.safeParse(request);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Question too long');
    }
  });

  it('should reject empty projectId', () => {
    const request = {
      question: 'Valid question',
      projectId: '',
    };
    const result = generateResponseSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it('should accept question at max length', () => {
    const request = {
      question: 'a'.repeat(1000),
      projectId: 'proj-123',
    };
    const result = generateResponseSchema.safeParse(request);
    expect(result.success).toBe(true);
  });
});

describe('generateResponseMetadataSchema', () => {
  it('should validate valid metadata', () => {
    const metadata = {
      confidence: 0.85,
      generatedAt: new Date().toISOString(),
      indexesUsed: ['idx-1', 'idx-2'],
    };
    const result = generateResponseMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(true);
  });

  it('should reject confidence below 0', () => {
    const metadata = {
      confidence: -0.1,
      generatedAt: new Date().toISOString(),
      indexesUsed: [],
    };
    const result = generateResponseMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(false);
  });

  it('should reject confidence above 1', () => {
    const metadata = {
      confidence: 1.1,
      generatedAt: new Date().toISOString(),
      indexesUsed: [],
    };
    const result = generateResponseMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(false);
  });

  it('should accept confidence at boundaries (0 and 1)', () => {
    expect(generateResponseMetadataSchema.safeParse({
      confidence: 0,
      generatedAt: new Date().toISOString(),
      indexesUsed: [],
    }).success).toBe(true);

    expect(generateResponseMetadataSchema.safeParse({
      confidence: 1,
      generatedAt: new Date().toISOString(),
      indexesUsed: [],
    }).success).toBe(true);
  });

  it('should allow optional note', () => {
    const metadata = {
      confidence: 0.5,
      generatedAt: new Date().toISOString(),
      indexesUsed: [],
      note: 'Additional context',
    };
    const result = generateResponseMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBe('Additional context');
    }
  });
});

describe('generateResponseSchema_Response', () => {
  it('should validate complete response', () => {
    const response = {
      success: true,
      response: 'Generated response text',
      sources: [{
        id: 1,
        fileName: 'document.pdf',
      }],
      metadata: {
        confidence: 0.9,
        generatedAt: new Date().toISOString(),
        indexesUsed: ['idx-1'],
      },
    };
    const result = generateResponseSchema_Response.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should validate source with all optional fields', () => {
    const response = {
      success: true,
      response: 'Response text',
      sources: [{
        id: 1,
        fileName: 'document.pdf',
        filePath: '/path/to/file',
        pageNumber: '5',
        documentId: 'doc-123',
        relevance: 0.95,
        textContent: 'Relevant excerpt',
      }],
      metadata: {
        confidence: 0.8,
        generatedAt: new Date().toISOString(),
        indexesUsed: [],
      },
    };
    const result = generateResponseSchema_Response.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sources[0].filePath).toBe('/path/to/file');
      expect(result.data.sources[0].relevance).toBe(0.95);
    }
  });

  it('should validate response with empty sources array', () => {
    const response = {
      success: false,
      response: 'No sources found',
      sources: [],
      metadata: {
        confidence: 0,
        generatedAt: new Date().toISOString(),
        indexesUsed: [],
      },
    };
    const result = generateResponseSchema_Response.safeParse(response);
    expect(result.success).toBe(true);
  });
});
