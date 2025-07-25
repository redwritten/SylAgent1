
import { NextRequest, NextResponse } from 'next/server';
import { llmService } from '@/lib/services/llm-service';
import { agentService } from '@/lib/services/agent-service';
import { memoryService } from '@/lib/services/memory-service';
import { learningService } from '@/lib/services/learning-service';
import { reflectionService } from '@/lib/services/reflection-service';
import { LLMMessage } from '@/lib/types';
import { prisma } from '@/lib/db-client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { message, userId = 'default-user', context = {} } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get or create user profile
    const userProfile = await learningService.getOrCreateUserProfile(userId);
    
    // Get conductor agent
    const conductor = await prisma.agent.findFirst({
      where: { 
        OR: [
          { type: 'CONDUCTOR' },
          { name: 'Sylvia Conductor' }
        ]
      }
    });

    if (!conductor) {
      return NextResponse.json({ error: 'Conductor agent not found' }, { status: 500 });
    }

    // Search relevant memories
    const queryEmbedding = await llmService.generateEmbedding(message);
    const relevantMemories = await memoryService.searchMemories(
      message,
      queryEmbedding,
      undefined,
      10
    );

    // Get recent conversation context
    const recentTasks = await prisma.agentTask.findMany({
      where: { agentId: conductor.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { agent: true }
    });

    // Build context-aware messages for conductor
    const systemPrompt = `${conductor.systemPrompt}

CURRENT CONTEXT:
- User Profile: ${userProfile.name} (Personality: ${userProfile.personalityType || 'Unknown'})
- Autonomy Level: ${userProfile.autonomyLevel}/5 (${userProfile.autonomyEnabled ? 'Enabled' : 'Disabled'})
- Relevant Memories: ${relevantMemories.length} found
- Recent Interactions: ${recentTasks.length} previous tasks

RELEVANT MEMORIES:
${relevantMemories.map((mem, i) => `${i + 1}. [${mem.source}] ${mem.text.substring(0, 200)}...`).join('\n')}

JAKE'S LAWS COMPLIANCE:
1. Context Awareness: Use the provided memories and user profile
2. Quality Focus: Provide thoughtful, well-reasoned responses
3. Explicit Goals: Clearly state your reasoning and approach
4. Continuous Learning: Update memories based on this interaction
5. User-Centric: Adapt to user's personality type and autonomy preferences

Remember: You can delegate tasks to subroutine agents when needed. Always prioritize context awareness and quality.`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    // Create task for conductor
    const task = await agentService.createTask(
      conductor.id,
      'REFLECTION',
      {
        userMessage: message,
        context: {
          userId,
          relevantMemories: relevantMemories.map(m => m.id),
          userProfile: userProfile.id
        }
      },
      5 // High priority
    );

    // Mark task as running
    await agentService.updateTaskStatus(task.id, 'RUNNING');

    // Get response from conductor
    const response = await llmService.callGeminiConductor(messages);

    // Store new memory from this interaction
    const interactionEmbedding = await llmService.generateEmbedding(
      `User: ${message}\nAssistant: ${response.content}`
    );
    const metaVector = await llmService.generateMetaVector({
      userId,
      timestamp: new Date().toISOString(),
      messageType: 'chat_interaction',
      conductorId: conductor.id,
      taskId: task.id
    });

    await memoryService.addMemoryChunk(
      'episodic_stm', // Store chat interactions in episodic short-term memory
      `User: ${message}\nAssistant: ${response.content}`,
      interactionEmbedding,
      metaVector,
      'chat_interaction',
      conductor.id,
      {
        userId,
        taskId: task.id,
        userPersonality: userProfile.personalityType
      }
    );

    // Update task as completed
    await agentService.updateTaskStatus(task.id, 'COMPLETED', {
      response: response.content,
      tokensUsed: response.usage?.totalTokens || 0
    });

    // Update user skills based on interaction
    await learningService.updateUserSkill(
      userProfile.id,
      'conversation',
      'communication',
      0.1,
      true
    );

    // Schedule reflection if autonomy is enabled
    if (userProfile.autonomyEnabled && userProfile.autoReflection) {
      setTimeout(async () => {
        try {
          await reflectionService.scheduleReflection(
            ['episodic_stm', 'semantic_stm'],
            'shallow',
            [message.substring(0, 50)]
          );
        } catch (error) {
          console.error('Error scheduling reflection:', error);
        }
      }, 1000);
    }

    return NextResponse.json({
      response: response.content,
      taskId: task.id,
      memoryUpdated: true,
      relevantMemories: relevantMemories.length,
      metadata: {
        conductorUsed: conductor.name,
        tokensUsed: response.usage?.totalTokens || 0,
        personalityAdapted: userProfile.personalityType
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Streaming version of chat
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const message = searchParams.get('message');
  const userId = searchParams.get('userId') || 'default-user';

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  try {
    // Get conductor agent
    const conductor = await prisma.agent.findFirst({
      where: { 
        OR: [
          { type: 'CONDUCTOR' },
          { name: 'Sylvia Conductor' }
        ]
      }
    });

    if (!conductor) {
      return NextResponse.json({ error: 'Conductor agent not found' }, { status: 500 });
    }

    const messages: LLMMessage[] = [
      { role: 'system', content: conductor.systemPrompt },
      { role: 'user', content: message }
    ];

    // Get streaming response
    const stream = await llmService.streamGeminiConductor(messages);
    
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const reader = stream.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  controller.close();
                  return;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({content})}\n\n`));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Streaming chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
