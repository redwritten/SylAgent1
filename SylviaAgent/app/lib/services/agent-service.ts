
import { Agent, AgentTask, AgentType, TaskType, TaskStatus, AGENT_MODELS } from '../types';
import { prisma } from '../db-client';

export class AgentService {
  private static instance: AgentService;

  static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  // Initialize default agents (1 Conductor + 10 Subroutines)
  async initializeDefaultAgents(): Promise<void> {
    // Create Gemini Conductor Agent
    const conductorExists = await prisma.agent.findFirst({
      where: { name: 'Sylvia Conductor' }
    });
    
    if (!conductorExists) {
      await prisma.agent.create({
        data: {
        name: 'Sylvia Conductor',
        type: 'CONDUCTOR',
        model: AGENT_MODELS.CONDUCTOR,
        prompt: `You are Sylvia, a sophisticated AI system that orchestrates multiple specialized agents and manages memory systems.

Your primary responsibilities:
1. Coordinate subroutine agents for complex tasks
2. Manage memory reflections and insights
3. Maintain context awareness across all interactions
4. Ensure Jake's Laws compliance in all operations
5. Balance user autonomy with system efficiency

Core Principles (Jake's Laws):
- Context awareness is paramount
- Quality over speed in all responses
- Explicit goals and clear reasoning
- Continuous learning and adaptation
- User-centric design and transparency

You have access to 10 specialized subroutine agents and a comprehensive memory system with 10 JSON buckets. Use them strategically to provide the best possible assistance.`,
        systemPrompt: 'You are Sylvia, the main conductor of the AI system. Coordinate agents, manage memory, and ensure high-quality interactions.',
        temperature: 0.7,
        maxTokens: 4000,
        capabilities: JSON.stringify([
          'memory_management',
          'agent_orchestration', 
          'reflection_generation',
          'context_synthesis',
          'task_delegation'
        ]),
        config: JSON.stringify({
          memoryAccessLevel: 'full',
          agentOrchestration: true,
          reflectionFrequency: 'high'
        })
        }
      });
    }

    // Create 10 OpenRouter Subroutine Agents
    const subroutineSpecs = [
      { name: 'Research Specialist', focus: 'web_search, data_analysis, fact_checking' },
      { name: 'Code Engineer', focus: 'code_generation, debugging, technical_analysis' },
      { name: 'Content Creator', focus: 'writing, editing, content_optimization' },
      { name: 'Data Analyst', focus: 'statistics, visualization, pattern_recognition' },
      { name: 'Web Specialist', focus: 'web_scraping, html_generation, seo_optimization' },
      { name: 'Problem Solver', focus: 'logical_reasoning, troubleshooting, solution_design' },
      { name: 'Learning Assistant', focus: 'education, explanation, skill_development' },
      { name: 'Creative Thinker', focus: 'brainstorming, innovation, design_thinking' },
      { name: 'Quality Assurance', focus: 'testing, validation, error_detection' },
      { name: 'Integration Expert', focus: 'api_integration, system_coordination, workflow_optimization' }
    ];

    for (const spec of subroutineSpecs) {
      const agentExists = await prisma.agent.findFirst({
        where: { name: spec.name }
      });
      
      if (!agentExists) {
        await prisma.agent.create({
          data: {
          name: spec.name,
          type: 'SUBROUTINE',
          model: AGENT_MODELS.SUBROUTINE,
          prompt: `You are ${spec.name}, a specialized subroutine agent in the MAMS system.

Your specialization: ${spec.focus}

Key Guidelines:
1. Focus on your area of expertise
2. Provide precise, high-quality outputs
3. Collaborate effectively with other agents
4. Maintain context awareness
5. Follow Jake's Laws principles

When called upon, deliver excellent results in your specialized domain while maintaining awareness of the broader system context.`,
          systemPrompt: `Specialized agent for: ${spec.focus}. Deliver expert-level results in your domain.`,
          temperature: 0.6,
          maxTokens: 2000,
          capabilities: JSON.stringify(spec.focus.split(', ')),
          config: JSON.stringify({
            specialization: spec.focus,
            memoryAccessLevel: 'limited',
            autonomyLevel: 2
          })
          }
        });
      }
    }
  }

  // Get all agents
  async getAllAgents(): Promise<Agent[]> {
    const agents = await prisma.agent.findMany({
      orderBy: [
        { type: 'asc' }, // Conductor first
        { name: 'asc' }
      ]
    });
    return agents.map(agent => ({
      ...agent,
      capabilities: Array.isArray(agent.capabilities) ? agent.capabilities : 
                   JSON.parse(agent.capabilities as string) || []
    })) as Agent[];
  }

  // Get agent by ID
  async getAgent(id: string): Promise<Agent | null> {
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        skills: true
      }
    });
    
    if (!agent) return null;
    
    return {
      ...agent,
      capabilities: Array.isArray(agent.capabilities) ? agent.capabilities : 
                   JSON.parse(agent.capabilities as string) || []
    } as Agent;
  }

  // Create new task
  async createTask(
    agentId: string,
    type: TaskType,
    input: Record<string, any>,
    priority: number = 1,
    parentTaskId?: string,
    scheduledFor?: Date
  ): Promise<AgentTask> {
    const task = await prisma.agentTask.create({
      data: {
        agentId,
        type,
        status: 'PENDING',
        priority,
        input,
        parentTaskId,
        scheduledFor
      }
    });

    return task as AgentTask;
  }

  // Update task status
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    output?: Record<string, any>,
    error?: string
  ): Promise<AgentTask> {
    const updateData: any = { 
      status,
      updatedAt: new Date()
    };

    if (status === 'RUNNING' && !await this.getTaskById(taskId).then(t => t?.startedAt)) {
      updateData.startedAt = new Date();
    }

    if (status === 'COMPLETED' || status === 'FAILED') {
      updateData.completedAt = new Date();
      if (output) updateData.output = output;
      if (error) updateData.error = error;
    }

    const task = await prisma.agentTask.update({
      where: { id: taskId },
      data: updateData
    });

    // Update agent metrics
    await this.updateAgentMetrics(task.agentId, status === 'COMPLETED');

    return task as AgentTask;
  }

  // Get task by ID
  async getTaskById(taskId: string): Promise<AgentTask | null> {
    const task = await prisma.agentTask.findUnique({
      where: { id: taskId },
      include: {
        agent: true,
        subTasks: true
      }
    });
    return task as AgentTask;
  }

  // Get pending tasks for agent
  async getPendingTasks(agentId?: string): Promise<AgentTask[]> {
    const tasks = await prisma.agentTask.findMany({
      where: {
        status: 'PENDING',
        ...(agentId && { agentId }),
        OR: [
          { scheduledFor: null },
          { scheduledFor: { lte: new Date() } }
        ]
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      include: {
        agent: true
      }
    });

    return tasks as AgentTask[];
  }

  // Delegate task to best suited agent
  async delegateTask(
    taskDescription: string,
    requiredCapabilities: string[],
    input: Record<string, any>,
    priority: number = 1
  ): Promise<{ agent: Agent; task: AgentTask }> {
    // Find best suited agent based on capabilities and current load
    const agents = await prisma.agent.findMany({
      where: {
        type: 'SUBROUTINE',
        isActive: true
      },
      include: {
        _count: {
          select: {
            tasks: {
              where: {
                status: { in: ['PENDING', 'RUNNING'] }
              }
            }
          }
        }
      }
    });

    // Score agents based on capability match and current load
    const scoredAgents = agents.map(agent => {
      const capabilities = Array.isArray(agent.capabilities) 
        ? agent.capabilities 
        : JSON.parse(agent.capabilities as string);
      
      const capabilityScore = requiredCapabilities.reduce((score, cap) => {
        return capabilities.includes(cap) ? score + 1 : score;
      }, 0) / requiredCapabilities.length;

      const loadScore = 1 / (agent._count.tasks + 1); // Lower load = higher score

      return {
        agent,
        score: capabilityScore * 0.7 + loadScore * 0.3
      };
    });

    // Select best agent
    const bestMatch = scoredAgents.sort((a, b) => b.score - a.score)[0];
    
    if (!bestMatch) {
      throw new Error('No suitable agent found for task delegation');
    }

    // Create task
    const task = await this.createTask(
      bestMatch.agent.id,
      'SUBROUTINE',
      { ...input, description: taskDescription, requiredCapabilities },
      priority
    );

    return {
      agent: {
        ...bestMatch.agent,
        capabilities: Array.isArray(bestMatch.agent.capabilities) ? bestMatch.agent.capabilities : 
                     JSON.parse(bestMatch.agent.capabilities as string) || []
      } as Agent,
      task
    };
  }

  // Update agent performance metrics
  private async updateAgentMetrics(agentId: string, success: boolean): Promise<void> {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) return;

    const newTotalTasks = agent.totalTasks + 1;
    const successCount = Math.round(agent.successRate * agent.totalTasks) + (success ? 1 : 0);
    const newSuccessRate = successCount / newTotalTasks;

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        totalTasks: newTotalTasks,
        successRate: newSuccessRate
      }
    });
  }

  // Get agent performance stats
  async getAgentStats(): Promise<Record<string, any>> {
    const agents = await prisma.agent.findMany({
      include: {
        _count: {
          select: {
            tasks: true
          }
        }
      }
    });

    const totalTasks = await prisma.agentTask.count();
    const completedTasks = await prisma.agentTask.count({
      where: { status: 'COMPLETED' }
    });
    const failedTasks = await prisma.agentTask.count({
      where: { status: 'FAILED' }
    });

    return {
      totalAgents: agents.length,
      totalTasks,
      completedTasks,
      failedTasks,
      overallSuccessRate: completedTasks / (completedTasks + failedTasks),
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        totalTasks: agent._count.tasks,
        successRate: agent.successRate,
        isActive: agent.isActive,
        capabilities: Array.isArray(agent.capabilities) ? agent.capabilities : 
                     JSON.parse(agent.capabilities as string) || []
      }))
    };
  }

  // Execute agent task orchestration
  async orchestrateTask(
    conductorId: string,
    mainTask: string,
    context: Record<string, any> = {}
  ): Promise<{ taskId: string; result?: any; error?: string }> {
    try {
      // Create main task for conductor
      const task = await this.createTask(
        conductorId,
        'REFLECTION',
        {
          mainTask,
          context,
          orchestrationType: 'multi_agent'
        },
        5 // High priority
      );

      // Mark as running
      await this.updateTaskStatus(task.id, 'RUNNING');

      // This would trigger the actual LLM execution
      // For now, we'll mark as completed with a placeholder
      await this.updateTaskStatus(task.id, 'COMPLETED', {
        message: 'Task orchestration initiated',
        subtasks: []
      });

      return { taskId: task.id };
    } catch (error) {
      return { 
        taskId: '', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export const agentService = AgentService.getInstance();
