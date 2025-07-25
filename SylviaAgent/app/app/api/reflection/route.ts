
import { NextRequest, NextResponse } from 'next/server';
import { reflectionService } from '@/lib/services/reflection-service';
import { MEMORY_BUCKET_NAMES, MemoryBucketName } from '@/lib/types';
import { prisma } from '@/lib/db-client';

export const dynamic = 'force-dynamic';

// Get recent reflections
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    const reflections = await reflectionService.getRecentReflections(limit);
    
    return NextResponse.json({
      reflections,
      count: reflections.length
    });

  } catch (error) {
    console.error('Reflection GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Generate or schedule reflections
export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'generate':
        // Validate memory scope
        if (!data.memoryScope || !Array.isArray(data.memoryScope)) {
          return NextResponse.json({ 
            error: 'memoryScope array is required for reflection generation' 
          }, { status: 400 });
        }

        const invalidBuckets = data.memoryScope.filter(
          (bucket: string) => !MEMORY_BUCKET_NAMES.includes(bucket as MemoryBucketName)
        );

        if (invalidBuckets.length > 0) {
          return NextResponse.json({ 
            error: `Invalid memory buckets: ${invalidBuckets.join(', ')}` 
          }, { status: 400 });
        }

        // Get conductor agent
        const conductor = await prisma.agent.findFirst({
          where: { type: 'CONDUCTOR' }
        });

        if (!conductor) {
          return NextResponse.json({ error: 'Conductor agent not found' }, { status: 500 });
        }

        const reflectionRequest = {
          triggerType: data.triggerType || 'user_request',
          memoryScope: data.memoryScope,
          reflectionDepth: data.reflectionDepth || 'medium',
          focusAreas: data.focusAreas || []
        };

        result = await reflectionService.generateReflection(
          reflectionRequest,
          conductor.id
        );
        break;

      case 'schedule':
        if (!data.memoryScope || !Array.isArray(data.memoryScope)) {
          return NextResponse.json({ 
            error: 'memoryScope array is required for reflection scheduling' 
          }, { status: 400 });
        }

        const taskId = await reflectionService.scheduleReflection(
          data.memoryScope,
          data.reflectionDepth || 'medium',
          data.focusAreas || []
        );

        result = { 
          scheduled: true, 
          taskId,
          message: 'Reflection scheduled for execution'
        };
        break;

      case 'auto_reflect':
        // Automatic reflection based on system state
        const defaultMemoryScope: MemoryBucketName[] = [
          'semantic_stm',
          'episodic_stm',
          'procedural_stm'
        ];

        const conductor2 = await prisma.agent.findFirst({
          where: { type: 'CONDUCTOR' }
        });

        if (!conductor2) {
          return NextResponse.json({ error: 'Conductor agent not found' }, { status: 500 });
        }

        const autoReflectionRequest = {
          triggerType: 'scheduled' as const,
          memoryScope: defaultMemoryScope,
          reflectionDepth: 'shallow' as const,
          focusAreas: ['recent_interactions', 'learning_progress']
        };

        result = await reflectionService.generateReflection(
          autoReflectionRequest,
          conductor2.id
        );
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });

  } catch (error) {
    console.error('Reflection POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Update reflection settings
export async function PUT(request: NextRequest) {
  try {
    const { userId = 'default-user', autoReflection, reflectionFrequency } = await request.json();

    // Update user's reflection preferences
    const updatedProfile = await prisma.userProfile.update({
      where: { id: userId },
      data: {
        ...(autoReflection !== undefined && { autoReflection }),
        ...(reflectionFrequency && { 
          preferences: { 
            reflectionFrequency 
          } 
        }),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      profile: updatedProfile,
      message: 'Reflection settings updated'
    });

  } catch (error) {
    console.error('Reflection PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
