import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VectorStoreService } from './vector-store.service';
import { EmbeddingModule } from '../embedding/embedding.module';

@Module({
  imports: [ConfigModule, EmbeddingModule],
  providers: [VectorStoreService],
  exports: [VectorStoreService],
})
export class VectorStoreModule {}
