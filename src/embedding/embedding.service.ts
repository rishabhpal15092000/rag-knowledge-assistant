import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly hfApiKey: string;
  private readonly hfModel: string;
  private readonly cacheTtl: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.hfApiKey = this.configService.get<string>('huggingface.apiKey');
    this.hfModel = this.configService.get<string>('huggingface.model');
    this.cacheTtl = this.configService.get<number>('redis.embeddingTtl');
  }

  /**
   * Embed a single text string.
   * Cache-first: SHA-256 hash → Redis → HuggingFace API.
   */
  async embed(text: string): Promise<number[]> {
    const normalised = text.trim().toLowerCase();
    const cacheKey = this.buildCacheKey(normalised);

    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug('Embedding cache hit');
      return JSON.parse(cached);
    }

    const vector = await this.embedWithHuggingFace(normalised);
    await this.cacheService.set(cacheKey, JSON.stringify(vector), this.cacheTtl);
    return vector;
  }

  /**
   * Embed multiple texts in a single API call (more efficient).
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const result: number[][] = [];
    const uncachedTexts: string[] = [];
    const uncachedIndexes: number[] = [];

    // Check cache for each
    for (let i = 0; i < texts.length; i++) {
      const normalised = texts[i].trim().toLowerCase();
      const cached = await this.cacheService.get(this.buildCacheKey(normalised));
      if (cached) {
        result[i] = JSON.parse(cached);
      } else {
        uncachedTexts.push(normalised);
        uncachedIndexes.push(i);
      }
    }

    if (uncachedTexts.length === 0) return result;

    // Batch call for uncached
    const vectors = await this.embedBatchWithHuggingFace(uncachedTexts);
    for (let j = 0; j < vectors.length; j++) {
      const idx = uncachedIndexes[j];
      result[idx] = vectors[j];
      const key = this.buildCacheKey(uncachedTexts[j]);
      await this.cacheService.set(key, JSON.stringify(vectors[j]), this.cacheTtl);
    }

    return result;
  }

  // ── private ──────────────────────────────────────────────────────────────

  private async embedWithHuggingFace(text: string): Promise<number[]> {
    const vectors = await this.embedBatchWithHuggingFace([text]);
    return vectors[0];
  }

  private async embedBatchWithHuggingFace(texts: string[]): Promise<number[][]> {
    const url = `https://router.huggingface.co/hf-inference/models/${this.hfModel}/pipeline/feature-extraction`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.hfApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`HuggingFace embedding error ${response.status}: ${err}`);
    }

    const data = await response.json();
    // data is either number[][] (batch) or number[] (single)
    if (Array.isArray(data[0])) return data as number[][];
    return [data as number[]];
  }

  private buildCacheKey(text: string): string {
    const hash = createHash('sha256').update(text).digest('hex');
    return `rag:embedding:${hash}`;
  }
}
