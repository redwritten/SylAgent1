
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  User, 
  Brain, 
  Star, 
  Target, 
  Award,
  BookOpen,
  RefreshCw,
  Settings,
  BarChart3
} from 'lucide-react';

interface UserProfile {
  id: string;
  name?: string;
  personalityType?: string;
  personalityScores: Record<string, number>;
  autonomyLevel: number;
  autonomyEnabled: boolean;
  autoReflection: boolean;
}

interface UserSkill {
  id: string;
  name: string;
  category: string;
  level: number;
  confidence: number;
  interactions: number;
  successes: number;
  failures: number;
}

interface LearningAnalytics {
  profile: UserProfile & { personalityTraits?: string };
  skills: {
    total: number;
    byCategory: Record<string, UserSkill[]>;
    averageLevel: number;
    averageConfidence: number;
  };
  interactions: {
    total: number;
    successes: number;
    successRate: number;
  };
  recommendations: string[];
}

const PERSONALITY_COLORS = {
  'RED': 'bg-red-500',
  'BLUE': 'bg-blue-500',
  'GREEN': 'bg-green-500',
  'YELLOW': 'bg-yellow-500'
};

const PERSONALITY_DESCRIPTIONS = {
  'RED': 'Decisive, results-oriented, competitive',
  'BLUE': 'Analytical, precise, methodical',
  'GREEN': 'Supportive, stable, patient',
  'YELLOW': 'Enthusiastic, optimistic, social'
};

export function LearningDashboard() {
  const [analytics, setAnalytics] = useState<LearningAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPersonalityTest, setShowPersonalityTest] = useState(false);
  const [personalityResponses, setPersonalityResponses] = useState<Record<string, number>>({});

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/learning?action=analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to load learning analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePersonality = async (responses: Record<string, number>) => {
    try {
      const response = await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_personality',
          responses
        })
      });

      if (response.ok) {
        loadAnalytics();
        setShowPersonalityTest(false);
        setPersonalityResponses({});
      }
    } catch (error) {
      console.error('Failed to update personality:', error);
    }
  };

  const updateSkill = async (skillName: string, category: string, success: boolean) => {
    try {
      await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_skill',
          skillName,
          category,
          levelChange: success ? 0.1 : -0.05,
          success
        })
      });

      loadAnalytics();
    } catch (error) {
      console.error('Failed to update skill:', error);
    }
  };

  const personalityQuestions = [
    { id: 'decisive', text: 'I prefer to make quick decisions', category: 'red' },
    { id: 'analytical', text: 'I like to analyze data before acting', category: 'blue' },
    { id: 'supportive', text: 'I enjoy helping others succeed', category: 'green' },
    { id: 'social', text: 'I thrive in social situations', category: 'yellow' },
    { id: 'results', text: 'I focus on achieving results', category: 'red' },
    { id: 'precise', text: 'I pay attention to details', category: 'blue' },
    { id: 'stable', text: 'I prefer consistency and routine', category: 'green' },
    { id: 'optimistic', text: 'I see opportunities in challenges', category: 'yellow' }
  ];

  if (isLoading && !analytics) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-pastel-purple-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="pastel-card p-8"
        >
          <Brain className="w-12 h-12 text-pastel-purple-500 mx-auto" />
          <p className="text-gray-600 text-center mt-4">Loading learning analytics...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-pastel-purple-50 p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">
            Learning Dashboard
          </h2>
          <p className="text-gray-600 text-lg">
            Track your skills, personality, and learning progress
          </p>
        </div>
        <motion.button
          onClick={loadAnalytics}
          className="p-3 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-white/50 transition-all duration-200"
          whileHover={{ rotate: 180, scale: 1.1 }}
          transition={{ duration: 0.3 }}
        >
          <RefreshCw className="w-6 h-6" />
        </motion.button>
      </div>

      {analytics && (
        <>
          {/* User Profile Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Personality Profile */}
            <div className="pastel-card p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                  <User className="w-6 h-6 mr-3 text-pastel-purple-600" />
                  Personality Profile
                </h3>
                <motion.button
                  onClick={() => setShowPersonalityTest(true)}
                  className="px-4 py-2 gradient-pastel-blue text-white rounded-xl hover:shadow-md transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Update
                </motion.button>
              </div>

              {analytics.profile.personalityType ? (
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 rounded-2xl ${PERSONALITY_COLORS[analytics.profile.personalityType as keyof typeof PERSONALITY_COLORS]} flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                      {analytics.profile.personalityType[0]}
                    </div>
                    <div>
                      <div className="text-xl font-bold text-gray-800">
                        {analytics.profile.personalityType} Type
                      </div>
                      <div className="text-gray-600 mt-1">
                        {PERSONALITY_DESCRIPTIONS[analytics.profile.personalityType as keyof typeof PERSONALITY_DESCRIPTIONS]}
                      </div>
                    </div>
                  </div>

                  {/* Personality Scores */}
                  <div className="space-y-4">
                    {Object.entries(analytics.profile.personalityScores).map(([type, score]) => (
                      <div key={type} className="p-4 bg-white rounded-2xl border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-700 capitalize">
                            {type}
                          </span>
                          <span className="font-bold text-gray-800">
                            {Math.round((score as number) * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(score as number) * 100}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={`h-full ${PERSONALITY_COLORS[type.toUpperCase() as keyof typeof PERSONALITY_COLORS]} rounded-full`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <User className="w-16 h-16 mx-auto mb-6 text-gray-300" />
                  <h4 className="text-xl font-bold text-gray-600 mb-3">
                    Discover Your Personality
                  </h4>
                  <p className="text-gray-500 mb-6">
                    Complete the personality assessment to get personalized insights
                  </p>
                  <motion.button
                    onClick={() => setShowPersonalityTest(true)}
                    className="px-6 py-3 gradient-pastel-purple text-white rounded-2xl hover:shadow-lg transition-all duration-200"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Take Assessment
                  </motion.button>
                </div>
              )}
            </div>

            {/* Autonomy Settings */}
            <div className="pastel-card p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Settings className="w-6 h-6 mr-3 text-pastel-teal-600" />
                Autonomy Settings
              </h3>

              <div className="space-y-6">
                <div className="p-4 bg-white rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-700">Autonomy Level</span>
                    <span className="text-lg font-bold text-gray-800">
                      {analytics.profile.autonomyLevel}/5
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <motion.div
                        key={level}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: level * 0.1 }}
                        className={`w-4 h-4 rounded-full ${
                          level <= analytics.profile.autonomyLevel
                            ? 'gradient-pastel-blue'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-700">Auto Reflection</span>
                      <p className="text-sm text-gray-500">Automatically generate insights</p>
                    </div>
                    <div className={`w-14 h-7 rounded-full ${
                      analytics.profile.autoReflection ? 'gradient-pastel-green' : 'bg-gray-200'
                    } relative cursor-pointer transition-all duration-200`}>
                      <div className={`w-6 h-6 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${
                        analytics.profile.autoReflection ? 'translate-x-7' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-700">System Autonomy</span>
                      <p className="text-sm text-gray-500">Allow independent decisions</p>
                    </div>
                    <div className={`w-14 h-7 rounded-full ${
                      analytics.profile.autonomyEnabled ? 'gradient-pastel-green' : 'bg-gray-200'
                    } relative cursor-pointer transition-all duration-200`}>
                      <div className={`w-6 h-6 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${
                        analytics.profile.autonomyEnabled ? 'translate-x-7' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Skills Overview */}
          <div className="pastel-card p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-8 flex items-center">
              <TrendingUp className="w-6 h-6 mr-3 text-pastel-green-600" />
              Skills & Progress
            </h3>

            {/* Skills Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="pastel-card p-6 text-center gradient-pastel-blue"
              >
                <div className="text-3xl font-bold text-gray-800">{analytics.skills.total}</div>
                <div className="text-sm font-medium text-gray-600 mt-2">Total Skills</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="pastel-card p-6 text-center gradient-pastel-green"
              >
                <div className="text-3xl font-bold text-gray-800">
                  {analytics.skills.averageLevel.toFixed(1)}
                </div>
                <div className="text-sm font-medium text-gray-600 mt-2">Avg Level</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="pastel-card p-6 text-center gradient-pastel-purple"
              >
                <div className="text-3xl font-bold text-gray-800">
                  {Math.round(analytics.skills.averageConfidence * 100)}%
                </div>
                <div className="text-sm font-medium text-gray-600 mt-2">Confidence</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="pastel-card p-6 text-center gradient-pastel-coral"
              >
                <div className="text-3xl font-bold text-gray-800">
                  {Math.round(analytics.interactions.successRate * 100)}%
                </div>
                <div className="text-sm font-medium text-gray-600 mt-2">Success Rate</div>
              </motion.div>
            </div>

            {/* Skills by Category */}
            <div className="space-y-6">
              {Object.entries(analytics.skills.byCategory).map(([category, skills], index) => (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm"
                >
                  <h4 className="text-xl font-bold text-gray-800 mb-4 capitalize flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-pastel-blue-600" />
                    {category.replace(/_/g, ' ')} ({skills.length})
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {skills.slice(0, 6).map((skill) => (
                      <motion.div
                        key={skill.id}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="p-4 bg-gray-50 rounded-xl hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-gray-800 text-sm">
                            {skill.name.replace(/_/g, ' ')}
                          </span>
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < Math.round(skill.level / 2)
                                    ? 'text-pastel-yellow-500 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                          <span>Level: {skill.level.toFixed(1)}</span>
                          <span>Confidence: {Math.round(skill.confidence * 100)}%</span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <motion.button
                            onClick={() => updateSkill(skill.name, category, true)}
                            className="flex-1 py-2 px-3 bg-pastel-green-100 text-pastel-green-700 text-xs font-medium rounded-xl hover:bg-pastel-green-200 transition-all duration-200"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            ✓ Success
                          </motion.button>
                          <motion.button
                            onClick={() => updateSkill(skill.name, category, false)}
                            className="flex-1 py-2 px-3 bg-pastel-coral-100 text-pastel-coral-700 text-xs font-medium rounded-xl hover:bg-pastel-coral-200 transition-all duration-200"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            ✗ Challenge
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {analytics.recommendations.length > 0 && (
            <div className="pastel-card p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Target className="w-6 h-6 mr-3 text-pastel-yellow-600" />
                Learning Recommendations
              </h3>
              
              <div className="space-y-4">
                {analytics.recommendations.map((recommendation, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-4 p-6 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-200"
                  >
                    <div className="p-2 rounded-xl gradient-pastel-yellow">
                      <Target className="w-5 h-5 text-pastel-yellow-600" />
                    </div>
                    <p className="text-gray-700 font-medium">{recommendation}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Personality Test Modal */}
          <AnimatePresence>
            {showPersonalityTest && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowPersonalityTest(false)}
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
                      <User className="w-6 h-6 text-pastel-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-800">
                        4-Color Personality Assessment
                      </h3>
                      <p className="text-gray-600">Discover your personality type and preferences</p>
                    </div>
                  </div>
                  
                  <div className="space-y-8">
                    {personalityQuestions.map((question, index) => (
                      <motion.div
                        key={question.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-6 bg-white rounded-2xl border border-gray-100"
                      >
                        <p className="text-gray-700 font-medium mb-4">{question.text}</p>
                        <div className="flex justify-center space-x-3 mb-4">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <motion.button
                              key={value}
                              onClick={() => setPersonalityResponses(prev => ({ ...prev, [question.id]: value }))}
                              className={`w-12 h-12 rounded-2xl border-2 font-bold transition-all duration-200 ${
                                personalityResponses[question.id] === value
                                  ? 'gradient-pastel-blue text-white border-pastel-blue-300 shadow-lg'
                                  : 'border-gray-200 text-gray-600 hover:border-pastel-blue-200 hover:bg-pastel-blue-50'
                              }`}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              {value}
                            </motion.button>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Strongly Disagree</span>
                          <span>Strongly Agree</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="flex space-x-4 mt-8">
                    <motion.button
                      onClick={() => setShowPersonalityTest(false)}
                      className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 transition-all duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={() => updatePersonality(personalityResponses)}
                      disabled={Object.keys(personalityResponses).length < personalityQuestions.length}
                      className="flex-1 py-3 px-4 gradient-pastel-purple hover:shadow-lg disabled:bg-gray-300 text-white rounded-2xl transition-all duration-200 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Complete Assessment
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
