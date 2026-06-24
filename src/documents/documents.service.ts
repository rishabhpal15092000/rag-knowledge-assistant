import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ChunkerService } from '../chunker/chunker.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { IngestDocumentDto } from './dto/ingest-document.dto';

export interface IngestResult {
  documentId: string;
  title: string;
  chunksCreated: number;
  message: string;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly chunker: ChunkerService,
    private readonly vectorStore: VectorStoreService,
  ) {}

  /**
   * Ingest pipeline:
   *   1. Chunk the document text into overlapping segments
   *   2. Embed all chunks in batch (single HF API call)
   *   3. Store chunks + vectors in OpenSearch k-NN index
   */
  async ingest(dto: IngestDocumentDto): Promise<IngestResult> {
    const documentId = uuidv4();

    this.logger.log(`Ingesting document "${dto.title}" (id: ${documentId})`);

    const chunks = this.chunker.chunk(dto.content, {
      type: dto.type,
      source: dto.source,
    });

    this.logger.log(`Split into ${chunks.length} chunks — embedding & indexing...`);

    await this.vectorStore.indexChunks(
      chunks,
      documentId,
      dto.title,
      dto.source || 'manual',
    );

    return {
      documentId,
      title: dto.title,
      chunksCreated: chunks.length,
      message: `Successfully ingested "${dto.title}" as ${chunks.length} searchable chunks`,
    };
  }

  /**
   * Remove all chunks for a document from the vector store.
   */
  async delete(documentId: string): Promise<void> {
    await this.vectorStore.deleteDocument(documentId);
    this.logger.log(`Deleted document ${documentId}`);
  }
}
