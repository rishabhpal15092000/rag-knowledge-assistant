/**
 * npm run ingest
 *
 * Reads all .md files from knowledge-base/ and ingests them
 * into OpenSearch via the Documents API.
 */
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

const DOCUMENTS = [
  {
    file: 'products.md',
    title: 'E-Commerce Product Catalog',
    type: 'product',
    source: 'knowledge-base/products.md',
  },
  {
    file: 'faq.md',
    title: 'Customer FAQ',
    type: 'faq',
    source: 'knowledge-base/faq.md',
  },
  {
    file: 'policies.md',
    title: 'Store Policies',
    type: 'policy',
    source: 'knowledge-base/policies.md',
  },
];

async function ingest() {
  console.log('🚀 Starting knowledge base ingestion...\n');

  for (const doc of DOCUMENTS) {
    const filePath = path.join(__dirname, '..', 'knowledge-base', doc.file);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    console.log(`📄 Ingesting "${doc.title}" (${content.length} chars)...`);

    try {
      const response = await fetch(`${BASE_URL}/documents/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: doc.title,
          content,
          source: doc.source,
          type: doc.type,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(`❌ Failed: ${response.status} — ${err}`);
        continue;
      }

      const result = await response.json();
      console.log(`✅ ${result.message}`);
      console.log(`   └─ documentId: ${result.documentId}, chunks: ${result.chunksCreated}\n`);
    } catch (error) {
      console.error(`❌ Error ingesting ${doc.file}: ${error.message}`);
    }
  }

  console.log('✅ Ingestion complete! You can now ask questions via POST /rag/ask');
}

ingest().catch(console.error);
