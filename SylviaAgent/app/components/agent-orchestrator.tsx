
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Bot, 
  Brain, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock,
  Activity,
  Zap,
  Target,
  Settings,
  RefreshCw
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  type: 'CONDUCTOR' | 'SUBROUTINE';
  model: string;
  isActive: boolean;
  totalTasks: number;
  successRate: number;
  capabilities: string[];
}

interface AgentTask {
  id: string;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  priority: number;
  createdAt: string;
  agentName?: string;
}

interface AgentStats {
  totalAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  overallSuccessRate: number;
  agents: Agent[];
}

export function AgentOrchestrator() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showOrchestrate, setShowOrchestrate] = useState(false);
  const [orchestrationTask, setOrchestrationTask] = useState('');

  useEffect(() => {
    loadAgentsAndStats();
    loadTasks();
  }, []);

  const loadAgentsAndStats = async () => {
    try {
      const [agentsResponse, statsResponse] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/agents?stats=true')
      ]);

      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        setAgents(agentsData.agents || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to load agents and stats:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_pending_tasks' })
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const orchestrateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orchestrationTask.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'orchestrate',
          task: orchestrationTask,
          context: { timestamp: new Date().toISOString() }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setOrchestrationTask('');
        setShowOrchestrate(false);
        loadTasks();
        alert(`Task orchestrated successfully! Task ID: ${data.taskId}`);
      }
    } catch (error) {
      console.error('Failed to orchestrate task:', error);
      alert('Failed to orchestrate task');
    } finally {
      setIsLoading(false);
    }
  };

  const delegateTask = async (description: string, capabilities: string[]) => {
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delegate_task',
          description,
          requiredCapabilities: capabilities,
          input: { description, timestamp: new Date().toISOString() }
        })
      });

      if (response.ok) {
        const data = await response.json();
        loadTasks();
        alert(`Task delegated to ${data.agent.name}!`);
      }
    } catch (error) {
      console.error('Failed to delegate task:', error);
    }
  };

  const toggleAgent = async (agentId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_agent',
          agentId,
          isActive: !isActive
        })
      });

      if (response.ok) {
        loadAgentsAndStats();
      }
    } catch (error) {
      console.error('Failed to toggle agent:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-500';
      case 'FAILED': return 'text-red-500';
      case 'RUNNING': return 'text-blue-500';
      case 'PENDING': return 'text-yellow-500';
      default: return 'text-slate-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return CheckCircle;
      case 'FAILED': return XCircle;
      case 'RUNNING': return Activity;
      case 'PENDING': return Clock;
      default: return Clock;
    }
  };

  return (
    <div className="h-full flex bg-gradient-to-br from-gray-50 to-pastel-purple-50">
      {/* Sidebar - Agent List */}
      <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            Agent System
          </h2>
          <motion.button
            onClick={loadAgentsAndStats}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all duration-200"
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.3 }}
          >
            <RefreshCw className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="pastel-card p-4 text-center gradient-pastel-blue">
              <div className="text-2xl font-bold text-gray-800">{stats.totalAgents}</div>
              <div className="text-sm font-medium text-gray-600">Agents</div>
            </div>
            <div className="pastel-card p-4 text-center gradient-pastel-green">
              <div className="text-2xl font-bold text-gray-800">
                {Math.round(stats.overallSuccessRate * 100)}%
              </div>
              <div className="text-sm font-medium text-gray-600">Success</div>
            </div>
            <div className="pastel-card p-4 text-center gradient-pastel-purple">
              <div className="text-2xl font-bold text-gray-800">{stats.totalTasks}</div>
              <div className="text-sm font-medium text-gray-600">Total Tasks</div>
            </div>
            <div className="pastel-card p-4 text-center gradient-pastel-coral">
              <div className="text-2xl font-bold text-gray-800">{tasks.length}</div>
              <div className="text-sm font-medium text-gray-600">Pending</div>
            </div>
          </div>
        )}

        {/* Agent List */}
        <div className="space-y-3 mb-6">
          {agents.map((agent) => (
            <motion.div
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className={`pastel-card p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedAgent?.id === agent.id
                  ? 'bg-pastel-blue-100 border-2 border-pastel-blue-300 shadow-md'
                  : 'hover:bg-white/80'
              }`}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl ${
                    agent.type === 'CONDUCTOR' ? 'gradient-pastel-purple' : 'gradient-pastel-teal'
                  }`}>
                    {agent.type === 'CONDUCTOR' ? (
                      <Brain className="w-4 h-4 text-pastel-purple-600" />
                    ) : (
                      <Bot className="w-4 h-4 text-pastel-teal-600" />
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">{agent.name}</span>
                    <div className="text-xs text-gray-500 mt-1">{agent.type}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAgent(agent.id, agent.isActive);
                    }}
                    className={`p-2 rounded-xl transition-all duration-200 ${
                      agent.isActive 
                        ? 'bg-pastel-green-100 text-pastel-green-600 hover:bg-pastel-green-200' 
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {agent.isActive ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-pastel-blue-50 rounded-xl">
                  <div className="text-sm font-bold text-gray-800">{agent.totalTasks}</div>
                  <div className="text-xs text-gray-600">Tasks</div>
                </div>
                <div className="p-2 bg-pastel-green-50 rounded-xl">
                  <div className="text-sm font-bold text-gray-800">{Math.round(agent.successRate * 100)}%</div>
                  <div className="text-xs text-gray-600">Success</div>
                </div>
                <div className={`p-2 rounded-xl ${
                  agent.isActive ? 'bg-pastel-green-100' : 'bg-gray-100'
                }`}>
                  <div className={`text-xs font-medium ${
                    agent.isActive ? 'text-pastel-green-700' : 'text-gray-500'
                  }`}>
                    {agent.isActive ? 'ACTIVE' : 'IDLE'}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <motion.button
            onClick={() => setShowOrchestrate(true)}
            className="w-full flex items-center space-x-3 p-4 gradient-pastel-purple text-white rounded-2xl transition-all duration-200 hover:shadow-lg"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Zap className="w-5 h-5" />
            <span className="font-medium">Orchestrate Task</span>
          </motion.button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 bg-white/30 backdrop-blur-sm">
        {selectedAgent ? (
          <div className="space-y-6">
            {/* Agent Details */}
            <div className="pastel-card p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className={`p-4 rounded-2xl ${
                    selectedAgent.type === 'CONDUCTOR' ? 'gradient-pastel-purple' : 'gradient-pastel-teal'
                  }`}>
                    {selectedAgent.type === 'CONDUCTOR' ? (
                      <Brain className="w-8 h-8 text-pastel-purple-600" />
                    ) : (
                      <Bot className="w-8 h-8 text-pastel-teal-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">
                      {selectedAgent.name}
                    </h3>
                    <p className="text-gray-600 font-medium">
                      {selectedAgent.type} Agent • {selectedAgent.model}
                    </p>
                  </div>
                </div>
                
                <div className={`px-4 py-2 rounded-2xl text-sm font-medium ${
                  selectedAgent.isActive 
                    ? 'bg-pastel-green-100 text-pastel-green-700 border border-pastel-green-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}>
                  {selectedAgent.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="pastel-card p-6 text-center gradient-pastel-blue">
                  <div className="text-3xl font-bold text-gray-800">{selectedAgent.totalTasks}</div>
                  <div className="text-sm font-medium text-gray-600 mt-2">Total Tasks</div>
                </div>
                <div className="pastel-card p-6 text-center gradient-pastel-green">
                  <div className="text-3xl font-bold text-gray-800">
                    {Math.round(selectedAgent.successRate * 100)}%
                  </div>
                  <div className="text-sm font-medium text-gray-600 mt-2">Success Rate</div>
                </div>
                <div className="pastel-card p-6 text-center gradient-pastel-purple">
                  <div className="text-3xl font-bold text-gray-800">
                    {selectedAgent.capabilities?.length || 0}
                  </div>
                  <div className="text-sm font-medium text-gray-600 mt-2">Capabilities</div>
                </div>
              </div>

              {/* Capabilities */}
              {selectedAgent.capabilities && selectedAgent.capabilities.length > 0 && (
                <div>
                  <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-pastel-purple-600" />
                    Capabilities
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {selectedAgent.capabilities.map((capability, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-pastel-blue-100 text-pastel-blue-800 text-sm font-medium rounded-xl border border-pastel-blue-200"
                      >
                        {capability.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions for Selected Agent */}
            <div className="pastel-card p-8">
              <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-pastel-coral-600" />
                Quick Actions
              </h4>
              <div className="grid grid-cols-2 gap-6">
                <motion.button
                  onClick={() => delegateTask('Analyze recent data patterns', ['data_analysis'])}
                  className="p-6 gradient-pastel-blue text-gray-700 rounded-2xl transition-all duration-200 hover:shadow-lg"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Target className="w-6 h-6 mx-auto mb-3 text-pastel-blue-600" />
                  <div className="font-medium">Delegate Analysis</div>
                </motion.button>
                
                <motion.button
                  onClick={() => delegateTask('Generate summary report', ['content_creation'])}
                  className="p-6 gradient-pastel-green text-gray-700 rounded-2xl transition-all duration-200 hover:shadow-lg"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Settings className="w-6 h-6 mx-auto mb-3 text-pastel-green-600" />
                  <div className="font-medium">Create Content</div>
                </motion.button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center pastel-card p-8">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-bold text-gray-600 mb-2">Select an Agent</h3>
              <p className="text-gray-500">Choose an agent from the sidebar to view details and manage tasks</p>
            </div>
          </div>
        )}

        {/* Recent Tasks */}
        <div className="mt-6 pastel-card p-8">
          <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-pastel-teal-600" />
            Recent Tasks
          </h4>
          
          <div className="space-y-4">
            {tasks.slice(0, 5).map((task) => {
              const StatusIcon = getStatusIcon(task.status);
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-xl ${
                      task.status === 'COMPLETED' ? 'gradient-pastel-green' :
                      task.status === 'RUNNING' ? 'gradient-pastel-blue' :
                      task.status === 'FAILED' ? 'gradient-pastel-coral' :
                      'gradient-pastel-yellow'
                    }`}>
                      <StatusIcon className={`w-4 h-4 ${getStatusColor(task.status)}`} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">
                        {task.type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {task.agentName || 'Unknown Agent'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-sm font-medium px-3 py-1 rounded-xl ${
                      task.status === 'COMPLETED' ? 'bg-pastel-green-100 text-pastel-green-700' :
                      task.status === 'RUNNING' ? 'bg-pastel-blue-100 text-pastel-blue-700' :
                      task.status === 'FAILED' ? 'bg-pastel-coral-100 text-pastel-coral-700' :
                      'bg-pastel-yellow-100 text-pastel-yellow-700'
                    }`}>
                      {task.status}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Priority: {task.priority}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          
          {tasks.length === 0 && (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No recent tasks found</p>
            </div>
          )}
        </div>

        {/* Orchestration Modal */}
        <AnimatePresence>
          {showOrchestrate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowOrchestrate(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="pastel-card p-8 shadow-2xl max-w-md w-full"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center mb-6">
                  <div className="p-3 rounded-xl gradient-pastel-purple mr-4">
                    <Zap className="w-6 h-6 text-pastel-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      Orchestrate Multi-Agent Task
                    </h3>
                    <p className="text-gray-600">Coordinate multiple agents for complex tasks</p>
                  </div>
                </div>
                
                <form onSubmit={orchestrateTask} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Task Description
                    </label>
                    <textarea
                      value={orchestrationTask}
                      onChange={(e) => setOrchestrationTask(e.target.value)}
                      placeholder="Describe the complex task that requires multiple agents..."
                      rows={4}
                      className="w-full p-4 rounded-2xl border border-gray-200 bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pastel-purple-300 focus:border-pastel-purple-300 resize-none transition-all duration-200"
                      required
                    />
                  </div>
                  
                  <div className="flex space-x-4">
                    <motion.button
                      type="button"
                      onClick={() => setShowOrchestrate(false)}
                      className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 transition-all duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-3 px-4 gradient-pastel-purple hover:shadow-lg disabled:bg-gray-300 text-white rounded-2xl transition-all duration-200 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isLoading ? 'Orchestrating...' : 'Orchestrate'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
