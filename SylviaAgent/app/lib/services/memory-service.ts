
import { 
  MemoryChunk, 
  MemoryBucketName, 
  MEMORY_BUCKET_NAMES, 
  MEMORY_DECAY_RATES,
  MemoryLink 
} from '../types';
import { prisma } from '../db-client';

export class MemoryService {
  private static instance: MemoryService;

  static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  // Initialize the 10 memory buckets
  async initializeMemoryBuckets(): Promise<void> {
    const bucketConfigs = [
      { name: 'semantic_stm', description: 'Semantic Short-Term Memory', bucketType: 'STM' },
      { name: 'semantic_ltm', description: 'Semantic Long-Term Memory', bucketType: 'LTM' },
      { name: 'procedural_stm', description: 'Procedural Short-Term Memory', bucketType: 'STM' },
      { name: 'procedural_ltm', description: 'Procedural Long-Term Memory', bucketType: 'LTM' },
      { name: 'episodic_stm', description: 'Episodic Short-Term Memory', bucketType: 'STM' },
      { name: 'episodic_ltm', description: 'Episodic Long-Term Memory', bucketType: 'LTM' },
      { name: 'diary_rl', description: 'Diary Reinforcement Learning', bucketType: 'RL' },
      { name: 'calendar_rl', description: 'Calendar Reinforcement Learning', bucketType: 'RL' },
      { name: 'api_docs', description: 'API Documentation Memory', bucketType: 'DOCS' },
      { name: 'odds_ends', description: 'Miscellaneous Memory', bucketType: 'MISC' }
    ];

    for (const config of bucketConfigs) {
      try {
        // Check if bucket already exists
        const existingBucket = await prisma.memoryBucket.findUnique({
          where: { name: config.name }
        });
        
        // Only create if it doesn't exist
        if (!existingBucket) {
          await prisma.memoryBucket.create({
            data: config
          });
        }
      } catch (error) {
        // If there's a unique constraint error, just continue (bucket already exists)
        if (error instanceof Error && error.message.includes('Unique constraint')) {
          continue;
        }
        throw error;
      }
    }
  }

  // Add memory chunk to specific bucket
  async addMemoryChunk(
    bucketName: MemoryBucketName,
    text: string,
    embedding: number[],
    metaVector: number[],
    source: string,
    agentId?: string,
    metadata: Record<string, any> = {}
  ): Promise<MemoryChunk> {
    const bucket = await prisma.memoryBucket.findUnique({
      where: { name: bucketName }
    });

    if (!bucket) {
      throw new Error(`Memory bucket ${bucketName} not found`);
    }

    // Determine decay rate based on bucket type
    const decayRate = bucket.bucketType === 'STM' ? MEMORY_DECAY_RATES.STM :
                     bucket.bucketType === 'LTM' ? MEMORY_DECAY_RATES.LTM :
                     MEMORY_DECAY_RATES.RL;

    const chunk = await prisma.memoryChunk.create({
      data: {
        bucketId: bucket.id,
        text,
        embedding,
        metaVector,
        source,
        agentId,
        metadata,
        decayRate
      }
    });

    return chunk as MemoryChunk;
  }

  // Retrieve memories from bucket with similarity search
  async getMemoriesFromBucket(
    bucketName: MemoryBucketName,
    queryEmbedding?: number[],
    limit: number = 10,
    minScore: number = 0.1
  ): Promise<MemoryChunk[]> {
    const bucket = await prisma.memoryBucket.findUnique({
      where: { name: bucketName }
    });

    if (!bucket) {
      throw new Error(`Memory bucket ${bucketName} not found`);
    }

    let chunks = await prisma.memoryChunk.findMany({
      where: {
        bucketId: bucket.id,
        score: { gte: minScore }
      },
      orderBy: [
        { score: 'desc' },
        { lastAccessed: 'desc' }
      ],
      take: limit
    });

    // If query embedding provided, calculate similarity
    if (queryEmbedding && queryEmbedding.length > 0) {
      chunks = chunks.map(chunk => ({
        ...chunk,
        similarity: this.calculateCosineSimilarity(queryEmbedding, chunk.embedding)
      })).sort((a: any, b: any) => (b.similarity || 0) - (a.similarity || 0));
    }

    // Update last accessed time
    await Promise.all(chunks.map(chunk => 
      prisma.memoryChunk.update({
        where: { id: chunk.id },
        data: { 
          lastAccessed: new Date(),
          accessCount: { increment: 1 }
        }
      })
    ));

    return chunks as MemoryChunk[];
  }

  // Create memory links (backlinking system)
  async createMemoryLink(
    sourceId: string,
    targetId: string,
    linkType: 'semantic' | 'causal' | 'temporal' | 'associative',
    strength: number = 1.0,
    metadata: Record<string, any> = {}
  ): Promise<MemoryLink> {
    const link = await prisma.memoryLink.create({
      data: {
        sourceId,
        targetId,
        linkType,
        strength,
        metadata
      }
    });

    return link as MemoryLink;
  }

  // Get memory links for a chunk
  async getMemoryLinks(chunkId: string): Promise<{
    outgoing: MemoryLink[];
    incoming: MemoryLink[];
  }> {
    const [outgoing, incoming] = await Promise.all([
      prisma.memoryLink.findMany({
        where: { sourceId: chunkId },
        include: {
          target: true
        }
      }),
      prisma.memoryLink.findMany({
        where: { targetId: chunkId },
        include: {
          source: true
        }
      })
    ]);

    return {
      outgoing: outgoing as MemoryLink[],
      incoming: incoming as MemoryLink[]
    };
  }

  // Memory decay process (called by cron job)
  async applyMemoryDecay(): Promise<{
    processed: number;
    decayed: number;
    deleted: number;
  }> {
    const chunks = await prisma.memoryChunk.findMany();
    let processed = 0;
    let decayed = 0;
    let deleted = 0;

    for (const chunk of chunks) {
      const timeSinceLastAccess = Date.now() - chunk.lastAccessed.getTime();
      const hoursSinceAccess = timeSinceLastAccess / (1000 * 60 * 60);
      
      // Apply exponential decay
      const newScore = chunk.score * Math.pow(chunk.decayRate, hoursSinceAccess);

      if (newScore < 0.05) {
        // Delete if score too low
        await prisma.memoryChunk.delete({ where: { id: chunk.id } });
        deleted++;
      } else if (newScore !== chunk.score) {
        // Update score
        await prisma.memoryChunk.update({
          where: { id: chunk.id },
          data: { score: newScore }
        });
        decayed++;
      }
      
      processed++;
    }

    return { processed, decayed, deleted };
  }

  // Boost memory chunk (reinforcement learning)
  async boostMemory(chunkId: string, boost: number = 0.1): Promise<void> {
    await prisma.memoryChunk.update({
      where: { id: chunkId },
      data: {
        score: { increment: boost },
        lastAccessed: new Date(),
        accessCount: { increment: 1 }
      }
    });
  }

  // Search across all memory buckets
  async searchMemories(
    query: string,
    queryEmbedding: number[],
    buckets?: MemoryBucketName[],
    limit: number = 20
  ): Promise<MemoryChunk[]> {
    const bucketsToSearch = buckets || MEMORY_BUCKET_NAMES;
    const allResults: MemoryChunk[] = [];

    for (const bucketName of bucketsToSearch) {
      const results = await this.getMemoriesFromBucket(
        bucketName,
        queryEmbedding,
        Math.ceil(limit / bucketsToSearch.length)
      );
      allResults.push(...results);
    }

    // Sort by similarity and limit
    return allResults
      .sort((a: any, b: any) => (b.similarity || b.score) - (a.similarity || a.score))
      .slice(0, limit);
  }

  // Utility function for cosine similarity
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  // Get memory statistics
  async getMemoryStats(): Promise<Record<string, any>> {
    const buckets = await prisma.memoryBucket.findMany({
      include: {
        _count: {
          select: { chunks: true }
        }
      }
    });

    const totalChunks = await prisma.memoryChunk.count();
    const totalLinks = await prisma.memoryLink.count();
    const totalReflections = await prisma.memoryReflection.count();

    return {
      totalChunks,
      totalLinks,
      totalReflections,
      buckets: buckets.map(bucket => ({
        name: bucket.name,
        type: bucket.bucketType,
        chunkCount: bucket._count.chunks
      }))
    };
  }
}

export const memoryService = MemoryService.getInstance();
