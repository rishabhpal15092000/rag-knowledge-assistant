import { Injectable, Logger } from '@nestjs/common';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { LlmService } from '../llm/llm.service';
import { ConversationService } from '../conversation/conversation.service';
import { AskQuestionDto } from './dto/ask-question.dto';

export interface RagResponse {
  sessionId: string;
  messageId: string;
  question: string;
  answer: string;
  sources: Array<{
    documentTitle: string;
    source: string;
    relevanceScore: number;
    excerpt: string;
  }>;
  tokensUsed: number;
  model: string;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly vectorStore: VectorStoreService,
    private readonly llm: LlmService,
    private readonly conversation: ConversationService,
  ) {}

  /**
   * Full RAG pipeline:
   *   1. Resolve or create session
   *   2. Load conversation history from PostgreSQL
   *   3. Embed question → k-NN search in OpenSearch → retrieve top-k chunks
   *   4. Feed question + context + history to Groq LLaMA 3
   *   5. Save Q&A turn to PostgreSQL
   *   6. Return answer with cited sources
   */
  async ask(dto: AskQuestionDto): Promise<RagResponse> {
    const sessionId = dto.sessionId || this.conversation.newSession();

    this.logger.log(`[session:${sessionId}] Q: "${dto.question}"`);

    // Step 1 — load conversation history
    const history = await this.conversation.getHistory(sessionId);

    // Step 2 — retrieve relevant context from vector store
    const chunks = await this.vectorStore.similaritySearch(dto.question);
    this.logger.log(`Retrieved ${chunks.length} context chunks`);

    if (chunks.length === 0) {
      const fallback = "I couldn't find relevant information in the knowledge base. Please try rephrasing your question.";
      const messageId = await this.conversation.saveMessage(sessionId, dto.question, fallback, [], 0);
      return {
        sessionId,
        messageId,
        question: dto.question,
        answer: fallback,
        sources: [],
        tokensUsed: 0,
        model: 'none',
      };
    }

    // Step 3 — generate answer with Groq LLaMA 3
    const { answer, tokensUsed, model } = await this.llm.generateAnswer(
      dto.question,
      chunks,
      history,
    );

    // Step 4 — persist conversation turn
    const messageId = await this.conversation.saveMessage(
      sessionId,
      dto.question,
      answer,
      chunks,
      tokensUsed,
    );

    this.logger.log(`[session:${sessionId}] Answered (${tokensUsed} tokens)`);

    return {
      sessionId,
      messageId,
      question: dto.question,
      answer,
      sources: chunks.map((c) => ({
        documentTitle: c.documentTitle,
        source: c.source,
        relevanceScore: Math.round(c.score * 1000) / 1000,
        excerpt: c.content.slice(0, 200) + (c.content.length > 200 ? '...' : ''),
      })),
      tokensUsed,
      model,
    };
  }

  /**
   * Get full conversation history for a session.
   * Useful for debugging and the DBeaver demo.
   */
  async getSession(sessionId: string) {
    return this.conversation.getSession(sessionId);
  }
}
