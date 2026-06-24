import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import { TextChunk } from '../chunker/chunker.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    documentId: string;
    documentTitle: string;
    source: string;
    chunkIndex: number;
    [key: string]: any;
  };
}

export interface RetrievedChunk {
  content: string;
  score: number;
  documentTitle: string;
  source: string;
  chunkIndex: number;
}

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(VectorStoreService.name);
  private readonly client: Client;
  private readonly index: string;
  private readonly dimensions: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly embeddingService: EmbeddingService,
  ) {
    this.client = new Client({
      node: this.configService.get<string>('opensearch.url'),
      ssl: { rejectUnauthorized: false },
    });
    this.index = this.configService.get<string>('opensearch.index');
    this.dimensions = this.configService.get<number>('huggingface.dimensions');
  }

  async onModuleInit() {
    await this.ensureIndex();
  }

  /**
   * Store document chunks in OpenSearch.
   * Embeds all chunks in one batched HuggingFace call.
   */
  async indexChunks(
    chunks: TextChunk[],
    documentId: string,
    documentTitle: string,
    source: string,
  ): Promise<void> {
    const texts = chunks.map((c) => c.content);
    const embeddings = await this.embeddingService.embedBatch(texts);

    const body: any[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const id = uuidv4();
      body.push({ index: { _index: this.index, _id: id } });
      body.push({
        id,
        content: chunks[i].content,
        embedding: embeddings[i],
        metadata: {
          documentId,
          documentTitle,
          source,
          chunkIndex: chunks[i].chunkIndex,
          ...chunks[i].metadata,
        },
      });
    }

    const response = await this.client.bulk({ body });
    const errors = response.body.items?.filter((i: any) => i.index?.error);
    if (errors?.length) {
      this.logger.error(`Bulk index errors: ${JSON.stringify(errors.slice(0, 3))}`);
    }
    this.logger.log(`Indexed ${chunks.length} chunks for document "${documentTitle}"`);
  }

  /**
   * k-NN cosine similarity search.
   * Returns top-k chunks most relevant to the query.
   */
  async similaritySearch(query: string, k?: number): Promise<RetrievedChunk[]> {
    const topK = k ?? this.configService.get<number>('rag.topK');
    const queryVector = await this.embeddingService.embed(query);

    const response = await this.client.search({
      index: this.index,
      body: {
        size: topK,
        query: {
          knn: {
            embedding: {
              vector: queryVector,
              k: topK,
            },
          },
        },
        _source: ['content', 'metadata'],
      },
    });

    const hits = response.body.hits?.hits || [];
    return hits.map((hit: any) => ({
      content: hit._source.content,
      score: hit._score,
      documentTitle: hit._source.metadata?.documentTitle,
      source: hit._source.metadata?.source,
      chunkIndex: hit._source.metadata?.chunkIndex,
    }));
  }

  /**
   * Delete all chunks belonging to a document.
   */
  async deleteDocument(documentId: string): Promise<void> {
    await this.client.deleteByQuery({
      index: this.index,
      body: {
        query: { term: { 'metadata.documentId': documentId } },
      },
    });
    this.logger.log(`Deleted all chunks for documentId: ${documentId}`);
  }

  // ── private ──────────────────────────────────────────────────────────────

  private async ensureIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: this.index });
    if (exists.body) {
      this.logger.log(`Index "${this.index}" already exists`);
      return;
    }

    await this.client.indices.create({
      index: this.index,
      body: {
        settings: {
          index: {
            knn: true,
            'knn.algo_param.ef_search': 100,
          },
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            content: { type: 'text', analyzer: 'standard' },
            embedding: {
              type: 'knn_vector',
              dimension: this.dimensions,
              method: {
                name: 'hnsw',
                engine: 'lucene',
                space_type: 'cosinesimil',
                parameters: { ef_construction: 128, m: 16 },
              },
            },
            metadata: {
              properties: {
                documentId: { type: 'keyword' },
                documentTitle: { type: 'keyword' },
                source: { type: 'keyword' },
                chunkIndex: { type: 'integer' },
              },
            },
          },
        },
      },
    });

    this.logger.log(`Created k-NN index "${this.index}" with ${this.dimensions}d HNSW`);
  }
}
