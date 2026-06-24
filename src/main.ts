import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Swagger UI
  const config = new DocumentBuilder()
    .setTitle('RAG Knowledge Assistant')
    .setDescription(
      'E-commerce knowledge assistant powered by NestJS + LangChain + ' +
      'OpenSearch k-NN + HuggingFace embeddings + Groq LLaMA 3 + PostgreSQL',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 RAG Knowledge Assistant running on http://localhost:${port}`);
  logger.log(`📖 Swagger UI: http://localhost:${port}/api`);
  logger.log(`\nEndpoints:`);
  logger.log(`  POST /documents/ingest  — add documents to knowledge base`);
  logger.log(`  POST /rag/ask           — ask a question (RAG pipeline)`);
  logger.log(`  GET  /rag/session/:id   — view conversation history`);
}

bootstrap();
