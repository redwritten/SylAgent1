
import { LLMMessage, LLMResponse, FunctionCall, FunctionResult } from '../types';

interface APIKeyHealth {
  key: string;
  isHealthy: boolean;
  lastUsed: number;
  errorCount: number;
  lastError?: string;
}

export class LLMService {
  private static instance: LLMService;
  
  // Gemini API key for conductor
  private geminiApiKey: string;
  
  // OpenRouter keys allocated for different purposes
  private memoryKeys: APIKeyHealth[];
  private subroutineKeys: APIKeyHealth[];
  
  // Key rotation counters
  private memoryKeyIndex: number = 0;
  private subroutineKeyIndex: number = 0;

  private constructor() {
    // Gemini API key for conductor
    this.geminiApiKey = 'AIzaSyC4S_l-EbvbvQsLMZAt2wGAhQEvRgg9ado';
    
    // 10 OpenRouter keys for memory operations
    const memoryApiKeys = [
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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'
    ];
    
    // 15 OpenRouter keys for subroutine operations
    const subroutineApiKeys = [
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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'
    ];
    
    // Initialize key health tracking
    this.memoryKeys = memoryApiKeys.map(key => ({
      key,
      isHealthy: true,
      lastUsed: 0,
      errorCount: 0
    }));
    
    this.subroutineKeys = subroutineApiKeys.map(key => ({
      key,
      isHealthy: true,
      lastUsed: 0,
      errorCount: 0
    }));
  }

  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  // Get next healthy memory key with load balancing
  private getNextMemoryKey(): string {
    const healthyKeys = this.memoryKeys.filter(k => k.isHealthy);
    if (healthyKeys.length === 0) {
      // Reset all keys if none are healthy
      this.memoryKeys.forEach(k => {
        k.isHealthy = true;
        k.errorCount = 0;
      });
      return this.memoryKeys[0].key;
    }
    
    const key = healthyKeys[this.memoryKeyIndex % healthyKeys.length];
    this.memoryKeyIndex = (this.memoryKeyIndex + 1) % healthyKeys.length;
    key.lastUsed = Date.now();
    return key.key;
  }

  // Get next healthy subroutine key with load balancing
  private getNextSubroutineKey(): string {
    const healthyKeys = this.subroutineKeys.filter(k => k.isHealthy);
    if (healthyKeys.length === 0) {
      // Reset all keys if none are healthy
      this.subroutineKeys.forEach(k => {
        k.isHealthy = true;
        k.errorCount = 0;
      });
      return this.subroutineKeys[0].key;
    }
    
    const key = healthyKeys[this.subroutineKeyIndex % healthyKeys.length];
    this.subroutineKeyIndex = (this.subroutineKeyIndex + 1) % healthyKeys.length;
    key.lastUsed = Date.now();
    return key.key;
  }

  // Mark key as unhealthy
  private markKeyUnhealthy(apiKey: string, error: string) {
    const memoryKey = this.memoryKeys.find(k => k.key === apiKey);
    const subroutineKey = this.subroutineKeys.find(k => k.key === apiKey);
    
    if (memoryKey) {
      memoryKey.errorCount++;
      memoryKey.lastError = error;
      if (memoryKey.errorCount >= 3) {
        memoryKey.isHealthy = false;
      }
    }
    
    if (subroutineKey) {
      subroutineKey.errorCount++;
      subroutineKey.lastError = error;
      if (subroutineKey.errorCount >= 3) {
        subroutineKey.isHealthy = false;
      }
    }
  }

  // Get key health status
  getKeyHealthStatus() {
    return {
      gemini: { isHealthy: true, key: 'gemini-2.5-pro' },
      memory: this.memoryKeys.map(k => ({
        isHealthy: k.isHealthy,
        errorCount: k.errorCount,
        lastUsed: k.lastUsed,
        lastError: k.lastError
      })),
      subroutine: this.subroutineKeys.map(k => ({
        isHealthy: k.isHealthy,
        errorCount: k.errorCount,
        lastUsed: k.lastUsed,
        lastError: k.lastError
      }))
    };
  }

  // Call Gemini Conductor (using Gemini API directly)
  async callGeminiConductor(
    messages: LLMMessage[],
    functions?: FunctionCall[],
    temperature: number = 0.7,
    maxTokens: number = 4000
  ): Promise<LLMResponse> {
    try {
      // Convert messages to Gemini format
      const contents = messages.map(msg => {
        if (msg.role === 'system') {
          return {
            role: 'user',
            parts: [{ text: `System: ${msg.content}` }]
          };
        }
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        };
      });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            candidateCount: 1
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error! status: ${response.status}, details: ${errorText}`);
      }

      const data = await response.json();
      
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      return {
        content,
        metadata: {
          model: 'gemini-2.5-pro',
          usage: {
            promptTokens: data.usageMetadata?.promptTokenCount || 0,
            completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata?.totalTokenCount || 0
          }
        },
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0
        }
      };
    } catch (error) {
      console.error('Error calling Gemini conductor:', error);
      throw error;
    }
  }

  // Call OpenRouter Subroutine Agent (using OpenRouter API)
  async callOpenRouterAgent(
    messages: LLMMessage[],
    temperature: number = 0.6,
    maxTokens: number = 2000,
    isMemoryOperation: boolean = false
  ): Promise<LLMResponse> {
    const apiKey = isMemoryOperation ? this.getNextMemoryKey() : this.getNextSubroutineKey();
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://sylvia-ai.app',
          'X-Title': 'Sylvia AI System'
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          temperature,
          max_tokens: maxTokens,
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.markKeyUnhealthy(apiKey, `HTTP ${response.status}: ${errorText}`);
        throw new Error(`OpenRouter API error! status: ${response.status}, details: ${errorText}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0]?.message?.content || '',
        metadata: {
          model: 'openai/gpt-4o-mini',
          usage: data.usage,
          keyType: isMemoryOperation ? 'memory' : 'subroutine'
        },
        usage: data.usage
      };
    } catch (error) {
      console.error('Error calling OpenRouter agent:', error);
      this.markKeyUnhealthy(apiKey, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // Streaming version for conductor
  async streamGeminiConductor(
    messages: LLMMessage[],
    temperature: number = 0.7,
    maxTokens: number = 4000
  ): Promise<ReadableStream> {
    try {
      // Convert messages to Gemini format
      const contents = messages.map(msg => {
        if (msg.role === 'system') {
          return {
            role: 'user',
            parts: [{ text: `System: ${msg.content}` }]
          };
        }
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        };
      });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            candidateCount: 1
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini streaming API error! status: ${response.status}, details: ${errorText}`);
      }

      // Transform Gemini streaming format to OpenAI-compatible format
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const reader = response.body!.getReader();
            const decoder = new TextDecoder();

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.trim() && line.startsWith('{')) {
                  try {
                    const parsed = JSON.parse(line);
                    const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (content) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        choices: [{
                          delta: { content }
                        }]
                      })}\n\n`));
                    }
                  } catch (e) {
                    // Skip invalid JSON
                  }
                }
              }
            }
            
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Gemini streaming error:', error);
            controller.error(error);
          }
        }
      });

      return readable;
    } catch (error) {
      console.error('Error streaming Gemini conductor:', error);
      throw error;
    }
  }

  // Generate embedding (mock implementation - in production would use actual embedding service)
  async generateEmbedding(text: string): Promise<number[]> {
    // This is a mock implementation
    // In production, you'd use a proper embedding service like OpenAI embeddings
    const hash = this.simpleHash(text);
    const embedding = [];
    
    // Generate a 384-dimensional vector based on text hash
    for (let i = 0; i < 384; i++) {
      embedding.push(Math.sin(hash + i) * 0.5 + Math.cos(hash * i) * 0.5);
    }
    
    return this.normalizeVector(embedding);
  }

  // Generate meta vector for metadata analysis
  async generateMetaVector(metadata: Record<string, any>): Promise<number[]> {
    const metaString = JSON.stringify(metadata);
    return this.generateEmbedding(metaString);
  }

  // Simple hash function for mock embedding
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  // Normalize vector to unit length
  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? vector.map(val => val / norm) : vector;
  }

  // Execute function call
  async executeFunction(functionCall: FunctionCall): Promise<FunctionResult> {
    try {
      switch (functionCall.name) {
        case 'search_web':
          return await this.searchWeb(functionCall.arguments);
        case 'analyze_data':
          return await this.analyzeData(functionCall.arguments);
        case 'generate_code':
          return await this.generateCode(functionCall.arguments);
        default:
          return {
            success: false,
            error: `Unknown function: ${functionCall.name}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Mock web search function
  private async searchWeb(args: Record<string, any>): Promise<FunctionResult> {
    // This would integrate with actual search APIs like Tavily
    return {
      success: true,
      result: {
        query: args.query,
        results: [
          {
            title: `Search results for: ${args.query}`,
            url: 'https://example.com',
            content: `Mock search results for query: ${args.query}`
          }
        ]
      }
    };
  }

  // Mock data analysis function
  private async analyzeData(args: Record<string, any>): Promise<FunctionResult> {
    return {
      success: true,
      result: {
        analysis: `Data analysis for: ${JSON.stringify(args)}`,
        insights: ['Mock insight 1', 'Mock insight 2'],
        recommendations: ['Mock recommendation 1']
      }
    };
  }

  // Mock code generation function
  private async generateCode(args: Record<string, any>): Promise<FunctionResult> {
    return {
      success: true,
      result: {
        language: args.language || 'javascript',
        code: `// Generated code for: ${args.description}\nconsole.log('Hello, Sylvia!');`,
        explanation: `This code demonstrates: ${args.description}`
      }
    };
  }

  // Health check for API connectivity
  async healthCheck(): Promise<{ gemini: boolean; openrouter: boolean; overall: boolean }> {
    const results = {
      gemini: false,
      openrouter: false,
      overall: false
    };

    try {
      // Test Gemini conductor
      const geminiResponse = await this.callGeminiConductor([
        { role: 'user', content: 'Hello, respond with "OK" if you can hear me.' }
      ]);
      results.gemini = geminiResponse.content.includes('OK');
    } catch (error) {
      console.error('Gemini health check failed:', error);
    }

    try {
      // Test OpenRouter subroutine
      const openrouterResponse = await this.callOpenRouterAgent([
        { role: 'user', content: 'Hello, respond with "OK" if you can hear me.' }
      ]);
      results.openrouter = openrouterResponse.content.includes('OK');
    } catch (error) {
      console.error('OpenRouter health check failed:', error);
    }

    results.overall = results.gemini && results.openrouter;
    return results;
  }
}

export const llmService = LLMService.getInstance();
