import { IDocumentParser } from '@/lib/interfaces/document-parser';
import { LlamaCloudParser } from './llamacloud-parser';
import { BedrockParser } from './bedrock-parser';
import { getLlamaSdkProvider } from '@/lib/env';

/**
 * Parser factory singleton
 *
 * Returns the appropriate document parser based on LLAMA_SDK_PROVIDER environment variable.
 * Caches parser instances for performance.
 */
class ParserFactory {
  private llamaCloudParser: LlamaCloudParser | null = null;
  private bedrockParser: BedrockParser | null = null;

  /**
   * Get the appropriate document parser based on provider configuration
   *
   * @returns Document parser instance
   * @throws {Error} If provider type is invalid or parser initialization fails
   */
  getParser(): IDocumentParser {
    const providerType = getLlamaSdkProvider();

    console.log(`Getting parser for provider: ${providerType}`);

    if (providerType === 'llamacloud') {
      if (!this.llamaCloudParser) {
        this.llamaCloudParser = new LlamaCloudParser();
      }
      return this.llamaCloudParser;
    } else if (providerType === 'bedrock') {
      if (!this.bedrockParser) {
        this.bedrockParser = new BedrockParser();
      }
      return this.bedrockParser;
    }

    throw new Error(
      `Invalid LLAMA_SDK_PROVIDER: "${providerType}". Must be "llamacloud" or "bedrock".`
    );
  }

  /**
   * Clear cached parser instances
   * Useful for testing or when credentials change
   */
  clearCache(): void {
    this.llamaCloudParser = null;
    this.bedrockParser = null;
  }

  /**
   * Get status of all available parsers
   */
  getAllParserStatus(): {
    llamacloud: { configured: boolean; error: string | null };
    bedrock: { configured: boolean; error: string | null };
  } {
    return {
      llamacloud: {
        configured: this.llamaCloudParser?.isConfigured() ?? false,
        error: this.llamaCloudParser?.getServiceStatus().error ?? null,
      },
      bedrock: {
        configured: this.bedrockParser?.isConfigured() ?? false,
        error: this.bedrockParser?.getServiceStatus().error ?? null,
      },
    };
  }
}

// Export singleton instance
export const parserFactory = new ParserFactory();
