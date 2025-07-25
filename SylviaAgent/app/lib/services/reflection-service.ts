
import { 
  MemoryReflection, 
  ReflectionRequest, 
  ReflectionResult,
  MemoryBucketName 
} from '../types';
import { memoryService } from './memory-service';
import { prisma } from '../db-client';

export class ReflectionService {
  private static instance: ReflectionService;

  static getInstance(): ReflectionService {
    if (!ReflectionService.instance) {
      ReflectionService.instance = new ReflectionService();
    }
    return ReflectionService.instance;
  }

  // Generate memory reflection
  async generateReflection(
    request: ReflectionRequest,
    conductorId: string
  ): Promise<ReflectionResult> {
    try {
      // Get relevant memories from specified buckets
      const memories = await this.gatherMemoriesForReflection(request.memoryScope);
      
      // Analyze memories and generate insights
      const insights = await this.analyzeMemories(memories, request.reflectionDepth, request.focusAreas);
      
      // Find new connections between memories
      const newConnections = await this.discoverMemoryConnections(memories);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(insights, memories);
      
      // Save reflections to database
      await this.saveReflections(memories, insights, conductorId);
      
      return {
        insights,
        newConnections,
        recommendations,
        confidenceScore: this.calculateConfidenceScore(memories, insights)
      };
    } catch (error) {
      console.error('Error generating reflection:', error);
      return {
        insights: ['Error generating reflection insights'],
        newConnections: [],
        recommendations: ['Unable to generate recommendations at this time'],
        confidenceScore: 0
      };
    }
  }

  // Gather memories for reflection analysis
  private async gatherMemoriesForReflection(buckets: MemoryBucketName[]) {
    const allMemories = [];
    
    for (const bucket of buckets) {
      const memories = await memoryService.getMemoriesFromBucket(bucket, undefined, 50);
      allMemories.push(...memories);
    }
    
    // Sort by score and recency
    return allMemories
      .sort((a, b) => (b.score * 0.7 + (Date.now() - a.lastAccessed.getTime()) * 0.3) - 
                     (a.score * 0.7 + (Date.now() - b.lastAccessed.getTime()) * 0.3))
      .slice(0, 100); // Limit to top 100 memories
  }

  // Analyze memories to generate insights
  private async analyzeMemories(
    memories: any[],
    depth: 'shallow' | 'medium' | 'deep',
    focusAreas: string[]
  ): Promise<string[]> {
    const insights: string[] = [];
    
    // Pattern recognition analysis
    const patterns = this.identifyPatterns(memories);
    insights.push(...patterns);
    
    // Temporal analysis
    const temporalInsights = this.analyzeTemporalPatterns(memories);
    insights.push(...temporalInsights);
    
    // Topic clustering
    const topicInsights = this.analyzeTopicClusters(memories, focusAreas);
    insights.push(...topicInsights);
    
    // Depth-specific analysis
    if (depth === 'medium' || depth === 'deep') {
      const deeperInsights = this.performDeepAnalysis(memories);
      insights.push(...deeperInsights);
    }
    
    if (depth === 'deep') {
      const metacognitivInsights = this.performMetacognitiveAnalysis(memories);
      insights.push(...metacognitivInsights);
    }
    
    return insights.slice(0, depth === 'shallow' ? 5 : depth === 'medium' ? 10 : 15);
  }

  // Identify patterns in memories
  private identifyPatterns(memories: any[]): string[] {
    const patterns: string[] = [];
    
    // Frequency analysis
    const sourceFrequency = memories.reduce((acc, memory) => {
      acc[memory.source] = (acc[memory.source] || 0) + 1;
      return acc;
    }, {});
    
    const topSources = Object.entries(sourceFrequency)
      .sort(([,a], [,b]) => b as number - (a as number))
      .slice(0, 3);
    
    if (topSources.length > 0) {
      patterns.push(`Most active information sources: ${topSources.map(([source, count]) => `${source} (${count})`).join(', ')}`);
    }
    
    // Score patterns
    const highScoreMemories = memories.filter(m => m.score > 2.0);
    if (highScoreMemories.length > 0) {
      patterns.push(`${highScoreMemories.length} memories have been significantly reinforced through repeated access`);
    }
    
    return patterns;
  }

  // Analyze temporal patterns
  private analyzeTemporalPatterns(memories: any[]): string[] {
    const insights: string[] = [];
    
    // Group by time periods
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    const week = 7 * day;
    
    const recentMemories = memories.filter(m => now.getTime() - m.timestamp.getTime() < day);
    const weekMemories = memories.filter(m => now.getTime() - m.timestamp.getTime() < week);
    
    if (recentMemories.length > 0) {
      insights.push(`${recentMemories.length} new memories formed in the last 24 hours`);
    }
    
    if (weekMemories.length > recentMemories.length) {
      insights.push(`Memory formation has been consistent over the past week (${weekMemories.length - recentMemories.length} additional memories)`);
    }
    
    return insights;
  }

  // Analyze topic clusters
  private analyzeTopicClusters(memories: any[], focusAreas: string[]): string[] {
    const insights: string[] = [];
    
    // Simple keyword analysis (in production, this would use more sophisticated NLP)
    const keywordFreq = memories.reduce((acc, memory) => {
      const words = memory.text.toLowerCase().split(/\s+/);
      words.forEach((word: string) => {
        if (word.length > 3) { // Filter short words
          acc[word] = (acc[word] || 0) + 1;
        }
      });
      return acc;
    }, {});
    
    const topKeywords = Object.entries(keywordFreq)
      .sort(([,a], [,b]) => b as number - (a as number))
      .slice(0, 5);
    
    if (topKeywords.length > 0) {
      insights.push(`Dominant topics in memory: ${topKeywords.map(([word, count]) => `${word} (${count})`).join(', ')}`);
    }
    
    // Focus area analysis
    focusAreas.forEach(area => {
      const relatedMemories = memories.filter(m => 
        m.text.toLowerCase().includes(area.toLowerCase())
      );
      if (relatedMemories.length > 0) {
        insights.push(`${relatedMemories.length} memories relate to focus area: ${area}`);
      }
    });
    
    return insights;
  }

  // Perform deeper analysis
  private performDeepAnalysis(memories: any[]): string[] {
    const insights: string[] = [];
    
    // Access pattern analysis
    const accessPatterns: { text: string; accessCount: number }[] = memories.reduce((acc, memory) => {
      const accessFreq = memory.accessCount || 0;
      if (accessFreq > 1) {
        acc.push({ text: memory.text.substring(0, 50), accessCount: accessFreq });
      }
      return acc;
    }, [] as { text: string; accessCount: number }[]);
    
    if (accessPatterns.length > 0) {
      const mostAccessed = accessPatterns.sort((a, b) => b.accessCount - a.accessCount)[0];
      insights.push(`Most frequently accessed memory: "${mostAccessed.text}..." (${mostAccessed.accessCount} accesses)`);
    }
    
    // Decay resistance analysis
    const resistantMemories = memories.filter(m => m.score > 1.5 && m.accessCount > 2);
    if (resistantMemories.length > 0) {
      insights.push(`${resistantMemories.length} memories show strong resistance to decay, indicating high importance`);
    }
    
    return insights;
  }

  // Perform metacognitive analysis
  private performMetacognitiveAnalysis(memories: any[]): string[] {
    const insights: string[] = [];
    
    // Learning efficiency analysis
    const learningMemories = memories.filter(m => 
      m.source.includes('learning') || 
      m.metadata?.category === 'skill_development'
    );
    
    if (learningMemories.length > 0) {
      insights.push(`Learning-related memories comprise ${Math.round(learningMemories.length / memories.length * 100)}% of analyzed memories`);
    }
    
    // Knowledge consolidation patterns
    const consolidatedMemories = memories.filter(m => m.score > 2.0 && m.accessCount > 3);
    if (consolidatedMemories.length > 0) {
      insights.push(`${consolidatedMemories.length} memories show signs of knowledge consolidation through repeated reinforcement`);
    }
    
    return insights;
  }

  // Discover new connections between memories
  private async discoverMemoryConnections(memories: any[]) {
    const newConnections = [];
    
    // Simple similarity-based connection discovery
    for (let i = 0; i < memories.length - 1; i++) {
      for (let j = i + 1; j < memories.length && j < i + 10; j++) { // Limit comparisons
        const similarity = this.calculateTextSimilarity(memories[i].text, memories[j].text);
        
        if (similarity > 0.7) { // High similarity threshold
          // Check if connection already exists
          const existingLink = await prisma.memoryLink.findFirst({
            where: {
              OR: [
                { sourceId: memories[i].id, targetId: memories[j].id },
                { sourceId: memories[j].id, targetId: memories[i].id }
              ]
            }
          });
          
          if (!existingLink) {
            newConnections.push({
              id: `temp_${Date.now()}_${i}_${j}`,
              sourceId: memories[i].id,
              targetId: memories[j].id,
              strength: similarity,
              linkType: 'semantic' as const,
              metadata: { discoveredBy: 'reflection_service', similarity },
              createdAt: new Date()
            });
          }
        }
      }
    }
    
    return newConnections.slice(0, 10); // Limit new connections
  }

  // Simple text similarity calculation
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  // Generate recommendations based on insights
  private async generateRecommendations(insights: string[], memories: any[]): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Memory management recommendations
    const lowScoreMemories = memories.filter(m => m.score < 0.5);
    if (lowScoreMemories.length > 10) {
      recommendations.push('Consider reviewing and reinforcing important memories that are showing signs of decay');
    }
    
    // Learning recommendations
    const learningMemories = memories.filter(m => 
      m.text.includes('learn') || m.text.includes('study') || m.text.includes('practice')
    );
    if (learningMemories.length > 0) {
      recommendations.push('Continue reinforcing learning-related memories through active recall and application');
    }
    
    // Topic diversification
    const uniqueSources = new Set(memories.map(m => m.source));
    if (uniqueSources.size < 3) {
      recommendations.push('Consider diversifying information sources to build a more comprehensive knowledge base');
    }
    
    return recommendations.slice(0, 5);
  }

  // Save reflections to database
  private async saveReflections(memories: any[], insights: string[], conductorId: string): Promise<void> {
    // Save reflection for each analyzed memory
    const reflectionPromises = memories.slice(0, 20).map(memory => // Limit to top 20
      prisma.memoryReflection.create({
        data: {
          chunkId: memory.id,
          reflection: insights.join('; '),
          insights: insights,
          conductorId
        }
      })
    );
    
    await Promise.all(reflectionPromises);
  }

  // Calculate confidence score for reflection
  private calculateConfidenceScore(memories: any[], insights: string[]): number {
    let score = 0;
    
    // Base score on memory count
    score += Math.min(memories.length / 50, 1) * 0.3;
    
    // Base score on insight count
    score += Math.min(insights.length / 10, 1) * 0.3;
    
    // Base score on memory quality (average score)
    const avgMemoryScore = memories.reduce((sum, m) => sum + m.score, 0) / memories.length;
    score += Math.min(avgMemoryScore / 2, 1) * 0.4;
    
    return Math.min(score, 1);
  }

  // Get recent reflections
  async getRecentReflections(limit: number = 10): Promise<MemoryReflection[]> {
    const reflections = await prisma.memoryReflection.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        chunk: {
          include: {
            bucket: true
          }
        },
        conductor: true
      }
    });
    
    return reflections as MemoryReflection[];
  }

  // Schedule automated reflection
  async scheduleReflection(
    memoryScope: MemoryBucketName[],
    reflectionDepth: 'shallow' | 'medium' | 'deep' = 'medium',
    focusAreas: string[] = []
  ): Promise<string> {
    // Create a scheduled task for reflection
    const conductorAgent = await prisma.agent.findFirst({
      where: { type: 'CONDUCTOR' }
    });
    
    if (!conductorAgent) {
      throw new Error('No conductor agent found for reflection scheduling');
    }
    
    const task = await prisma.agentTask.create({
      data: {
        agentId: conductorAgent.id,
        type: 'REFLECTION',
        status: 'PENDING',
        priority: 3,
        input: {
          reflectionRequest: {
            triggerType: 'scheduled',
            memoryScope,
            reflectionDepth,
            focusAreas
          }
        },
        scheduledFor: new Date(Date.now() + 5 * 60 * 1000) // Schedule for 5 minutes from now
      }
    });
    
    return task.id;
  }
}

export const reflectionService = ReflectionService.getInstance();
