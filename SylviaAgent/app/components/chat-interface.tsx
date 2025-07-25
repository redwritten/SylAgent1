
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User, 
  Brain, 
  Loader2, 
  Star,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Clock,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Activity,
  Zap,
  CheckCircle,
  AlertCircle,
  Database,
  Users,
  Target,
  TrendingUp
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentId?: string;
  taskId?: string;
  metadata?: Record<string, any>;
}

interface AgentActivity {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'working';
  currentTask?: string;
  tasksCompleted: number;
  successRate: number;
  lastActivity: Date;
}

interface MemoryBucket {
  name: string;
  count: number;
  lastUpdated: Date;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome to Sylvia! I am your AI Conductor, ready to orchestrate multiple agents and manage your memory system. How can I assist you today?',
      timestamp: new Date(),
      metadata: { conductorInitialized: true }
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [agentActivities, setAgentActivities] = useState<AgentActivity[]>([]);
  const [memoryBuckets, setMemoryBuckets] = useState<MemoryBucket[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadAgentActivities = async () => {
    try {
      const response = await fetch('/api/agents?stats=true');
      if (response.ok) {
        const data = await response.json();
        const activities: AgentActivity[] = (data.agents || []).map((agent: any, index: number) => {
          // Use deterministic values based on agent properties to avoid hydration issues
          const hash = agent.name.length + index;
          const isWorking = agent.isActive && (hash % 3 === 0);
          const hasTask = agent.isActive && (hash % 2 === 0);
          const taskIndex = hash % 4;
          const timeOffset = (hash * 12345) % 300000; // Deterministic time offset
          
          return {
            id: agent.id,
            name: agent.name,
            status: agent.isActive ? (isWorking ? 'working' : 'active') : 'idle',
            currentTask: hasTask ? 
              ['Analyzing data patterns', 'Processing user query', 'Generating content', 'Memory reflection'][taskIndex] : 
              undefined,
            tasksCompleted: agent.totalTasks || 0,
            successRate: agent.successRate || 0,
            lastActivity: new Date(Date.now() - timeOffset)
          };
        });
        setAgentActivities(activities);
      }
    } catch (error) {
      console.error('Failed to load agent activities:', error);
    }
  };

  const loadMemoryBuckets = async () => {
    try {
      const response = await fetch('/api/memory?action=get_buckets');
      if (response.ok) {
        const data = await response.json();
        const buckets: MemoryBucket[] = (data.buckets || []).map((bucket: any) => ({
          name: bucket.name?.replace(/_/g, ' ').toUpperCase() || 'Unknown',
          count: bucket.chunkCount || 0,
          lastUpdated: new Date(bucket.lastUpdated || Date.now())
        }));
        setMemoryBuckets(buckets);
      }
    } catch (error) {
      console.error('Failed to load memory buckets:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  useEffect(() => {
    // Delay initial load slightly to avoid hydration issues
    const timer = setTimeout(() => {
      loadAgentActivities();
      loadMemoryBuckets();
    }, 100);
    
    // Refresh agent activities every 10 seconds
    const interval = setInterval(() => {
      loadAgentActivities();
    }, 10000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input.trim(),
          userId: 'default-user'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        taskId: data.taskId,
        metadata: data.metadata
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
        metadata: { error: true }
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const rateMessage = async (messageId: string, rating: number) => {
    try {
      await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_rating',
          agentId: 'conductor', // Would be actual agent ID
          rating,
          messageId,
          category: 'helpfulness'
        })
      });
    } catch (error) {
      console.error('Failed to rate message:', error);
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div className="h-full flex bg-gradient-to-br from-gray-50 to-pastel-purple-50">
      {/* Left Sidebar - Memory Buckets */}
      <AnimatePresence>
        {leftSidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-80 bg-white/80 backdrop-blur-sm border-r border-gray-100 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Memory Buckets</h3>
              <motion.button
                onClick={() => setLeftSidebarOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="space-y-3">
              {memoryBuckets.map((bucket, index) => (
                <motion.div
                  key={bucket.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="pastel-card p-4 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl gradient-pastel-purple">
                        <Database className="w-4 h-4 text-pastel-purple-600" />
                      </div>
                      <span className="font-medium text-gray-800 text-sm">{bucket.name}</span>
                    </div>
                    <span className="text-2xl font-bold text-pastel-purple-600">{bucket.count}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Updated {bucket.lastUpdated.toLocaleDateString()}
                  </div>
                </motion.div>
              ))}
            </div>

            {memoryBuckets.length === 0 && (
              <div className="text-center py-8">
                <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Loading memory buckets...</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white/70 backdrop-blur-sm">
        {/* Chat Header */}
        <div className="flex-shrink-0 px-8 py-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {!leftSidebarOpen && (
                <motion.button
                  onClick={() => setLeftSidebarOpen(true)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all duration-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Menu className="w-5 h-5" />
                </motion.button>
              )}
              
              <div className="relative p-3 rounded-2xl gradient-pastel-blue">
                <Brain className="w-8 h-8 text-pastel-blue-600" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-pastel-pink-300 rounded-full animate-pulse shadow-sm" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Sylvia Chat
                </h2>
                <p className="text-gray-600 font-medium">
                  Powered by Gemini 2.5 Pro + OpenRouter Agents
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 px-4 py-2 bg-pastel-purple-100 rounded-xl">
                <Clock className="w-5 h-5 text-pastel-purple-600" />
                <span className="text-pastel-purple-700 font-medium">Context-Aware Memory</span>
              </div>
              
              {!rightSidebarOpen && (
                <motion.button
                  onClick={() => setRightSidebarOpen(true)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all duration-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Activity className="w-5 h-5" />
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={`flex items-start space-x-4 ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                  message.role === 'user' 
                    ? 'gradient-pastel-blue' 
                    : message.role === 'system'
                    ? 'gradient-pastel-purple'
                    : 'gradient-pastel-teal'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 text-pastel-blue-600" />
                  ) : message.role === 'system' ? (
                    <Brain className="w-5 h-5 text-pastel-purple-600" />
                  ) : (
                    <Bot className="w-5 h-5 text-pastel-teal-600" />
                  )}
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-3xl ${
                  message.role === 'user' ? 'text-right' : ''
                }`}>
                  <div className={`inline-block px-6 py-4 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${
                    message.role === 'user'
                      ? 'gradient-pastel-blue text-gray-700 border border-pastel-blue-200'
                      : message.role === 'system'
                      ? 'bg-pastel-purple-100 text-pastel-purple-800 border border-pastel-purple-200'
                      : 'bg-white text-gray-800 border border-gray-100'
                  }`}>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    
                    {/* Metadata */}
                    {message.metadata && (
                      <div className="mt-3 pt-3 border-t border-gray-200 text-sm opacity-80">
                        {message.metadata.conductorUsed && (
                          <span className="px-2 py-1 bg-pastel-yellow-100 text-pastel-yellow-700 rounded-lg text-xs font-medium mr-2">
                            Agent: {message.metadata.conductorUsed}
                          </span>
                        )}
                        {message.metadata.tokensUsed && (
                          <span className="px-2 py-1 bg-pastel-coral-100 text-pastel-coral-700 rounded-lg text-xs font-medium">
                            Tokens: {message.metadata.tokensUsed}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Message Actions */}
                  {message.role === 'assistant' && (
                    <div className="flex items-center space-x-2 mt-3">
                      <motion.button
                        onClick={() => copyToClipboard(message.content)}
                        className="p-2 text-gray-400 hover:text-pastel-blue-600 hover:bg-pastel-blue-50 rounded-xl transition-all duration-200"
                        title="Copy message"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Copy className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        onClick={() => rateMessage(message.id, 5)}
                        className="p-2 text-gray-400 hover:text-pastel-green-600 hover:bg-pastel-green-50 rounded-xl transition-all duration-200"
                        title="Rate positive"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        onClick={() => rateMessage(message.id, 2)}
                        className="p-2 text-gray-400 hover:text-pastel-pink-600 hover:bg-pastel-pink-50 rounded-xl transition-all duration-200"
                        title="Rate negative"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </motion.button>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className={`text-sm text-gray-500 mt-2 font-medium ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Streaming Message */}
          {isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex items-start space-x-4"
            >
              <div className="w-12 h-12 rounded-2xl gradient-pastel-teal flex items-center justify-center shadow-sm">
                <Bot className="w-5 h-5 text-pastel-teal-600" />
              </div>
              <div className="flex-1 max-w-3xl">
                <div className="inline-block px-6 py-4 rounded-2xl bg-white text-gray-800 border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 animate-spin text-pastel-purple-500" />
                    <span className="text-lg font-medium">Sylvia is thinking...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 border-t border-gray-100 px-8 py-6 bg-white/80 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="flex items-end space-x-4">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask anything... I'll coordinate the best agents to help you."
                disabled={isStreaming}
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pastel-purple-300 focus:border-pastel-purple-300 resize-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium text-lg transition-all duration-200"
                rows={1}
                style={{ minHeight: '60px', maxHeight: '200px' }}
              />
            </div>
            <motion.button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="flex-shrink-0 w-14 h-14 gradient-pastel-purple hover:shadow-lg disabled:bg-gray-300 text-white rounded-2xl flex items-center justify-center transition-all duration-200 disabled:cursor-not-allowed shadow-sm"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              {isStreaming ? (
                <Loader2 className="w-6 h-6 animate-spin text-pastel-purple-600" />
              ) : (
                <Send className="w-6 h-6 text-pastel-purple-600" />
              )}
            </motion.button>
          </form>
          
          <div className="mt-4 text-sm text-gray-500 text-center font-medium">
            Messages are stored in episodic memory and analyzed for continuous learning
          </div>
        </div>
      </div>

      {/* Right Sidebar - Agent Activities */}
      <AnimatePresence>
        {rightSidebarOpen && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-96 bg-white/80 backdrop-blur-sm border-l border-gray-100 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Agent Activity</h3>
              <motion.button
                onClick={() => setRightSidebarOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="pastel-card p-4 text-center gradient-pastel-teal">
                <div className="text-2xl font-bold text-gray-800">{agentActivities.filter(a => a.status === 'active' || a.status === 'working').length}</div>
                <div className="text-sm font-medium text-gray-600">Active Agents</div>
              </div>
              <div className="pastel-card p-4 text-center gradient-pastel-green">
                <div className="text-2xl font-bold text-gray-800">{agentActivities.reduce((sum, a) => sum + a.tasksCompleted, 0)}</div>
                <div className="text-sm font-medium text-gray-600">Tasks Done</div>
              </div>
            </div>

            {/* Agent List */}
            <div className="space-y-3">
              {agentActivities.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="pastel-card p-4 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-xl ${
                        agent.status === 'working' ? 'gradient-pastel-orange animate-pulse' :
                        agent.status === 'active' ? 'gradient-pastel-green' :
                        'gradient-pastel-gray'
                      }`}>
                        {agent.status === 'working' ? (
                          <Zap className="w-4 h-4 text-pastel-orange-600" />
                        ) : agent.status === 'active' ? (
                          <CheckCircle className="w-4 h-4 text-pastel-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 text-sm">{agent.name}</div>
                        <div className={`text-xs font-medium ${
                          agent.status === 'working' ? 'text-pastel-orange-600' :
                          agent.status === 'active' ? 'text-pastel-green-600' :
                          'text-gray-400'
                        }`}>
                          {agent.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-pastel-purple-600">{Math.round(agent.successRate * 100)}%</div>
                      <div className="text-xs text-gray-500">Success</div>
                    </div>
                  </div>

                  {agent.currentTask && (
                    <div className="mb-3 p-3 bg-pastel-yellow-50 rounded-xl border border-pastel-yellow-200">
                      <div className="text-xs font-medium text-pastel-yellow-700 mb-1">Current Task</div>
                      <div className="text-sm text-pastel-yellow-800">{agent.currentTask}</div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Tasks: {agent.tasksCompleted}</span>
                    <span>Last: {agent.lastActivity.toLocaleTimeString()}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {agentActivities.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Loading agent activities...</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
