import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_FILE_EXTENSIONS,
  LlamaParseOptionsSchema,
  FileValidationSchema,
  LlamaParseResultSchema,
  LlamaParseResponseSchema,
} from '@/lib/validators/llamaparse';

describe('SUPPORTED_FILE_EXTENSIONS', () => {
  it('should include all expected extensions', () => {
    expect(SUPPORTED_FILE_EXTENSIONS).toContain('pdf');
    expect(SUPPORTED_FILE_EXTENSIONS).toContain('doc');
    expect(SUPPORTED_FILE_EXTENSIONS).toContain('docx');
    expect(SUPPORTED_FILE_EXTENSIONS).toContain('csv');
    expect(SUPPORTED_FILE_EXTENSIONS).toContain('xlsx');
    expect(SUPPORTED_FILE_EXTENSIONS).toContain('xls');
  });

  it('should have exactly 6 supported extensions', () => {
    expect(SUPPORTED_FILE_EXTENSIONS).toHaveLength(6);
  });
});

describe('LlamaParseOptionsSchema', () => {
  it('should validate with default values', () => {
    const options = {};
    const result = LlamaParseOptionsSchema.safeParse(options);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fastMode).toBe(false);
      expect(result.data.premiumMode).toBe(false);
      expect(result.data.complexTables).toBe(false);
    }
  });

  it('should validate with all options enabled', () => {
    const options = {
      fastMode: true,
      premiumMode: true,
      complexTables: true,
    };
    const result = LlamaParseOptionsSchema.safeParse(options);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fastMode).toBe(true);
      expect(result.data.premiumMode).toBe(true);
      expect(result.data.complexTables).toBe(true);
    }
  });

  it('should coerce non-boolean values', () => {
    const options = {
      fastMode: 'true',
      premiumMode: 1,
    };
    const result = LlamaParseOptionsSchema.safeParse(options);
    // Zod boolean will fail on non-boolean values without coerce
    expect(result.success).toBe(false);
  });
});

describe('FileValidationSchema', () => {
  it('should validate valid file metadata', () => {
    const file = {
      name: 'document.pdf',
      size: 1024,
      type: 'application/pdf',
    };
    const result = FileValidationSchema.safeParse(file);
    expect(result.success).toBe(true);
  });

  it('should reject empty file name', () => {
    const file = {
      name: '',
      size: 1024,
      type: 'application/pdf',
    };
    const result = FileValidationSchema.safeParse(file);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('File name is required');
    }
  });

  it('should reject zero file size', () => {
    const file = {
      name: 'document.pdf',
      size: 0,
      type: 'application/pdf',
    };
    const result = FileValidationSchema.safeParse(file);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('File size must be positive');
    }
  });

  it('should reject negative file size', () => {
    const file = {
      name: 'document.pdf',
      size: -100,
      type: 'application/pdf',
    };
    const result = FileValidationSchema.safeParse(file);
    expect(result.success).toBe(false);
  });

  it('should reject empty file type', () => {
    const file = {
      name: 'document.pdf',
      size: 1024,
      type: '',
    };
    const result = FileValidationSchema.safeParse(file);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('File type is required');
    }
  });

  it('should accept large file sizes', () => {
    const file = {
      name: 'large-document.pdf',
      size: 100 * 1024 * 1024, // 100MB
      type: 'application/pdf',
    };
    const result = FileValidationSchema.safeParse(file);
    expect(result.success).toBe(true);
  });
});

describe('LlamaParseResultSchema', () => {
  it('should validate complete result', () => {
    const result = {
      id: 'parse-123',
      documentName: 'document.pdf',
      status: 'completed',
      content: 'Parsed document content',
    };
    const parseResult = LlamaParseResultSchema.safeParse(result);
    expect(parseResult.success).toBe(true);
  });

  it('should allow optional metadata', () => {
    const result = {
      id: 'parse-123',
      documentName: 'document.pdf',
      status: 'completed',
      content: 'Content',
      metadata: {
        pageCount: 10,
        processingTime: 500,
      },
    };
    const parseResult = LlamaParseResultSchema.safeParse(result);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.metadata).toBeDefined();
      expect(parseResult.data.metadata?.pageCount).toBe(10);
    }
  });

  it('should validate without metadata', () => {
    const result = {
      id: 'parse-123',
      documentName: 'document.pdf',
      status: 'pending',
      content: '',
    };
    const parseResult = LlamaParseResultSchema.safeParse(result);
    expect(parseResult.success).toBe(true);
  });
});

describe('LlamaParseResponseSchema', () => {
  it('should validate successful response', () => {
    const response = {
      success: true,
      documentId: 'doc-123',
      documentName: 'document.pdf',
      status: 'completed',
      content: 'Parsed content',
    };
    const result = LlamaParseResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should validate failed response', () => {
    const response = {
      success: false,
      documentId: 'doc-123',
      documentName: 'document.pdf',
      status: 'failed',
      content: '',
    };
    const result = LlamaParseResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
    }
  });

  it('should allow metadata in response', () => {
    const response = {
      success: true,
      documentId: 'doc-123',
      documentName: 'document.pdf',
      status: 'completed',
      content: 'Content',
      metadata: {
        format: 'pdf',
        pages: 5,
      },
    };
    const result = LlamaParseResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});
