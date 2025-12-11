import {
  IDocumentParser,
  ParseOptions,
  ParseResult,
} from '@/lib/interfaces/document-parser';
import { ConfigurationError, ExternalServiceError } from '@/lib/errors/api-errors';
import { env } from '@/lib/env';

/**
 * Bedrock document parser implementation
 *
 * Uses AWS Textract for document parsing
 */
export class BedrockParser implements IDocumentParser {
  private textractClient: any = null;
  private initializationError: Error | null = null;

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize the AWS Textract client
   */
  private initializeService(): void {
    try {
      // Check if AWS credentials are available
      if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
        throw new Error('AWS credentials are not configured');
      }

      console.log('Bedrock parser initialized successfully');
    } catch (error) {
      this.initializationError = error instanceof Error
        ? error
        : new Error('Unknown initialization error');
      console.error('Failed to initialize Bedrock parser:', this.initializationError.message);
    }
  }

  /**
   * Check if Textract service is properly configured
   */
  isConfigured(): boolean {
    return this.initializationError === null;
  }

  /**
   * Parse a file using AWS Textract
   */
  async parseFile(file: File, options: ParseOptions): Promise<ParseResult> {
    // Check service availability
    if (!this.isConfigured()) {
      throw new ConfigurationError(
        this.initializationError
          ? `Bedrock parser not configured: ${this.initializationError.message}`
          : 'Bedrock parser is not configured. Please check your environment variables.'
      );
    }

    try {
      console.log(`Starting Bedrock/Textract parsing for file: ${file.name}`);
      console.log('Parse options:', options);

      // Lazy load AWS SDK
      const { TextractClient, DetectDocumentTextCommand } = await import(
        '@aws-sdk/client-textract'
      );

      // Initialize Textract client
      if (!this.textractClient) {
        this.textractClient = new TextractClient({
          region: env.AWS_REGION,
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          },
        });
      }

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Call Textract to detect document text
      const command = new DetectDocumentTextCommand({
        Document: {
          Bytes: buffer,
        },
      });

      console.log('Calling AWS Textract...');
      const response = await this.textractClient.send(command);

      // Extract text from Textract response
      const documentText = this.extractTextFromResponse(response);

      console.log(`Textract parsing completed. Extracted ${documentText.length} characters`);

      // Return the result in the standard format
      return {
        id: `bedrock-textract-${Date.now()}`,
        status: 'success',
        documentName: file.name,
        content: documentText,
        metadata: {
          mode: options.fastMode ? 'fast' : 'balanced',
          wordCount: this.countWords(documentText),
          pageCount: this.estimatePages(documentText),
          summary: this.generateSummary(documentText),
        },
      };
    } catch (error) {
      console.error('Bedrock/Textract parsing failed:', error);

      if (error instanceof ConfigurationError) {
        throw error;
      }

      throw new ExternalServiceError(
        `Bedrock/Textract parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AWS Textract'
      );
    }
  }

  /**
   * Extract text content from Textract response
   */
  private extractTextFromResponse(response: any): string {
    if (!response.Blocks || response.Blocks.length === 0) {
      console.warn('No text blocks found in Textract response');
      return '';
    }

    // Extract text from LINE blocks (maintains document structure better than WORD blocks)
    const lines = response.Blocks
      .filter((block: any) => block.BlockType === 'LINE')
      .map((block: any) => block.Text || '')
      .filter((text: string) => text.trim().length > 0);

    return lines.join('\n');
  }

  /**
   * Count words in a text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
  }

  /**
   * Estimate page count based on word count
   * (roughly 500 words per page as a simple estimation)
   */
  private estimatePages(text: string): number {
    const words = this.countWords(text);
    return Math.max(1, Math.ceil(words / 500));
  }

  /**
   * Generate a short summary of the document content
   */
  private generateSummary(text: string): string {
    // Take the first 100 words as a simple summary
    const words = text.split(/\s+/).filter(Boolean);
    const summary = words.slice(0, 100).join(' ');
    return summary + (words.length > 100 ? '...' : '');
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
      version: this.isConfigured() ? 'AWS Textract' : null,
    };
  }
}
