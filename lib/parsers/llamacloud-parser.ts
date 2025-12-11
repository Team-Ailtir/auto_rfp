import {
  IDocumentParser,
  ParseOptions,
  ParseResult,
} from '@/lib/interfaces/document-parser';
import { LlamaParseService } from '@/lib/llamaparse-service';
import { ConfigurationError, ExternalServiceError } from '@/lib/errors/api-errors';
import { env } from '@/lib/env';

/**
 * LlamaCloud document parser implementation
 *
 * Uses LlamaParse service for document parsing
 */
export class LlamaCloudParser implements IDocumentParser {
  private llamaParseService: LlamaParseService | null = null;
  private initializationError: Error | null = null;

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize the LlamaParse service
   */
  private initializeService(): void {
    try {
      // Check if API key is available
      if (!env.LLAMACLOUD_API_KEY) {
        throw new Error('LLAMACLOUD_API_KEY is not configured');
      }

      this.llamaParseService = new LlamaParseService();
      console.log('LlamaCloud parser initialized successfully');
    } catch (error) {
      this.initializationError = error instanceof Error
        ? error
        : new Error('Unknown initialization error');
      console.error('Failed to initialize LlamaCloud parser:', this.initializationError.message);
    }
  }

  /**
   * Check if LlamaParse service is properly configured
   */
  isConfigured(): boolean {
    return this.llamaParseService !== null && this.initializationError === null;
  }

  /**
   * Parse a file using LlamaParse service
   */
  async parseFile(file: File, options: ParseOptions): Promise<ParseResult> {
    // Check service availability
    if (!this.isConfigured()) {
      throw new ConfigurationError(
        this.initializationError
          ? `LlamaCloud parser not configured: ${this.initializationError.message}`
          : 'LlamaCloud parser is not configured. Please check your environment variables.'
      );
    }

    try {
      console.log(`Starting LlamaCloud parsing for file: ${file.name}`);
      console.log('Parse options:', options);

      // Transform options to match the existing service interface
      const serviceOptions = {
        fastMode: options.fastMode,
        premiumMode: options.premiumMode,
        complexTables: options.complexTables,
      };

      // Call the existing LlamaParse service
      const result = await this.llamaParseService!.parseFile(file, serviceOptions);

      console.log(`LlamaCloud parsing completed for document: ${result.id}`);

      // Ensure result conforms to ParseResult type
      return {
        id: result.id,
        status: result.status as 'success' | 'failed',
        documentName: result.documentName,
        content: result.content,
        metadata: result.metadata,
      };
    } catch (error) {
      console.error('LlamaCloud parsing failed:', error);

      if (error instanceof ConfigurationError) {
        throw error;
      }

      throw new ExternalServiceError(
        `LlamaCloud parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LlamaCloud'
      );
    }
  }

  /**
   * Get service status and configuration info
   */
  getServiceStatus(): {
    configured: boolean;
    error: string | null;
    version: string | null;
  } {
    return {
      configured: this.isConfigured(),
      error: this.initializationError?.message || null,
      version: this.llamaParseService ? 'LlamaCloud' : null,
    };
  }
}
