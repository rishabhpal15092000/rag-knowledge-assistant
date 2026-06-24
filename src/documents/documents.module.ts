import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ChunkerService } from '../chunker/chunker.service';
import { VectorStoreModule } from '../vector-store/vector-store.module';

@Module({
  imports: [ConfigModule, VectorStoreModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, ChunkerService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
