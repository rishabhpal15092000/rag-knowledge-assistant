# RAG Knowledge Assistant

A production-ready **Retrieval-Augmented Generation (RAG)** backend for e-commerce, built with **NestJS**, **OpenSearch k-NN**, **HuggingFace Embeddings**, **Groq LLaMA 3**, **PostgreSQL**, and **Redis**. Ask natural-language questions against a curated knowledge base and receive grounded, source-cited answers.

---

## ✨ Features

- **Semantic Search** — Documents are chunked, embedded, and indexed in an OpenSearch k-NN (HNSW) vector store for high-quality cosine similarity retrieval.
- **Grounded Answers** — Groq-hosted LLaMA 3 generates responses strictly from retrieved context, minimising hallucination.
- **Multi-Turn Conversations** — Session-aware dialogue with conversation history stored in PostgreSQL and injected into the LLM prompt for continuity.
- **Embedding Cache** — Redis caches HuggingFace embedding vectors (SHA-256 keyed, 24 h TTL) to avoid redundant API calls.
- **Swagger UI** — Interactive API documentation served at `/api` for quick exploration and testing.
- **CLI Ingestion Script** — One-command bulk ingestion of Markdown knowledge-base files via `npm run ingest`.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    NestJS Application                        │
│                                                              │
│  ┌──────────┐   ┌───────────┐   ┌──────────────────────┐    │
│  │ Documents │   │    RAG    │   │    Conversation      │    │
│  │Controller │   │Controller │   │      Service         │    │
│  └────┬─────┘   └─────┬─────┘   └──────────┬───────────┘    │
│       │               │                     │                │
│  ┌────▼─────┐   ┌─────▼─────┐         ┌────▼─────┐         │
│  │ Chunker  │   │    LLM    │         │PostgreSQL│         │
│  │ Service  │   │  Service  │         │  (pg)    │         │
│  └────┬─────┘   └─────┬─────┘         └──────────┘         │
│       │               │                                      │
│  ┌────▼────────────────▼──────┐                              │
│  │     Vector Store Service   │                              │
│  │  (OpenSearch k-NN / HNSW)  │                              │
│  └────────────┬───────────────┘                              │
│               │                                              │
│  ┌────────────▼───────────────┐   ┌──────────┐              │
│  │    Embedding Service       │──▶│  Redis   │              │
│  │  (HuggingFace Inference)   │   │  Cache   │              │
│  └────────────────────────────┘   └──────────┘              │
└──────────────────────────────────────────────────────────────┘
```

### RAG Pipeline Flow

1. **Ingest** — Raw documents are chunked (800 chars, 100 char overlap), batch-embedded via HuggingFace, and bulk-indexed into OpenSearch.
2. **Query** — User question is embedded → k-NN cosine similarity search retrieves top-k chunks → chunks + conversation history are fed to Groq LLaMA 3 → grounded answer is returned with cited sources.
3. **Persist** — Every Q&A turn is saved to PostgreSQL for session replay and auditability.

---

## 🛠️ Tech Stack

| Layer           | Technology                                        |
| --------------- | ------------------------------------------------- |
| Framework       | NestJS 10 (TypeScript)                            |
| LLM             | Groq Cloud — LLaMA 3 8B (`llama3-8b-8192`)       |
| Embeddings      | HuggingFace Inference API (`all-MiniLM-L6-v2`, 384d) |
| Vector Store    | OpenSearch 2.11 — k-NN plugin (HNSW / Lucene)    |
| Database        | PostgreSQL 16 (conversation history)              |
| Cache           | Redis 7 (embedding vector cache)                  |
| API Docs        | Swagger / OpenAPI via `@nestjs/swagger`            |
| Containerisation| Docker Compose                                    |

---

## 📂 Project Structure

```
rag-knowledge-assistant/
├── knowledge-base/              # Source documents (Markdown)
│   ├── products.md              #   E-commerce product catalog
│   ├── faq.md                   #   Customer FAQ
│   └── policies.md              #   Store policies
├── src/
│   ├── main.ts                  # Bootstrap + Swagger setup
│   ├── app.module.ts            # Root module
│   ├── ingest.ts                # CLI ingestion script
│   ├── config/
│   │   └── configuration.ts     # Centralised env config
│   ├── cache/
│   │   ├── cache.module.ts      # Redis provider
│   │   └── cache.service.ts     # Get / Set / Del wrapper
│   ├── chunker/
│   │   └── chunker.service.ts   # Paragraph → sentence → hard-split chunking
│   ├── documents/
│   │   ├── documents.controller.ts  # POST /documents/ingest, DELETE /documents/:id
│   │   ├── documents.service.ts     # Chunk → embed → index orchestration
│   │   └── dto/
│   │       └── ingest-document.dto.ts
│   ├── embedding/
│   │   ├── embedding.module.ts
│   │   └── embedding.service.ts # HuggingFace embed + Redis cache-aside
│   ├── llm/
│   │   ├── llm.module.ts
│   │   └── llm.service.ts      # Groq LLaMA 3 prompt builder + completion
│   ├── vector-store/
│   │   ├── vector-store.module.ts
│   │   └── vector-store.service.ts  # OpenSearch k-NN index, bulk index, search
│   ├── conversation/
│   │   ├── conversation.module.ts
│   │   ├── conversation.service.ts  # PostgreSQL session CRUD
│   │   └── entities/
│   └── rag/
│       ├── rag.module.ts
│       ├── rag.controller.ts    # POST /rag/ask, GET /rag/session/:id
│       ├── rag.service.ts       # Full RAG pipeline orchestration
│       └── dto/
│           └── ask-question.dto.ts
├── docker-compose.yml           # OpenSearch + Redis + PostgreSQL
├── package.json
├── tsconfig.json
├── nest-cli.json
├── .env.example                 # Environment variable template
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Docker** & **Docker Compose**
- **Groq API Key** — [Get one free](https://console.groq.com)
- **HuggingFace API Key** — [Get one free](https://huggingface.co/settings/tokens)

### 1. Clone & Install

```bash
git clone https://gitlab.com/Rishabh1283/rag-knowledge-assistant.git
cd rag-knowledge-assistant
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```dotenv
GROQ_API_KEY=gsk_...
HF_API_KEY=hf_...
```

### 3. Start Infrastructure

```bash
docker compose up -d
```

This launches:

| Service     | Container         | Port  |
| ----------- | ----------------- | ----- |
| OpenSearch  | `rag-opensearch`  | 9201  |
| Redis       | `rag-redis`       | 6380  |
| PostgreSQL  | `rag-postgres`    | 5432  |

### 4. Start the Server

```bash
npm run start:dev
```

The server starts at **http://localhost:3001** with Swagger UI at **http://localhost:3001/api**.

### 5. Ingest the Knowledge Base

With the server running, open a second terminal:

```bash
npm run ingest
```

This reads all Markdown files from `knowledge-base/`, chunks them, generates embeddings, and indexes them in OpenSearch.

### 6. Ask a Question

```bash
curl -X POST http://localhost:3001/rag/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What running shoes do you have for flat feet?"}'
```

---

## 📡 API Endpoints

### Documents

| Method   | Endpoint                  | Description                              |
| -------- | ------------------------- | ---------------------------------------- |
| `POST`   | `/documents/ingest`       | Ingest a document (chunk → embed → index)|
| `DELETE` | `/documents/:documentId`  | Remove a document from the vector store  |

### RAG Assistant

| Method | Endpoint                 | Description                                  |
| ------ | ------------------------ | -------------------------------------------- |
| `POST` | `/rag/ask`               | Ask a question against the knowledge base    |
| `GET`  | `/rag/session/:sessionId`| Retrieve full conversation history           |

#### `POST /rag/ask` — Request Body

```json
{
  "question": "What is your return policy for electronics?",
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"  // optional, omit to start new session
}
```

#### `POST /rag/ask` — Response

```json
{
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "messageId": "abc123",
  "question": "What is your return policy for electronics?",
  "answer": "Based on the store policies, electronics can be returned within 7 days...",
  "sources": [
    {
      "documentTitle": "Store Policies",
      "source": "knowledge-base/policies.md",
      "relevanceScore": 0.923,
      "excerpt": "Electronics — 7-day return window from date of delivery..."
    }
  ],
  "tokensUsed": 312,
  "model": "llama3-8b-8192"
}
```

---

## ⚙️ Configuration

All settings are driven by environment variables (see [`.env.example`](.env.example)):

| Variable              | Default                                     | Description                        |
| --------------------- | ------------------------------------------- | ---------------------------------- |
| `GROQ_API_KEY`        | —                                           | Groq Cloud API key                 |
| `GROQ_MODEL`          | `llama3-8b-8192`                            | Groq model identifier              |
| `HF_API_KEY`          | —                                           | HuggingFace Inference API key      |
| `HF_MODEL`            | `sentence-transformers/all-MiniLM-L6-v2`    | Embedding model                    |
| `EMBEDDING_DIMENSIONS`| `384`                                       | Vector dimensions                  |
| `OPENSEARCH_URL`      | `http://localhost:9201`                      | OpenSearch node URL                |
| `OPENSEARCH_INDEX`    | `rag_documents`                              | Index name for document chunks     |
| `POSTGRES_HOST`       | `localhost`                                  | PostgreSQL host                    |
| `POSTGRES_PORT`       | `5432`                                       | PostgreSQL port                    |
| `POSTGRES_DB`         | `rag_db`                                     | Database name                      |
| `POSTGRES_USER`       | `postgres`                                   | Database user                      |
| `POSTGRES_PASSWORD`   | `postgres`                                   | Database password                  |
| `REDIS_HOST`          | `localhost`                                  | Redis host                         |
| `REDIS_PORT`          | `6380`                                       | Redis port                         |
| `RAG_TOP_K`           | `5`                                          | Number of chunks to retrieve       |
| `RAG_HISTORY_TURNS`   | `4`                                          | Conversation turns for context     |
| `PORT`                | `3001`                                       | Server port                        |

---

## 📜 Available Scripts

| Script              | Command                | Description                                      |
| ------------------- | ---------------------- | ------------------------------------------------ |
| Development server  | `npm run start:dev`    | Start with hot-reload (watch mode)               |
| Production build    | `npm run build`        | Compile TypeScript to `dist/`                    |
| Production start    | `npm run start:prod`   | Run compiled output from `dist/main`             |
| Ingest knowledge    | `npm run ingest`       | Bulk-ingest `knowledge-base/*.md` into OpenSearch|

---

## 📄 Knowledge Base

The `knowledge-base/` directory contains the source documents that power the assistant. Currently included:

| File            | Description                            |
| --------------- | -------------------------------------- |
| `products.md`   | E-commerce product catalog (footwear, electronics, home & kitchen, etc.) |
| `faq.md`        | Customer frequently asked questions    |
| `policies.md`   | Store policies (returns, shipping, warranties, etc.)                    |

To add new knowledge, create a Markdown file in `knowledge-base/` and re-run `npm run ingest`.

---

## 🧰 Development

```bash
# Start infrastructure
docker compose up -d

# Start dev server with hot-reload
npm run start:dev

# Ingest documents (run with server up)
npm run ingest

# Build for production
npm run build
npm run start:prod
```

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).

---

## 👤 Author

**Rishabh Pal**
