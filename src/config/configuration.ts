export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,

  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  },

  huggingface: {
    apiKey: process.env.HF_API_KEY,
    model: process.env.HF_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS, 10) || 384,
  },

  opensearch: {
    url: process.env.OPENSEARCH_URL || 'http://localhost:9201',
    username: process.env.OPENSEARCH_USERNAME || 'admin',
    password: process.env.OPENSEARCH_PASSWORD || 'admin',
    index: process.env.OPENSEARCH_INDEX || 'rag_documents',
  },

  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
    database: process.env.POSTGRES_DB || 'rag_db',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6380,
    embeddingTtl: parseInt(process.env.REDIS_EMBEDDING_TTL, 10) || 86400,
  },

  rag: {
    topK: parseInt(process.env.RAG_TOP_K, 10) || 5,
    historyTurns: parseInt(process.env.RAG_HISTORY_TURNS, 10) || 4,
  },
});
