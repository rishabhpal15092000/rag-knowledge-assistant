import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { ConversationTurn } from '../llm/llm.service';
import { RetrievedChunk } from '../vector-store/vector-store.service';

export interface ConversationMessage {
  id: string;
  sessionId: string;
  question: string;
  answer: string;
  sources: RetrievedChunk[];
  tokensUsed: number;
  createdAt: Date;
}

@Injectable()
export class ConversationService implements OnModuleInit {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @Inject('PG_POOL') private readonly pool: Pool,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initSchema();
  }

  /**
   * Create a new session ID (UUID).
   */
  newSession(): string {
    return uuidv4();
  }

  /**
   * Get the last N turns of a conversation for context.
   */
  async getHistory(sessionId: string): Promise<ConversationTurn[]> {
    const turns = this.configService.get<number>('rag.historyTurns');
    const result = await this.pool.query(
      `SELECT question, answer FROM rag_conversations
       WHERE session_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [sessionId, turns],
    );

    const history: ConversationTurn[] = [];
    for (const row of result.rows) {
      history.push({ role: 'user', content: row.question });
      history.push({ role: 'assistant', content: row.answer });
    }
    return history;
  }

  /**
   * Persist a Q&A turn to PostgreSQL.
   */
  async saveMessage(
    sessionId: string,
    question: string,
    answer: string,
    sources: RetrievedChunk[],
    tokensUsed: number,
  ): Promise<string> {
    const id = uuidv4();
    await this.pool.query(
      `INSERT INTO rag_conversations (id, session_id, question, answer, sources, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, sessionId, question, answer, JSON.stringify(sources), tokensUsed],
    );
    return id;
  }

  /**
   * Retrieve full conversation history for a session.
   */
  async getSession(sessionId: string): Promise<ConversationMessage[]> {
    const result = await this.pool.query(
      `SELECT id, session_id, question, answer, sources, tokens_used, created_at
       FROM rag_conversations
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      question: row.question,
      answer: row.answer,
      sources: row.sources,
      tokensUsed: row.tokens_used,
      createdAt: row.created_at,
    }));
  }

  // ── private ──────────────────────────────────────────────────────────────

  private async initSchema(): Promise<void> {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS rag_conversations (
          id          UUID PRIMARY KEY,
          session_id  UUID NOT NULL,
          question    TEXT NOT NULL,
          answer      TEXT NOT NULL,
          sources     JSONB DEFAULT '[]',
          tokens_used INTEGER DEFAULT 0,
          created_at  TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_conversations_session_id
          ON rag_conversations(session_id);

        CREATE INDEX IF NOT EXISTS idx_conversations_created_at
          ON rag_conversations(created_at);
      `);
      this.logger.log('PostgreSQL schema initialised');
    } catch (error) {
      this.logger.error(`Schema init failed: ${error.message}`);
    }
  }
}
