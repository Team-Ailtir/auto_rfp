import { describe, it, expect } from 'vitest';
import {
  ExtractQuestionsRequestSchema,
  QuestionSchema,
  SectionSchema,
  ExtractedQuestionsSchema,
  ExtractQuestionsResponseSchema,
} from '@/lib/validators/extract-questions';

describe('ExtractQuestionsRequestSchema', () => {
  it('should validate a complete valid request', () => {
    const validRequest = {
      documentId: 'doc-123',
      documentName: 'test.pdf',
      content: 'RFP document content',
      projectId: 'proj-456',
    };

    const result = ExtractQuestionsRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validRequest);
    }
  });

  it('should reject empty documentId', () => {
    const invalidRequest = {
      documentId: '',
      documentName: 'test.pdf',
      content: 'content',
      projectId: 'proj-456',
    };

    const result = ExtractQuestionsRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Document ID is required');
    }
  });

  it('should reject empty documentName', () => {
    const invalidRequest = {
      documentId: 'doc-123',
      documentName: '',
      content: 'content',
      projectId: 'proj-456',
    };

    const result = ExtractQuestionsRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject empty content', () => {
    const invalidRequest = {
      documentId: 'doc-123',
      documentName: 'test.pdf',
      content: '',
      projectId: 'proj-456',
    };

    const result = ExtractQuestionsRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject empty projectId', () => {
    const invalidRequest = {
      documentId: 'doc-123',
      documentName: 'test.pdf',
      content: 'content',
      projectId: '',
    };

    const result = ExtractQuestionsRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const result = ExtractQuestionsRequestSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});

describe('QuestionSchema', () => {
  it('should validate a valid question', () => {
    const question = { id: 'q-1', question: 'What is your approach?' };
    const result = QuestionSchema.safeParse(question);
    expect(result.success).toBe(true);
  });

  it('should reject question without id', () => {
    const question = { question: 'What is your approach?' };
    const result = QuestionSchema.safeParse(question);
    expect(result.success).toBe(false);
  });

  it('should reject question without question text', () => {
    const question = { id: 'q-1' };
    const result = QuestionSchema.safeParse(question);
    expect(result.success).toBe(false);
  });
});

describe('SectionSchema', () => {
  it('should validate a section with questions', () => {
    const section = {
      id: 'sec-1',
      title: 'Technical Requirements',
      questions: [{ id: 'q-1', question: 'Describe your architecture' }],
    };
    const result = SectionSchema.safeParse(section);
    expect(result.success).toBe(true);
  });

  it('should allow optional description', () => {
    const section = {
      id: 'sec-1',
      title: 'Requirements',
      description: 'Optional description',
      questions: [],
    };
    const result = SectionSchema.safeParse(section);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('Optional description');
    }
  });

  it('should validate section without description', () => {
    const section = {
      id: 'sec-1',
      title: 'Requirements',
      questions: [],
    };
    const result = SectionSchema.safeParse(section);
    expect(result.success).toBe(true);
  });

  it('should reject section without title', () => {
    const section = {
      id: 'sec-1',
      questions: [],
    };
    const result = SectionSchema.safeParse(section);
    expect(result.success).toBe(false);
  });
});

describe('ExtractedQuestionsSchema', () => {
  it('should validate extracted questions with sections', () => {
    const extracted = {
      sections: [
        {
          id: 'sec-1',
          title: 'Section 1',
          questions: [{ id: 'q-1', question: 'Question 1' }],
        },
      ],
    };
    const result = ExtractedQuestionsSchema.safeParse(extracted);
    expect(result.success).toBe(true);
  });

  it('should validate with empty sections array', () => {
    const extracted = { sections: [] };
    const result = ExtractedQuestionsSchema.safeParse(extracted);
    expect(result.success).toBe(true);
  });
});

describe('ExtractQuestionsResponseSchema', () => {
  it('should validate complete response', () => {
    const response = {
      documentId: 'doc-123',
      documentName: 'test.pdf',
      sections: [],
      extractedAt: new Date().toISOString(),
    };
    const result = ExtractQuestionsResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should allow optional summary and eligibility', () => {
    const response = {
      documentId: 'doc-123',
      documentName: 'test.pdf',
      sections: [],
      extractedAt: new Date().toISOString(),
      summary: 'Document summary',
      eligibility: ['Requirement 1', 'Requirement 2'],
    };
    const result = ExtractQuestionsResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.summary).toBe('Document summary');
      expect(result.data.eligibility).toHaveLength(2);
    }
  });
});
