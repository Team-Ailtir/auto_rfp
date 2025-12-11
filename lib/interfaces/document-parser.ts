/**
 * Document parsing abstraction interface
 *
 * This interface defines the contract for document parsing services.
 * Different providers (LlamaCloud, Bedrock) can implement this interface
 * to provide document parsing capabilities.
 */

export interface ParseOptions {
  fastMode?: boolean;
  premiumMode?: boolean;
  complexTables?: boolean;
}

export interface ParseResult {
  id: string;
  status: 'success' | 'failed';
  documentName: string;
  content: string;
  metadata: {
    mode: 'fast' | 'balanced' | 'premium' | 'complexTables';
    wordCount: number;
    pageCount: number;
    summary: string;
  };
}

/**
 * Document parser interface
 */
export interface IDocumentParser {
  /**
   * Parse a file and extract text content
   *
   * @param file - File to parse
   * @param options - Parsing options
   * @returns Parsed document result
   */
  parseFile(file: File, options: ParseOptions): Promise<ParseResult>;

  /**
   * Check if the parser is properly configured
   *
   * @returns True if parser is ready to use
   */
  isConfigured(): boolean;

  /**
   * Get service status
   *
   * @returns Service configuration status
   */
  getServiceStatus(): {
    configured: boolean;
    error: string | null;
    version: string | null;
  };
}
