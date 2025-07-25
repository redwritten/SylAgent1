
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Users, 
  Database, 
  MessageSquare, 
  TrendingUp, 
  Settings, 
  Activity,
  Sparkles,
  Clock,
  Target
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ChatInterface } from './chat-interface';
import { MemoryViewer } from './memory-viewer';
import { AgentOrchestrator } from './agent-orchestrator';
import { LearningDashboard } from './learning-dashboard';
import { ReflectionViewer } from './reflection-viewer';
import { SystemStatus } from './system-status';

type Tab = 'chat' | 'memory' | 'agents' | 'learning' | 'reflection' | 'settings';

export function SylviaDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [systemInitialized, setSystemInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize Sylvia system on first load
  useEffect(() => {
    const initializeSystem = async () => {
      if (systemInitialized || isInitializing) return;
      
      setIsInitializing(true);
      try {
        // Initialize memory buckets
        await fetch('/api/memory', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'initialize' })
        });

        // Initialize agents
        await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'initialize' })
        });

        // Create default user profile
        await fetch('/api/learning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_profile', name: 'Sylvia User' })
        });

        setSystemInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Sylvia system:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeSystem();
  }, [systemInitialized, isInitializing]);

  const tabs = [
    { id: 'chat' as Tab, name: 'Chat', icon: MessageSquare, gradient: 'gradient-pastel-blue', color: 'bg-pastel-blue-200' },
    { id: 'memory' as Tab, name: 'Memory', icon: Database, gradient: 'gradient-pastel-purple', color: 'bg-pastel-purple-200' },
    { id: 'agents' as Tab, name: 'Agents', icon: Users, gradient: 'gradient-pastel-teal', color: 'bg-pastel-teal-200' },
    { id: 'learning' as Tab, name: 'Learning', icon: TrendingUp, gradient: 'gradient-pastel-yellow', color: 'bg-pastel-yellow-200' },
    { id: 'reflection' as Tab, name: 'Reflection', icon: Sparkles, gradient: 'gradient-pastel-pink', color: 'bg-pastel-pink-200' },
    { id: 'settings' as Tab, name: 'Settings', icon: Settings, gradient: 'gradient-pastel-coral', color: 'bg-pastel-coral-200' }
  ];

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pastel-purple-50 to-pastel-blue-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 pastel-card max-w-md"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="relative"
          >
            <Brain className="w-20 h-20 text-pastel-purple-400 mx-auto" />
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-pastel-pink-300 rounded-full animate-pulse" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-800">
              Welcome to Sylvia
            </h2>
            <p className="text-gray-600 text-lg">
              Setting up your AI Intelligence System...
            </p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div 
              className="bg-gradient-to-r from-pastel-purple-400 to-pastel-blue-400 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-pastel-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-8 py-6 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="relative p-3 rounded-2xl gradient-pastel-purple"
            >
              <Brain className="w-8 h-8 text-pastel-purple-600" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-pastel-pink-300 rounded-full animate-pulse shadow-sm" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
                Sylvia
              </h1>
              <p className="text-base text-gray-600 font-medium">
                AI Intelligence System
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <SystemStatus />
            <div className="flex items-center space-x-3 px-4 py-2 bg-pastel-green-100 rounded-xl">
              <Activity className="w-5 h-5 text-pastel-green-600" />
              <span className="text-pastel-green-700 font-medium">System Active</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <nav className="w-72 bg-white/60 backdrop-blur-sm border-r border-gray-100 px-6 py-8">
          <div className="space-y-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl text-left transition-all duration-300 ${
                    isActive
                      ? 'bg-white shadow-md border border-gray-100 text-gray-800'
                      : 'text-gray-600 hover:bg-white/50 hover:shadow-sm'
                  }`}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`p-3 rounded-xl ${isActive ? tab.gradient : 'bg-gray-100'} transition-all duration-300`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-gray-700' : 'text-gray-500'}`} />
                  </div>
                  <span className="font-semibold text-lg">{tab.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="ml-auto w-3 h-3 bg-pastel-purple-400 rounded-full shadow-sm"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Quick Stats */}
          <div className="mt-10 pastel-card gradient-pastel-teal">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Target className="w-5 h-5 mr-2 text-pastel-teal-600" />
              Quick Stats
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-pastel-purple-400 rounded-full"></div>
                  <span className="font-medium text-gray-700">Memory Buckets</span>
                </div>
                <span className="font-bold text-2xl text-gray-800">10</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-pastel-blue-400 rounded-full"></div>
                  <span className="font-medium text-gray-700">Active Agents</span>
                </div>
                <span className="font-bold text-2xl text-gray-800">11</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-pastel-pink-400 rounded-full"></div>
                  <span className="font-medium text-gray-700">Reflections</span>
                </div>
                <span className="font-bold text-2xl text-gray-800">∞</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden bg-white/30 backdrop-blur-sm">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full"
          >
            {activeTab === 'chat' && <ChatInterface />}
            {activeTab === 'memory' && <MemoryViewer />}
            {activeTab === 'agents' && <AgentOrchestrator />}
            {activeTab === 'learning' && <LearningDashboard />}
            {activeTab === 'reflection' && <ReflectionViewer />}
            {activeTab === 'settings' && (
              <div className="p-10 max-w-4xl">
                <div className="pastel-card">
                  <div className="flex items-center mb-6">
                    <div className="p-3 rounded-xl gradient-pastel-coral mr-4">
                      <Settings className="w-8 h-8 text-gray-700" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-800">System Settings</h2>
                      <p className="text-gray-600 text-lg">Configure your Sylvia AI system</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-pastel-blue-50 rounded-2xl">
                      <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
                        <Brain className="w-5 h-5 mr-2 text-pastel-blue-600" />
                        AI Configuration
                      </h3>
                      <p className="text-gray-600">
                        Advanced AI model settings and performance tuning options coming soon.
                      </p>
                    </div>
                    
                    <div className="p-6 bg-pastel-purple-50 rounded-2xl">
                      <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
                        <Database className="w-5 h-5 mr-2 text-pastel-purple-600" />
                        Memory Management
                      </h3>
                      <p className="text-gray-600">
                        Configure memory retention policies and storage optimization.
                      </p>
                    </div>
                    
                    <div className="p-6 bg-pastel-green-50 rounded-2xl">
                      <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-pastel-green-600" />
                        Agent Orchestration
                      </h3>
                      <p className="text-gray-600">
                        Manage agent behaviors and coordination preferences.
                      </p>
                    </div>
                    
                    <div className="p-6 bg-pastel-yellow-50 rounded-2xl">
                      <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
                        <Sparkles className="w-5 h-5 mr-2 text-pastel-yellow-600" />
                        Personalization
                      </h3>
                      <p className="text-gray-600">
                        Customize interface themes and interaction preferences.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
