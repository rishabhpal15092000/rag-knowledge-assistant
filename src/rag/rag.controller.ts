import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RagService } from './rag.service';
import { AskQuestionDto } from './dto/ask-question.dto';

@ApiTags('RAG Assistant')
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  /**
   * POST /rag/ask
   * Ask a question against the knowledge base.
   */
  @Post('ask')
  @ApiOperation({
    summary: 'Ask a question (RAG pipeline)',
    description:
      'Embeds your question → finds top-k similar chunks in OpenSearch → ' +
      'feeds context to Groq LLaMA 3 → returns a grounded answer with cited sources.',
  })
  @ApiResponse({
    status: 201,
    description: 'Answer generated successfully',
    schema: {
      example: {
        sessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        messageId: 'abc123',
        question: 'What shoes do you have for flat feet?',
        answer: 'Based on the product catalog, we carry the CloudWalk Orthopedic Runner which is specifically designed for flat feet and overpronation...',
        sources: [
          {
            documentTitle: 'Sports & Fitness Products',
            relevanceScore: 0.923,
            excerpt: 'CloudWalk Orthopedic Runner — engineered for flat feet...',
          },
        ],
        tokensUsed: 312,
        model: 'llama3-8b-8192',
      },
    },
  })
  async ask(@Body() dto: AskQuestionDto) {
    return this.ragService.ask(dto);
  }

  /**
   * GET /rag/session/:sessionId
   * Retrieve full conversation history (great for DBeaver demo).
   */
  @Get('session/:sessionId')
  @ApiOperation({
    summary: 'Get conversation history for a session',
    description: 'Returns all Q&A turns for a session from PostgreSQL.',
  })
  async getSession(@Param('sessionId') sessionId: string) {
    return this.ragService.getSession(sessionId);
  }
}
