
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Search, 
  Plus, 
  Link, 
  TrendingDown, 
  Clock, 
  Brain,
  Layers,
  Filter,
  RefreshCw
} from 'lucide-react';

interface MemoryChunk {
  id: string;
  text: string;
  score: number;
  timestamp: Date;
  source: string;
  accessCount: number;
}

interface MemoryStats {
  totalChunks: number;
  totalLinks: number;
  totalReflections: number;
  buckets: {
    name: string;
    type: string;
    chunkCount: number;
  }[];
}

const BUCKET_COLORS = {
  'STM': 'gradient-pastel-blue',
  'LTM': 'gradient-pastel-purple',
  'RL': 'gradient-pastel-green',
  'DOCS': 'gradient-pastel-coral',
  'MISC': 'gradient-pastel-teal'
};

const BUCKET_ICON_COLORS = {
  'STM': 'text-pastel-blue-600',
  'LTM': 'text-pastel-purple-600',
  'RL': 'text-pastel-green-600',
  'DOCS': 'text-pastel-coral-600',
  'MISC': 'text-pastel-teal-600'
};

export function MemoryViewer() {
  const [selectedBucket, setSelectedBucket] = useState<string>('');
  const [memories, setMemories] = useState<MemoryChunk[]>([]);
  const [stats, setStats] = useState<MemoryStats>({
    totalChunks: 0,
    totalLinks: 0,
    totalReflections: 0,
    buckets: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [newMemory, setNewMemory] = useState({
    bucket: 'semantic_stm',
    text: '',
    source: 'manual_entry'
  });

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (selectedBucket) {
      loadMemories();
    }
  }, [selectedBucket]);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/memory');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load memory stats:', error);
    }
  };

  const loadMemories = async () => {
    if (!selectedBucket) return;
    
    setIsLoading(true);
    try {
      const url = searchQuery 
        ? `/api/memory?query=${encodeURIComponent(searchQuery)}&bucket=${selectedBucket}`
        : `/api/memory?bucket=${selectedBucket}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setMemories(data.memories || []);
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const url = selectedBucket
        ? `/api/memory?query=${encodeURIComponent(searchQuery)}&bucket=${selectedBucket}`
        : `/api/memory?query=${encodeURIComponent(searchQuery)}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setMemories(data.memories || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemory.text.trim()) return;

    try {
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemory)
      });

      if (response.ok) {
        setNewMemory({ bucket: 'semantic_stm', text: '', source: 'manual_entry' });
        setShowAddMemory(false);
        loadStats();
        if (selectedBucket === newMemory.bucket) {
          loadMemories();
        }
      }
    } catch (error) {
      console.error('Failed to add memory:', error);
    }
  };

  const applyDecay = async () => {
    try {
      const response = await fetch('/api/memory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decay' })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Memory decay applied: ${data.result.processed} processed, ${data.result.decayed} decayed, ${data.result.deleted} deleted`);
        loadStats();
        if (selectedBucket) loadMemories();
      }
    } catch (error) {
      console.error('Failed to apply decay:', error);
    }
  };

  return (
    <div className="h-full flex bg-gradient-to-br from-white to-pastel-purple-50">
      {/* Sidebar - Memory Buckets */}
      <div className="w-96 bg-white/70 backdrop-blur-sm border-r border-gray-100 p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl gradient-pastel-purple">
              <Database className="w-8 h-8 text-pastel-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Memory Buckets
              </h2>
              <p className="text-gray-600 font-medium">Neural Storage System</p>
            </div>
          </div>
          <motion.button
            onClick={loadStats}
            className="p-3 text-gray-600 hover:text-pastel-purple-600 hover:bg-pastel-purple-50 rounded-xl transition-all duration-200"
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ duration: 0.3 }}
          >
            <RefreshCw className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <motion.div
            className="text-center p-5 gradient-pastel-blue rounded-2xl shadow-sm"
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <div className="text-3xl font-bold text-pastel-blue-700 mb-1">{stats.totalChunks}</div>
            <div className="text-sm font-medium text-pastel-blue-600">Memory Chunks</div>
          </motion.div>
          <motion.div
            className="text-center p-5 gradient-pastel-teal rounded-2xl shadow-sm"
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <div className="text-3xl font-bold text-pastel-teal-700 mb-1">{stats.totalLinks}</div>
            <div className="text-sm font-medium text-pastel-teal-600">Neural Links</div>
          </motion.div>
          <motion.div
            className="text-center p-5 gradient-pastel-pink rounded-2xl shadow-sm"
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <div className="text-3xl font-bold text-pastel-pink-700 mb-1">{stats.totalReflections}</div>
            <div className="text-sm font-medium text-pastel-pink-600">Reflections</div>
          </motion.div>
        </div>

        {/* Bucket List */}
        <div className="space-y-3 mb-8">
          {stats.buckets.map((bucket) => (
            <motion.button
              key={bucket.name}
              onClick={() => setSelectedBucket(bucket.name)}
              className={`w-full flex items-center justify-between p-5 rounded-2xl text-left transition-all duration-300 shadow-sm ${
                selectedBucket === bucket.name
                  ? 'bg-white border-2 border-pastel-purple-300 shadow-md'
                  : 'bg-white/50 border border-gray-100 hover:bg-white hover:shadow-md'
              }`}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-xl ${BUCKET_COLORS[bucket.type as keyof typeof BUCKET_COLORS]} flex items-center justify-center shadow-sm`}>
                  <Database className={`w-5 h-5 ${BUCKET_ICON_COLORS[bucket.type as keyof typeof BUCKET_ICON_COLORS]}`} />
                </div>
                <div>
                  <div className="font-bold text-gray-800 text-lg">{bucket.name.replace(/_/g, ' ').toUpperCase()}</div>
                  <div className="text-sm font-medium text-gray-600">{bucket.type} Memory</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">{bucket.chunkCount}</div>
                <div className="text-sm text-gray-600">chunks</div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <motion.button
            onClick={() => setShowAddMemory(true)}
            className="w-full flex items-center justify-center space-x-3 p-4 gradient-pastel-green hover:shadow-lg text-pastel-green-700 rounded-2xl transition-all duration-200 font-semibold"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-5 h-5" />
            <span>Add Memory</span>
          </motion.button>
          
          <motion.button
            onClick={applyDecay}
            className="w-full flex items-center justify-center space-x-3 p-4 gradient-pastel-coral hover:shadow-lg text-pastel-coral-700 rounded-2xl transition-all duration-200 font-semibold"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <TrendingDown className="w-5 h-5" />
            <span>Apply Decay</span>
          </motion.button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 bg-white/30 backdrop-blur-sm">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories by content..."
                className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pastel-purple-300 focus:border-pastel-purple-300 shadow-sm font-medium text-lg transition-all duration-200"
              />
            </div>
            <motion.button
              type="submit"
              disabled={isLoading}
              className="px-8 py-4 gradient-pastel-purple hover:shadow-lg disabled:bg-gray-300 text-pastel-purple-700 rounded-2xl transition-all duration-200 disabled:cursor-not-allowed font-semibold shadow-sm"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : 'Search'}
            </motion.button>
          </div>
        </form>

        {/* Memory List */}
        {selectedBucket ? (
          <div className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 rounded-2xl gradient-pastel-blue">
                <Brain className="w-8 h-8 text-pastel-blue-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {selectedBucket.replace(/_/g, ' ').toUpperCase()} Memories
                </h3>
                <p className="text-gray-600 font-medium">Neural memory storage</p>
              </div>
            </div>
            
            <AnimatePresence>
              {memories.map((memory, index) => (
                <motion.div
                  key={memory.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
                  className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 rounded-xl gradient-pastel-teal">
                        <Brain className="w-5 h-5 text-pastel-teal-600" />
                      </div>
                      <div className="flex space-x-4">
                        <span className="px-3 py-1 bg-pastel-blue-100 text-pastel-blue-700 rounded-xl text-sm font-medium">
                          Score: {memory.score?.toFixed(2) || 'N/A'}
                        </span>
                        <span className="px-3 py-1 bg-pastel-green-100 text-pastel-green-700 rounded-xl text-sm font-medium">
                          Accessed: {memory.accessCount || 0} times
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 font-medium">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(memory.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4 text-lg leading-relaxed">
                    {memory.text.length > 300 ? `${memory.text.substring(0, 300)}...` : memory.text}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-pastel-coral-100 text-pastel-coral-700 rounded-xl text-sm font-medium">
                      Source: {memory.source}
                    </span>
                    <div className="flex space-x-2">
                      <motion.button
                        className="p-2 text-gray-400 hover:text-pastel-blue-600 hover:bg-pastel-blue-50 rounded-xl transition-all duration-200"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Link className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {memories.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <div className="p-6 rounded-2xl gradient-pastel-purple mb-6 w-fit mx-auto">
                  <Database className="w-16 h-16 text-pastel-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No memories found</h3>
                <p className="text-gray-600 font-medium">This bucket is empty or no matches found.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="p-6 rounded-2xl gradient-pastel-blue mb-6 w-fit mx-auto">
                <Layers className="w-16 h-16 text-pastel-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Select a Memory Bucket</h3>
              <p className="text-gray-600 font-medium">Choose a bucket from the sidebar to explore its contents</p>
            </div>
          </div>
        )}

        {/* Add Memory Modal */}
        <AnimatePresence>
          {showAddMemory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowAddMemory(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full mx-4 border border-gray-100"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center space-x-4 mb-6">
                  <div className="p-3 rounded-2xl gradient-pastel-green">
                    <Plus className="w-8 h-8 text-pastel-green-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">
                      Add New Memory
                    </h3>
                    <p className="text-gray-600 font-medium">Store information in neural bucket</p>
                  </div>
                </div>
                
                <form onSubmit={addMemory} className="space-y-6">
                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Memory Bucket
                    </label>
                    <select
                      value={newMemory.bucket}
                      onChange={(e) => setNewMemory(prev => ({ ...prev, bucket: e.target.value }))}
                      className="w-full p-4 rounded-2xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-pastel-green-300 focus:border-pastel-green-300 font-medium text-lg transition-all duration-200"
                    >
                      {stats.buckets.map(bucket => (
                        <option key={bucket.name} value={bucket.name}>
                          {bucket.name.replace(/_/g, ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Memory Content
                    </label>
                    <textarea
                      value={newMemory.text}
                      onChange={(e) => setNewMemory(prev => ({ ...prev, text: e.target.value }))}
                      placeholder="Enter memory content..."
                      rows={5}
                      className="w-full p-4 rounded-2xl border border-gray-200 bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pastel-green-300 focus:border-pastel-green-300 resize-none font-medium text-lg transition-all duration-200"
                      required
                    />
                  </div>
                  
                  <div className="flex space-x-4 pt-4">
                    <motion.button
                      type="button"
                      onClick={() => setShowAddMemory(false)}
                      className="flex-1 py-4 px-6 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all duration-200 font-semibold text-lg"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      className="flex-1 py-4 px-6 gradient-pastel-green hover:shadow-lg text-pastel-green-700 rounded-2xl transition-all duration-200 font-semibold text-lg"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Add Memory
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
