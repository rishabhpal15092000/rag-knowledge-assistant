import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { IngestDocumentDto } from './dto/ingest-document.dto';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * POST /documents/ingest
   * Upload a document to the knowledge base.
   * The pipeline: chunk → embed → index in OpenSearch.
   */
  @Post('ingest')
  @ApiOperation({
    summary: 'Ingest a document into the knowledge base',
    description:
      'Splits the document into overlapping chunks, generates HuggingFace embeddings, ' +
      'and indexes them in OpenSearch k-NN for semantic retrieval.',
  })
  @ApiResponse({ status: 201, description: 'Document ingested successfully' })
  async ingest(@Body() dto: IngestDocumentDto) {
    return this.documentsService.ingest(dto);
  }

  /**
   * DELETE /documents/:documentId
   * Remove all chunks for a document from the index.
   */
  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a document from the knowledge base' })
  async delete(@Param('documentId') documentId: string) {
    await this.documentsService.delete(documentId);
  }
}
