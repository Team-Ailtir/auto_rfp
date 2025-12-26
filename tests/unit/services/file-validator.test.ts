import { describe, it, expect, beforeEach } from 'vitest';
import { FileValidator } from '@/lib/services/file-validator';
import { ValidationError } from '@/lib/errors/api-errors';

describe('FileValidator', () => {
  let validator: FileValidator;

  beforeEach(() => {
    validator = new FileValidator();
  });

  describe('constructor', () => {
    it('should use default config', () => {
      const v = new FileValidator();
      expect(v).toBeDefined();
    });

    it('should accept custom config', () => {
      const v = new FileValidator({
        maxFileSize: 10 * 1024 * 1024, // 10MB
      });
      expect(v).toBeDefined();
    });
  });

  describe('isSupportedFileType', () => {
    it('should return true for PDF files', () => {
      expect(validator.isSupportedFileType('document.pdf')).toBe(true);
    });

    it('should return true for Excel files', () => {
      expect(validator.isSupportedFileType('data.xlsx')).toBe(true);
      expect(validator.isSupportedFileType('data.xls')).toBe(true);
    });

    it('should return true for Word documents', () => {
      expect(validator.isSupportedFileType('document.doc')).toBe(true);
      expect(validator.isSupportedFileType('document.docx')).toBe(true);
    });

    it('should return true for CSV files', () => {
      expect(validator.isSupportedFileType('data.csv')).toBe(true);
    });

    it('should return false for unsupported files', () => {
      expect(validator.isSupportedFileType('image.png')).toBe(false);
      expect(validator.isSupportedFileType('script.js')).toBe(false);
      expect(validator.isSupportedFileType('styles.css')).toBe(false);
      expect(validator.isSupportedFileType('archive.zip')).toBe(false);
    });

    it('should handle files without extensions', () => {
      expect(validator.isSupportedFileType('noextension')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(validator.isSupportedFileType('document.PDF')).toBe(true);
      expect(validator.isSupportedFileType('data.XLSX')).toBe(true);
      expect(validator.isSupportedFileType('file.Docx')).toBe(true);
    });

    it('should handle multiple dots in filename', () => {
      expect(validator.isSupportedFileType('my.document.file.pdf')).toBe(true);
      expect(validator.isSupportedFileType('file.backup.xlsx')).toBe(true);
    });
  });

  describe('getFileExtension', () => {
    it('should extract extension correctly', () => {
      expect(validator.getFileExtension('file.pdf')).toBe('pdf');
      expect(validator.getFileExtension('document.docx')).toBe('docx');
    });

    it('should handle multiple dots', () => {
      expect(validator.getFileExtension('my.file.pdf')).toBe('pdf');
      expect(validator.getFileExtension('backup.2024.xlsx')).toBe('xlsx');
    });

    it('should return lowercase extension', () => {
      expect(validator.getFileExtension('file.PDF')).toBe('pdf');
      expect(validator.getFileExtension('file.DOCX')).toBe('docx');
    });

    it('should return null for files without extension', () => {
      expect(validator.getFileExtension('noext')).toBe(null);
    });

    it('should handle hidden files', () => {
      expect(validator.getFileExtension('.gitignore')).toBe('gitignore');
    });
  });

  describe('getHumanFileSize', () => {
    it('should format bytes correctly', () => {
      expect(validator.getHumanFileSize(500)).toBe('500.0 B');
      expect(validator.getHumanFileSize(0)).toBe('0.0 B');
    });

    it('should format kilobytes correctly', () => {
      expect(validator.getHumanFileSize(1024)).toBe('1.0 KB');
      expect(validator.getHumanFileSize(1536)).toBe('1.5 KB');
      expect(validator.getHumanFileSize(2048)).toBe('2.0 KB');
    });

    it('should format megabytes correctly', () => {
      expect(validator.getHumanFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(validator.getHumanFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
      expect(validator.getHumanFileSize(10.5 * 1024 * 1024)).toBe('10.5 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(validator.getHumanFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
      expect(validator.getHumanFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
    });

    it('should handle edge cases', () => {
      expect(validator.getHumanFileSize(1023)).toBe('1023.0 B');
      expect(validator.getHumanFileSize(1025)).toBe('1.0 KB');
    });
  });

  describe('validateFile', () => {
    it('should validate a valid PDF file', async () => {
      const file = new File(['test content'], 'document.pdf', { type: 'application/pdf' });
      const result = await validator.validateFile(file);
      expect(result.name).toBe('document.pdf');
      expect(result.type).toBe('application/pdf');
    });

    it('should validate a valid Excel file', async () => {
      const file = new File(['test'], 'data.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const result = await validator.validateFile(file);
      expect(result.name).toBe('data.xlsx');
    });

    it('should validate a valid Word document', async () => {
      const file = new File(['test'], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const result = await validator.validateFile(file);
      expect(result.name).toBe('document.docx');
    });

    it('should reject unsupported file types', async () => {
      const file = new File(['test'], 'image.png', { type: 'image/png' });
      await expect(validator.validateFile(file)).rejects.toThrow(ValidationError);
      await expect(validator.validateFile(file)).rejects.toThrow(/Unsupported file format/);
    });

    it('should reject files exceeding max size', async () => {
      // Create a validator with 1KB limit for testing
      const smallValidator = new FileValidator({ maxFileSize: 1024 });
      // Create a file larger than 1KB
      const largeContent = 'x'.repeat(2048);
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });

      await expect(smallValidator.validateFile(file)).rejects.toThrow(ValidationError);
      await expect(smallValidator.validateFile(file)).rejects.toThrow(/exceeds maximum allowed size/);
    });

    it('should accept files at exact max size', async () => {
      const smallValidator = new FileValidator({ maxFileSize: 1024 });
      const content = 'x'.repeat(1024);
      const file = new File([content], 'exact.pdf', { type: 'application/pdf' });

      const result = await smallValidator.validateFile(file);
      expect(result.name).toBe('exact.pdf');
    });

    it('should validate CSV files', async () => {
      const file = new File(['col1,col2\n1,2'], 'data.csv', { type: 'text/csv' });
      const result = await validator.validateFile(file);
      expect(result.name).toBe('data.csv');
    });

    it('should warn but accept files with unrecognized MIME type but valid extension', async () => {
      // A PDF with generic octet-stream type
      const file = new File(['test'], 'document.pdf', { type: 'application/octet-stream' });
      const result = await validator.validateFile(file);
      expect(result.name).toBe('document.pdf');
    });
  });
});
