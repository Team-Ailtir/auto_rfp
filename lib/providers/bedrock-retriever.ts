/**
 * Custom Bedrock Knowledge Base Retriever
 *
 * Since llamaindex 0.10.3 doesn't have built-in Bedrock support,
 * we implement a custom retriever that extends BaseRetriever.
 */

import { BaseRetriever, NodeWithScore, TextNode } from 'llamaindex';
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
  RetrievalResultContent,
} from '@aws-sdk/client-bedrock-agent-runtime';

/**
 * Configuration for Bedrock Knowledge Base Retriever
 */
export interface BedrockRetrieverConfig {
  /**
   * Knowledge Base ID from AWS Bedrock
   */
  knowledgeBaseId: string;

  /**
   * AWS region where the Knowledge Base is located
   */
  region: string;

  /**
   * Number of results to retrieve
   * @default 10
   */
  topK?: number;

  /**
   * AWS credentials (optional - uses default credential chain if not provided)
   */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

/**
 * Bedrock Knowledge Base Retriever
 *
 * Custom implementation of BaseRetriever for Amazon Bedrock Knowledge Bases.
 * Integrates with LlamaIndex query engines for RAG applications.
 */
export class BedrockKnowledgeBaseRetriever extends BaseRetriever {
  private client: BedrockAgentRuntimeClient;
  private knowledgeBaseId: string;
  private topK: number;

  constructor(config: BedrockRetrieverConfig) {
    super();
    this.knowledgeBaseId = config.knowledgeBaseId;
    this.topK = config.topK || 10;

    // Initialize Bedrock Agent Runtime client
    this.client = new BedrockAgentRuntimeClient({
      region: config.region,
      credentials: config.credentials,
    });
  }

  /**
   * Retrieve relevant nodes for a query
   *
   * @param query - Search query string
   * @returns Array of nodes with relevance scores
   */
  async retrieve(query: string): Promise<NodeWithScore[]> {
    try {
      // Create retrieve command
      const command = new RetrieveCommand({
        knowledgeBaseId: this.knowledgeBaseId,
        retrievalQuery: { text: query },
        retrievalConfiguration: {
          vectorSearchConfiguration: {
            numberOfResults: this.topK,
          },
        },
      });

      // Execute retrieval
      const response = await this.client.send(command);

      // Transform Bedrock results to LlamaIndex format
      return this.transformResults(response.retrievalResults || []);
    } catch (error) {
      console.error('Bedrock retrieval error:', error);
      throw new Error(
        `Failed to retrieve from Bedrock Knowledge Base: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Transform Bedrock retrieval results to LlamaIndex NodeWithScore format
   *
   * @param results - Raw results from Bedrock API
   * @returns Array of NodeWithScore objects
   */
  private transformResults(results: any[]): NodeWithScore[] {
    return results.map((result, index) => {
      // Extract text content from Bedrock result
      const content = result.content?.text || '';
      const score = result.score || 0;

      // Extract source information
      const sourceUri = result.location?.s3Location?.uri || 'unknown';
      const chunkId = result.metadata?.['x-amz-bedrock-kb-chunk-id'] || `result_${index}`;

      // Create TextNode with metadata
      const node = new TextNode({
        text: content,
        metadata: {
          source: sourceUri,
          knowledgeBaseId: this.knowledgeBaseId,
          resultId: chunkId,
          score: score,
        },
      });

      return {
        node,
        score,
      };
    });
  }

  /**
   * Get the retriever metadata
   */
  getMetadata(): Record<string, any> {
    return {
      type: 'bedrock-knowledge-base',
      knowledgeBaseId: this.knowledgeBaseId,
      topK: this.topK,
    };
  }
}
