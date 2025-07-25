
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Brain, 
  Clock, 
  Play, 
  Lightbulb,
  Network,
  TrendingUp,
  RefreshCw,
  Settings,
  Filter,
  Database
} from 'lucide-react';

interface MemoryReflection {
  id: string;
  reflection: string;
  insights: string[];
  createdAt: string;
  chunk?: {
    text: string;
    bucket: {
      name: string;
    };
  };
  conductor?: {
    name: string;
  };
}

interface ReflectionResult {
  insights: string[];
  newConnections: any[];
  recommendations: string[];
  confidenceScore: number;
}

const MEMORY_BUCKETS = [
  'semantic_stm', 'semantic_ltm', 'procedural_stm', 'procedural_ltm',
  'episodic_stm', 'episodic_ltm', 'diary_rl', 'calendar_rl', 'api_docs', 'odds_ends'
];

export function ReflectionViewer() {
  const [reflections, setReflections] = useState<MemoryReflection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showGenerateReflection, setShowGenerateReflection] = useState(false);
  const [reflectionConfig, setReflectionConfig] = useState({
    memoryScope: ['semantic_stm', 'episodic_stm'],
    reflectionDepth: 'medium' as 'shallow' | 'medium' | 'deep',
    focusAreas: [''] as string[]
  });
  const [lastReflectionResult, setLastReflectionResult] = useState<ReflectionResult | null>(null);

  useEffect(() => {
    loadReflections();
  }, []);

  const loadReflections = async () => {
    try {
      const response = await fetch('/api/reflection?limit=20');
      if (response.ok) {
        const data = await response.json();
        setReflections(data.reflections || []);
      }
    } catch (error) {
      console.error('Failed to load reflections:', error);
    }
  };

  const generateReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          ...reflectionConfig,
          focusAreas: reflectionConfig.focusAreas.filter(area => area.trim())
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLastReflectionResult(data.result);
        setShowGenerateReflection(false);
        loadReflections();
      }
    } catch (error) {
      console.error('Failed to generate reflection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleReflection = async () => {
    try {
      const response = await fetch('/api/reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'schedule',
          memoryScope: ['semantic_stm', 'episodic_stm', 'procedural_stm'],
          reflectionDepth: 'shallow',
          focusAreas: ['daily_interactions', 'learning_progress']
        })
      });

      if (response.ok) {
        alert('Reflection scheduled successfully!');
      }
    } catch (error) {
      console.error('Failed to schedule reflection:', error);
    }
  };

  const triggerAutoReflection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_reflect'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLastReflectionResult(data.result);
        loadReflections();
      }
    } catch (error) {
      console.error('Failed to trigger auto reflection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addFocusArea = () => {
    setReflectionConfig(prev => ({
      ...prev,
      focusAreas: [...prev.focusAreas, '']
    }));
  };

  const removeFocusArea = (index: number) => {
    setReflectionConfig(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.filter((_, i) => i !== index)
    }));
  };

  const updateFocusArea = (index: number, value: string) => {
    setReflectionConfig(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.map((area, i) => i === index ? value : area)
    }));
  };

  return (
    <div className="h-full flex bg-gradient-to-br from-gray-50 to-pastel-purple-50">
      {/* Sidebar - Controls */}
      <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            Memory Reflection
          </h2>
          <motion.button
            onClick={loadReflections}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all duration-200"
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ duration: 0.3 }}
          >
            <RefreshCw className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="pastel-card p-4 text-center gradient-pastel-purple">
            <div className="text-2xl font-bold text-gray-800">
              {reflections.length}
            </div>
            <div className="text-sm font-medium text-gray-600 mt-1">Reflections</div>
          </div>
          <div className="pastel-card p-4 text-center gradient-pastel-blue">
            <div className="text-2xl font-bold text-gray-800">
              {lastReflectionResult?.confidenceScore ? Math.round(lastReflectionResult.confidenceScore * 100) : '-'}%
            </div>
            <div className="text-sm font-medium text-gray-600 mt-1">Confidence</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 mb-8">
          <motion.button
            onClick={() => setShowGenerateReflection(true)}
            className="w-full flex items-center space-x-3 p-4 gradient-pastel-purple text-white rounded-2xl transition-all duration-200 hover:shadow-lg"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">Generate Reflection</span>
          </motion.button>

          <motion.button
            onClick={triggerAutoReflection}
            disabled={isLoading}
            className="w-full flex items-center space-x-3 p-4 gradient-pastel-blue text-white rounded-2xl transition-all duration-200 hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Brain className="w-5 h-5" />
            <span className="font-medium">{isLoading ? 'Reflecting...' : 'Auto Reflect'}</span>
          </motion.button>

          <motion.button
            onClick={scheduleReflection}
            className="w-full flex items-center space-x-3 p-4 gradient-pastel-green text-white rounded-2xl transition-all duration-200 hover:shadow-lg"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Clock className="w-5 h-5" />
            <span className="font-medium">Schedule Reflection</span>
          </motion.button>
        </div>

        {/* Latest Reflection Result */}
        {lastReflectionResult && (
          <div className="pastel-card p-6 gradient-pastel-teal">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-pastel-teal-600" />
              Latest Results
            </h3>
            
            <div className="space-y-4">
              <div className="p-3 bg-white/50 rounded-xl">
                <div className="text-sm text-gray-600 mb-1">Insights Generated</div>
                <div className="text-xl font-bold text-gray-800">
                  {lastReflectionResult.insights.length}
                </div>
              </div>
              
              <div className="p-3 bg-white/50 rounded-xl">
                <div className="text-sm text-gray-600 mb-1">New Connections</div>
                <div className="text-xl font-bold text-gray-800">
                  {lastReflectionResult.newConnections.length}
                </div>
              </div>
              
              <div className="p-3 bg-white/50 rounded-xl">
                <div className="text-sm text-gray-600 mb-1">Recommendations</div>
                <div className="text-xl font-bold text-gray-800">
                  {lastReflectionResult.recommendations.length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - Reflections List */}
      <div className="flex-1 p-8 overflow-y-auto bg-white/30 backdrop-blur-sm">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-bold text-gray-800">
              Recent Reflections
            </h3>
            <div className="px-4 py-2 bg-pastel-purple-100 rounded-xl border border-pastel-purple-200">
              <div className="text-sm font-medium text-pastel-purple-700">
                {reflections.length} total reflections
              </div>
            </div>
          </div>

          {/* Latest Reflection Insights */}
          {lastReflectionResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pastel-card p-8 gradient-pastel-purple border-2 border-pastel-purple-200 shadow-lg"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-xl bg-white/30">
                  <Sparkles className="w-6 h-6 text-pastel-purple-600" />
                </div>
                <h4 className="text-2xl font-bold text-gray-800">
                  Fresh Insights
                </h4>
                <div className="ml-auto px-4 py-2 bg-white/30 rounded-xl">
                  <div className="text-sm font-medium text-gray-700">
                    Confidence: {Math.round(lastReflectionResult.confidenceScore * 100)}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Insights */}
                <div>
                  <h5 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <div className="p-2 rounded-xl gradient-pastel-yellow">
                      <Lightbulb className="w-4 h-4 text-pastel-yellow-600" />
                    </div>
                    <span>Key Insights</span>
                  </h5>
                  <div className="space-y-3">
                    {lastReflectionResult.insights.slice(0, 3).map((insight, index) => (
                      <div key={index} className="p-3 bg-white/60 text-gray-700 rounded-xl border border-white/40">
                        {insight}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connections */}
                <div>
                  <h5 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <div className="p-2 rounded-xl gradient-pastel-teal">
                      <Network className="w-4 h-4 text-pastel-teal-600" />
                    </div>
                    <span>New Connections</span>
                  </h5>
                  <div className="p-4 bg-white/60 rounded-xl border border-white/40">
                    <div className="text-gray-700">
                      {lastReflectionResult.newConnections.length > 0 ? (
                        <div>{lastReflectionResult.newConnections.length} new memory links discovered</div>
                      ) : (
                        <div>No new connections found</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h5 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <div className="p-2 rounded-xl gradient-pastel-green">
                      <TrendingUp className="w-4 h-4 text-pastel-green-600" />
                    </div>
                    <span>Recommendations</span>
                  </h5>
                  <div className="space-y-3">
                    {lastReflectionResult.recommendations.slice(0, 2).map((rec, index) => (
                      <div key={index} className="p-3 bg-white/60 text-gray-700 rounded-xl border border-white/40">
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Historical Reflections */}
          <div className="space-y-6">
            {reflections.map((reflection, index) => (
              <motion.div
                key={reflection.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="pastel-card p-8 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-2xl gradient-pastel-purple">
                      <Brain className="w-6 h-6 text-pastel-purple-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-gray-800">
                        Memory Reflection
                      </div>
                      <div className="text-gray-600">
                        by {reflection.conductor?.name || 'System'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="px-3 py-1 bg-pastel-blue-100 text-pastel-blue-700 rounded-xl text-sm font-medium">
                      {new Date(reflection.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(reflection.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-gray-700 text-lg leading-relaxed">
                    {reflection.reflection}
                  </p>
                </div>

                {/* Insights */}
                {reflection.insights && reflection.insights.length > 0 && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                      <Lightbulb className="w-5 h-5 mr-2 text-pastel-yellow-600" />
                      Key Insights:
                    </h5>
                    <div className="flex flex-wrap gap-3">
                      {reflection.insights.map((insight, idx) => (
                        <span
                          key={idx}
                          className="px-4 py-2 bg-pastel-blue-100 text-pastel-blue-800 text-sm font-medium rounded-xl border border-pastel-blue-200"
                        >
                          {insight}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Memory */}
                {reflection.chunk && (
                  <div className="pt-6 border-t border-gray-200">
                    <div className="flex items-center mb-2">
                      <Database className="w-4 h-4 mr-2 text-pastel-teal-600" />
                      <div className="text-sm font-medium text-gray-600">
                        Related Memory from {reflection.chunk.bucket.name.replace(/_/g, ' ').toUpperCase()}:
                      </div>
                    </div>
                    <div className="p-4 bg-pastel-teal-50 rounded-xl border border-pastel-teal-200">
                      <div className="text-pastel-teal-800 italic">
                        "{reflection.chunk.text.substring(0, 100)}..."
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {reflections.length === 0 && (
            <div className="text-center py-16">
              <div className="pastel-card p-12 max-w-md mx-auto">
                <Sparkles className="w-16 h-16 mx-auto mb-6 text-gray-300" />
                <h3 className="text-2xl font-bold text-gray-600 mb-3">
                  No Reflections Yet
                </h3>
                <p className="text-gray-500 mb-6 text-lg">
                  Generate your first memory reflection to start gaining insights
                </p>
                <motion.button
                  onClick={() => setShowGenerateReflection(true)}
                  className="px-6 py-3 gradient-pastel-purple text-white rounded-2xl hover:shadow-lg transition-all duration-200"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Generate Reflection
                </motion.button>
              </div>
            </div>
          )}
        </div>

        {/* Generate Reflection Modal */}
        <AnimatePresence>
          {showGenerateReflection && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowGenerateReflection(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="pastel-card p-8 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center mb-8">
                  <div className="p-3 rounded-xl gradient-pastel-purple mr-4">
                    <Sparkles className="w-6 h-6 text-pastel-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">
                      Generate Memory Reflection
                    </h3>
                    <p className="text-gray-600">Create insights from your memory patterns</p>
                  </div>
                </div>

                <form onSubmit={generateReflection} className="space-y-8">
                  {/* Memory Scope */}
                  <div>
                    <label className="block text-lg font-bold text-gray-800 mb-4">
                      Memory Buckets to Analyze
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {MEMORY_BUCKETS.map(bucket => (
                        <label key={bucket} className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-all duration-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={reflectionConfig.memoryScope.includes(bucket)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setReflectionConfig(prev => ({
                                  ...prev,
                                  memoryScope: [...prev.memoryScope, bucket]
                                }));
                              } else {
                                setReflectionConfig(prev => ({
                                  ...prev,
                                  memoryScope: prev.memoryScope.filter(b => b !== bucket)
                                }));
                              }
                            }}
                            className="w-4 h-4 text-pastel-purple-600 rounded border-gray-300 focus:ring-pastel-purple-300"
                          />
                          <span className="font-medium text-gray-700">
                            {bucket.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Reflection Depth */}
                  <div>
                    <label className="block text-lg font-bold text-gray-800 mb-4">
                      Reflection Depth
                    </label>
                    <select
                      value={reflectionConfig.reflectionDepth}
                      onChange={(e) => setReflectionConfig(prev => ({
                        ...prev,
                        reflectionDepth: e.target.value as 'shallow' | 'medium' | 'deep'
                      }))}
                      className="w-full p-4 rounded-2xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-pastel-purple-300 focus:border-pastel-purple-300 transition-all duration-200"
                    >
                      <option value="shallow">Shallow - Quick insights</option>
                      <option value="medium">Medium - Balanced analysis</option>
                      <option value="deep">Deep - Comprehensive reflection</option>
                    </select>
                  </div>

                  {/* Focus Areas */}
                  <div>
                    <label className="block text-lg font-bold text-gray-800 mb-4">
                      Focus Areas (Optional)
                    </label>
                    <div className="space-y-3">
                      {reflectionConfig.focusAreas.map((area, index) => (
                        <div key={index} className="flex space-x-3">
                          <input
                            type="text"
                            value={area}
                            onChange={(e) => updateFocusArea(index, e.target.value)}
                            placeholder="e.g., learning progress, decision making..."
                            className="flex-1 p-4 rounded-2xl border border-gray-200 bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pastel-purple-300 focus:border-pastel-purple-300 transition-all duration-200"
                          />
                          <motion.button
                            type="button"
                            onClick={() => removeFocusArea(index)}
                            className="px-4 py-2 text-pastel-coral-600 hover:bg-pastel-coral-50 rounded-xl transition-all duration-200"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            ×
                          </motion.button>
                        </div>
                      ))}
                    </div>
                    <motion.button
                      type="button"
                      onClick={addFocusArea}
                      className="mt-3 text-pastel-blue-600 hover:text-pastel-blue-700 font-medium transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      + Add Focus Area
                    </motion.button>
                  </div>

                  <div className="flex space-x-4">
                    <motion.button
                      type="button"
                      onClick={() => setShowGenerateReflection(false)}
                      className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 transition-all duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={isLoading || reflectionConfig.memoryScope.length === 0}
                      className="flex-1 py-3 px-4 gradient-pastel-purple hover:shadow-lg disabled:bg-gray-300 text-white rounded-2xl transition-all duration-200 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isLoading ? 'Generating...' : 'Generate Reflection'}
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
