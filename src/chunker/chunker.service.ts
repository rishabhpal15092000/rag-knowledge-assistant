import { Injectable } from '@nestjs/common';

export interface TextChunk {
  content: string;
  chunkIndex: number;
  metadata: Record<string, any>;
}

@Injectable()
export class ChunkerService {
  /**
   * Split text into overlapping chunks.
   *
   * Strategy:
   *   - Try to break on paragraph boundaries first (double newline)
   *   - Fall back to sentence boundaries (. ! ?)
   *   - Hard-cap at maxChunkSize characters
   *
   * @param text        Raw document text
   * @param metadata    Source metadata attached to every chunk
   * @param maxSize     Max characters per chunk (default 800)
   * @param overlap     Characters of overlap between chunks (default 100)
   */
  chunk(
    text: string,
    metadata: Record<string, any> = {},
    maxSize = 800,
    overlap = 100,
  ): TextChunk[] {
    const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    const chunks: TextChunk[] = [];
    let current = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      if (current.length + paragraph.length + 2 <= maxSize) {
        current += (current ? '\n\n' : '') + paragraph;
      } else {
        // Flush current chunk
        if (current) {
          chunks.push({ content: current, chunkIndex: chunkIndex++, metadata });
          // Take last `overlap` chars as prefix for next chunk
          current = current.slice(-overlap) + '\n\n' + paragraph;
        } else {
          // Paragraph itself is too large — split by sentences
          const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];
          for (const sentence of sentences) {
            if (current.length + sentence.length + 1 <= maxSize) {
              current += (current ? ' ' : '') + sentence.trim();
            } else {
              if (current) {
                chunks.push({ content: current, chunkIndex: chunkIndex++, metadata });
                current = current.slice(-overlap) + ' ' + sentence.trim();
              } else {
                // Sentence is bigger than maxSize — hard split
                for (let i = 0; i < sentence.length; i += maxSize - overlap) {
                  chunks.push({
                    content: sentence.slice(i, i + maxSize),
                    chunkIndex: chunkIndex++,
                    metadata,
                  });
                }
                current = '';
              }
            }
          }
        }
      }
    }

    if (current.trim()) {
      chunks.push({ content: current.trim(), chunkIndex: chunkIndex++, metadata });
    }

    return chunks;
  }
}
