
import { NextRequest, NextResponse } from 'next/server';
import { agentService } from '@/lib/services/agent-service';
import { llmService } from '@/lib/services/llm-service';
import { prisma } from '@/lib/db-client';

export const dynamic = 'force-dynamic';

// Get agents and their status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('agentId');
    const includeStats = searchParams.get('stats') === 'true';

    if (agentId) {
      // Get specific agent
      const agent = await agentService.getAgent(agentId);
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      return NextResponse.json(agent);
    }

    if (includeStats) {
      // Get agent statistics
      const stats = await agentService.getAgentStats();
      return NextResponse.json(stats);
    }

    // Get all agents
    const agents = await agentService.getAllAgents();
    return NextResponse.json({ agents });

  } catch (error) {
    console.error('Agents GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Create new task or orchestrate multi-agent task
export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'create_task':
        if (!data.agentId || !data.type || !data.input) {
          return NextResponse.json({ 
            error: 'agentId, type, and input are required for task creation' 
          }, { status: 400 });
        }
        
        result = await agentService.createTask(
          data.agentId,
          data.type,
          data.input,
          data.priority || 1,
          data.parentTaskId,
          data.scheduledFor ? new Date(data.scheduledFor) : undefined
        );
        break;

      case 'delegate_task':
        if (!data.description || !data.requiredCapabilities) {
          return NextResponse.json({ 
            error: 'description and requiredCapabilities are required for task delegation' 
          }, { status: 400 });
        }
        
        result = await agentService.delegateTask(
          data.description,
          data.requiredCapabilities,
          data.input || {},
          data.priority || 1
        );
        break;

      case 'orchestrate':
        if (!data.task) {
          return NextResponse.json({ error: 'task is required for orchestration' }, { status: 400 });
        }
        
        // Get conductor agent  
        const conductor = await prisma.agent.findFirst({
          where: { type: 'CONDUCTOR' }
        });
        
        if (!conductor) {
          return NextResponse.json({ error: 'Conductor agent not found' }, { status: 500 });
        }
        
        result = await agentService.orchestrateTask(
          conductor.id,
          data.task,
          data.context || {}
        );
        break;

      case 'initialize':
        await agentService.initializeDefaultAgents();
        result = { success: true, message: 'Default agents initialized' };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Agents POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Update task status or agent configuration
export async function PUT(request: NextRequest) {
  try {
    const { action, taskId, agentId, ...data } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'update_task_status':
        if (!taskId || !data.status) {
          return NextResponse.json({ 
            error: 'taskId and status are required for task status update' 
          }, { status: 400 });
        }
        
        result = await agentService.updateTaskStatus(
          taskId,
          data.status,
          data.output,
          data.error
        );
        break;

      case 'update_agent':
        if (!agentId) {
          return NextResponse.json({ error: 'agentId is required for agent update' }, { status: 400 });
        }
        
        // Update agent configuration
        result = await prisma.agent.update({
          where: { id: agentId },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.prompt && { prompt: data.prompt }),
            ...(data.systemPrompt && { systemPrompt: data.systemPrompt }),
            ...(data.temperature !== undefined && { temperature: data.temperature }),
            ...(data.maxTokens !== undefined && { maxTokens: data.maxTokens }),
            ...(data.capabilities && { capabilities: JSON.stringify(data.capabilities) }),
            ...(data.config && { config: JSON.stringify(data.config) }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
            updatedAt: new Date()
          }
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Agents PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get pending tasks
export async function PATCH(request: NextRequest) {
  try {
    const { action, agentId } = await request.json();

    if (action === 'get_pending_tasks') {
      const tasks = await agentService.getPendingTasks(agentId);
      return NextResponse.json({ tasks });
    }

    if (action === 'health_check') {
      const healthy = await llmService.healthCheck();
      return NextResponse.json({ 
        healthy, 
        timestamp: new Date().toISOString(),
        services: {
          llm: healthy,
          database: true, // If we got here, DB is working
          agents: true
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Agents PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
