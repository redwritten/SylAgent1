
import { NextRequest, NextResponse } from 'next/server';
import { memoryService } from '@/lib/services/memory-service';
import { llmService } from '@/lib/services/llm-service';
import { MEMORY_BUCKET_NAMES, MemoryBucketName } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Get memories from specific bucket or search across all
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bucket = searchParams.get('bucket') as MemoryBucketName;
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (bucket && !MEMORY_BUCKET_NAMES.includes(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket name' }, { status: 400 });
    }

    let memories;

    if (query) {
      // Search memories
      const queryEmbedding = await llmService.generateEmbedding(query);
      memories = await memoryService.searchMemories(
        query,
        queryEmbedding,
        bucket ? [bucket] : undefined,
        limit
      );
    } else if (bucket) {
      // Get memories from specific bucket
      memories = await memoryService.getMemoriesFromBucket(bucket, undefined, limit);
    } else {
      // Get memory statistics
      const stats = await memoryService.getMemoryStats();
      return NextResponse.json(stats);
    }

    return NextResponse.json({
      memories,
      count: memories.length,
      bucket: bucket || 'all'
    });

  } catch (error) {
    console.error('Memory GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Add new memory to a bucket
export async function POST(request: NextRequest) {
  try {
    const { bucket, text, source, agentId, metadata = {} } = await request.json();

    if (!bucket || !MEMORY_BUCKET_NAMES.includes(bucket)) {
      return NextResponse.json({ error: 'Valid bucket name is required' }, { status: 400 });
    }

    if (!text || !source) {
      return NextResponse.json({ error: 'Text and source are required' }, { status: 400 });
    }

    // Generate embeddings
    const embedding = await llmService.generateEmbedding(text);
    const metaVector = await llmService.generateMetaVector({
      ...metadata,
      addedAt: new Date().toISOString(),
      source
    });

    const memory = await memoryService.addMemoryChunk(
      bucket,
      text,
      embedding,
      metaVector,
      source,
      agentId,
      metadata
    );

    return NextResponse.json({
      success: true,
      memory: {
        id: memory.id,
        bucket,
        text: text.substring(0, 100) + '...',
        source,
        timestamp: memory.timestamp
      }
    });

  } catch (error) {
    console.error('Memory POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Update memory (boost, create links, etc.)
export async function PUT(request: NextRequest) {
  try {
    const { action, memoryId, ...data } = await request.json();

    if (!action || !memoryId) {
      return NextResponse.json({ error: 'Action and memoryId are required' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'boost':
        await memoryService.boostMemory(memoryId, data.boost || 0.1);
        result = { success: true, action: 'boost', memoryId };
        break;

      case 'link':
        if (!data.targetId || !data.linkType) {
          return NextResponse.json({ error: 'targetId and linkType are required for linking' }, { status: 400 });
        }
        const link = await memoryService.createMemoryLink(
          memoryId,
          data.targetId,
          data.linkType,
          data.strength || 1.0,
          data.metadata || {}
        );
        result = { success: true, action: 'link', link };
        break;

      case 'get_links':
        const links = await memoryService.getMemoryLinks(memoryId);
        result = { success: true, action: 'get_links', links };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Memory PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Initialize memory buckets
export async function PATCH(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'initialize') {
      await memoryService.initializeMemoryBuckets();
      return NextResponse.json({ success: true, message: 'Memory buckets initialized' });
    }

    if (action === 'decay') {
      const result = await memoryService.applyMemoryDecay();
      return NextResponse.json({ 
        success: true, 
        message: 'Memory decay applied',
        result 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Memory PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
