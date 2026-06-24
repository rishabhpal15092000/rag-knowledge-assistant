import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { LlmModule } from '../llm/llm.module';
import { ConversationModule } from '../conversation/conversation.module';

@Module({
  imports: [ConfigModule, VectorStoreModule, LlmModule, ConversationModule],
  controllers: [RagController],
  providers: [RagService],
})
export class RagModule {}
