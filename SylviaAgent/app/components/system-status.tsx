
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface SystemHealth {
  healthy: boolean;
  timestamp: string;
  services: {
    llm: boolean;
    database: boolean;
    agents: boolean;
  };
}

export function SystemStatus() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkHealth = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'health_check' })
      });
      
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('Health check failed:', error);
      setHealth({
        healthy: false,
        timestamp: new Date().toISOString(),
        services: { llm: false, database: false, agents: false }
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (!health) {
    return (
      <div className="flex items-center space-x-2 text-slate-500">
        <Clock className="w-4 h-4 animate-pulse" />
        <span className="text-sm">Checking...</span>
      </div>
    );
  }

  const statusColor = health.healthy ? 'text-green-500' : 'text-red-500';
  const StatusIcon = health.healthy ? CheckCircle : AlertCircle;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center space-x-2"
    >
      <StatusIcon className={`w-4 h-4 ${statusColor}`} />
      <span className={`text-sm font-medium ${statusColor}`}>
        {health.healthy ? 'Healthy' : 'Issues Detected'}
      </span>
    </motion.div>
  );
}
