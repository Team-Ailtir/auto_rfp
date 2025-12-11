/**
 * Provider Factory
 *
 * Central factory for creating and managing document index provider instances.
 * Implements singleton pattern with caching for performance.
 */

import { IDocumentIndexProvider, ProviderType } from '@/lib/interfaces/document-index-provider';

/**
 * Provider Factory Class
 *
 * Manages provider instances with caching to avoid repeated instantiation.
 * Uses singleton pattern - import the `providerFactory` instance rather than
 * creating new instances.
 */
export class ProviderFactory {
  private providers: Map<ProviderType, IDocumentIndexProvider> = new Map();

  /**
   * Get the current provider based on LLAMA_SDK_PROVIDER environment variable
   *
   * @returns Provider instance for the configured provider type
   * @throws {Error} If provider type is unsupported or not configured
   */
  getProvider(): IDocumentIndexProvider {
    const providerType = this.getProviderType();

    // Return cached provider if available
    if (this.providers.has(providerType)) {
      return this.providers.get(providerType)!;
    }

    // Create and cache new provider instance
    const provider = this.createProvider(providerType);
    this.providers.set(providerType, provider);

    return provider;
  }

  /**
   * Get the configured provider type from environment
   *
   * @returns Provider type from LLAMA_SDK_PROVIDER env var
   * @throws {Error} If LLAMA_SDK_PROVIDER is not set
   */
  private getProviderType(): ProviderType {
    const providerType = process.env.LLAMA_SDK_PROVIDER;

    if (!providerType) {
      throw new Error(
        'LLAMA_SDK_PROVIDER environment variable is not set. ' +
        'Please set it to "llamacloud" or "bedrock".'
      );
    }

    if (providerType !== 'llamacloud' && providerType !== 'bedrock') {
      throw new Error(
        `Unsupported provider type: "${providerType}". ` +
        'Supported types are: "llamacloud", "bedrock".'
      );
    }

    return providerType as ProviderType;
  }

  /**
   * Create a new provider instance based on type
   *
   * @param type - Provider type to create
   * @returns New provider instance
   * @throws {Error} If provider type is not yet implemented
   */
  private createProvider(type: ProviderType): IDocumentIndexProvider {
    switch (type) {
      case 'llamacloud': {
        // Lazy import to avoid circular dependencies
        const { LlamaCloudProvider } = require('./llamacloud-provider');
        return new LlamaCloudProvider();
      }

      case 'bedrock': {
        // Lazy import to avoid circular dependencies
        const { BedrockProvider } = require('./bedrock-provider');
        return new BedrockProvider();
      }

      default:
        // TypeScript exhaustiveness check
        const exhaustive: never = type;
        throw new Error(`Unsupported provider type: ${exhaustive}`);
    }
  }

  /**
   * Clear the provider cache
   *
   * This is primarily useful for testing to ensure clean state between tests.
   * In production, providers are cached for the lifetime of the application.
   */
  clearCache(): void {
    this.providers.clear();
  }

  /**
   * Get the number of cached providers (for testing/debugging)
   */
  getCacheSize(): number {
    return this.providers.size;
  }
}

/**
 * Singleton provider factory instance
 *
 * Import and use this instance throughout the application:
 *
 * @example
 * ```typescript
 * import { providerFactory } from '@/lib/providers/provider-factory';
 *
 * const provider = providerFactory.getProvider();
 * const projects = await provider.verifyCredentialsAndFetchProjects(credentials);
 * ```
 */
export const providerFactory = new ProviderFactory();
