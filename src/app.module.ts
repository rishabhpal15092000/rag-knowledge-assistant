import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { CacheModule } from './cache/cache.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { VectorStoreModule } from './vector-store/vector-store.module';
import { DocumentsModule } from './documents/documents.module';
import { LlmModule } from './llm/llm.module';
import { ConversationModule } from './conversation/conversation.module';
import { RagModule } from './rag/rag.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CacheModule,
    EmbeddingModule,
    VectorStoreModule,
    LlmModule,
    ConversationModule,
    DocumentsModule,
    RagModule,
  ],
})
export class AppModule {}
