// ===== MAMS CORE TYPES =====

// Memory System Types
export type MemoryBucketType = 'STM' | 'LTM' | 'RL' | 'DOCS' | 'MISC';

export const MEMORY_BUCKET_NAMES = [
  'semantic_stm',
  'semantic_ltm', 
  'procedural_stm',
  'procedural_ltm',
  'episodic_stm',
  'episodic_ltm',
  'diary_rl',
  'calendar_rl',
  'api_docs',
  'odds_ends'
] as const;

export type MemoryBucketName = typeof MEMORY_BUCKET_NAMES[number];

export interface MemoryChunk {
  id: string;
  bucketId: string;
  text: string;
  embedding: number[];
  metaVector: number[];
  score: number;
  timestamp: Date;
  lastAccessed: Date;
  source: string;
  agentId?: string;
  metadata: Record<string, any>;
  accessCount: number;
  decayRate: number;
}

export interface MemoryLink {
  id: string;
  sourceId: string;
  targetId: string;
  strength: number;
  linkType: 'semantic' | 'causal' | 'temporal' | 'associative';
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface MemoryReflection {
  id: string;
  chunkId: string;
  reflection: string;
  insights: any[];
  createdAt: Date;
  conductorId?: string;
}

// Agent System Types
export type AgentType = 'CONDUCTOR' | 'SUBROUTINE';
export type TaskType = 'REFLECTION' | 'SUBROUTINE' | 'BACKGROUND' | 'SCHEDULED';
export type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  model: string;
  apiKey?: string;
  prompt: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  capabilities: AgentCapability[];
  config: Record<string, any>;
  isActive: boolean;
  totalTasks: number;
  successRate: number;
  avgResponseTime: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  category: 'web' | 'analysis' | 'generation' | 'mcp';
  config: Record<string, any>;
  isEnabled: boolean;
  createdAt: Date;
}

export interface AgentTask {
  id: string;
  agentId: string;
  parentTaskId?: string;
  type: TaskType;
  status: TaskStatus;
  priority: number;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  scheduledFor?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Learning System Types
export type PersonalityType = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';

export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  personalityType?: PersonalityType;
  personalityScores: Record<string, number>;
  learningStyle?: string;
  preferences: Record<string, any>;
  autonomyLevel: number; // 1-5 scale
  autonomyEnabled: boolean;
  autoReflection: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSkill {
  id: string;
  profileId: string;
  name: string;
  category: string;
  level: number; // 1.0 - 10.0
  confidence: number;
  lastUpdated: Date;
  interactions: number;
  successes: number;
  failures: number;
}

export interface AgentRating {
  id: string;
  agentId: string;
  profileId?: string;
  messageId?: string;
  taskId?: string;
  rating: number; // 1-5 stars
  feedback?: string;
  category?: string;
  context: Record<string, any>;
  createdAt: Date;
}

// System Management Types
export interface CronJob {
  id: string;
  name: string;
  description: string;
  schedule: string; // Cron expression
  type: 'MEMORY_DECAY' | 'REFLECTION' | 'CLEANUP';
  config: Record<string, any>;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemSettings {
  id: string;
  key: string;
  value: any;
  description?: string;
  updatedAt: Date;
}

// API Types for LLM Integration
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  metadata?: Record<string, any>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Function Calling Types (from Gemini/OpenRouter)
export interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export interface FunctionResult {
  success: boolean;
  result?: any;
  error?: string;
}

// UI Component Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentId?: string;
  taskId?: string;
  metadata?: Record<string, any>;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'default' | 'success' | 'error' | 'warning';
}

// Jake's Laws Compliance Types
export interface ContextAwareRequest {
  input: string;
  context: {
    memoryContext: MemoryChunk[];
    userProfile: UserProfile;
    recentInteractions: ChatMessage[];
    activeAgents: Agent[];
  };
  explicitGoals: string[];
  qualityMetrics: {
    expectedAccuracy: number;
    responseTime: number;
    relevanceThreshold: number;
  };
}

// Memory Reflection System Types
export interface ReflectionRequest {
  triggerType: 'scheduled' | 'threshold' | 'user_request';
  memoryScope: MemoryBucketName[];
  reflectionDepth: 'shallow' | 'medium' | 'deep';
  focusAreas: string[];
}

export interface ReflectionResult {
  insights: string[];
  newConnections: MemoryLink[];
  recommendations: string[];
  confidenceScore: number;
}

// Autonomy System Types
export interface AutonomyConfig {
  level: number; // 1-5
  permissions: {
    createMemories: boolean;
    scheduleReflections: boolean;
    initiateSubroutines: boolean;
    modifyUserPreferences: boolean;
    accessExternalAPIs: boolean;
  };
  boundaries: {
    maxMemoryCreation: number;
    maxReflectionFrequency: string; // cron expression
    allowedCapabilities: string[];
  };
}

// Export commonly used constants
export const AGENT_MODELS = {
  CONDUCTOR: 'gemini-2.0-flash-exp',
  SUBROUTINE: 'gpt-4.1-mini'
} as const;

export const PERSONALITY_TRAITS = {
  RED: 'Decisive, results-oriented, competitive',
  BLUE: 'Analytical, precise, methodical', 
  GREEN: 'Supportive, stable, patient',
  YELLOW: 'Enthusiastic, optimistic, social'
} as const;

export const MEMORY_DECAY_RATES = {
  STM: 0.990, // Faster decay for short-term
  LTM: 0.999, // Slower decay for long-term  
  RL: 0.995   // Medium decay for reinforcement learning
} as const;