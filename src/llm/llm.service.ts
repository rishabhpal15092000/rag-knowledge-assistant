import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { RetrievedChunk } from '../vector-store/vector-store.service';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmAnswer {
  answer: string;
  tokensUsed: number;
  model: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly groq: Groq;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.groq = new Groq({
      apiKey: this.configService.get<string>('groq.apiKey'),
    });
    this.model = this.configService.get<string>('groq.model');
  }

  /**
   * Generate a grounded answer using retrieved context chunks.
   *
   * Prompt structure:
   *   [System: RAG instructions + context chunks]
   *   [History: previous conversation turns]
   *   [User: current question]
   */
  async generateAnswer(
    question: string,
    context: RetrievedChunk[],
    history: ConversationTurn[] = [],
  ): Promise<LlmAnswer> {
    const systemPrompt = this.buildSystemPrompt(context);
    const messages = this.buildMessages(systemPrompt, history, question);

    this.logger.debug(`Calling Groq (${this.model}) with ${context.length} context chunks`);

    const completion = await this.groq.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.2,   // Low temp = factual, less hallucination
      max_tokens: 1024,
    });

    const answer = completion.choices[0]?.message?.content || 'Sorry, I could not generate an answer.';
    const tokensUsed = completion.usage?.total_tokens || 0;

    return { answer, tokensUsed, model: this.model };
  }

  // ── private ──────────────────────────────────────────────────────────────

  private buildSystemPrompt(context: RetrievedChunk[]): string {
    const contextText = context
      .map((c, i) => `[Source ${i + 1}: ${c.documentTitle}]\n${c.content}`)
      .join('\n\n---\n\n');

    return `You are a helpful e-commerce knowledge assistant. Answer the user's question based ONLY on the context below.

Rules:
- Answer using ONLY the provided context. Do not make up information.
- If the answer is not in the context, say "I don't have that information in my knowledge base."
- Be concise and helpful.
- When referencing specific details (prices, specs, policies), mention the source.
- If the user asks a follow-up, use the conversation history for continuity.

CONTEXT:
${contextText}`;
  }

  private buildMessages(
    systemPrompt: string,
    history: ConversationTurn[],
    question: string,
  ): Groq.Chat.ChatCompletionMessageParam[] {
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Include recent conversation history
    for (const turn of history) {
      messages.push({ role: turn.role, content: turn.content });
    }

    messages.push({ role: 'user', content: question });
    return messages;
  }
}
