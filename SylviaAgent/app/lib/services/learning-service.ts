
import { 
  UserProfile, 
  UserSkill, 
  AgentRating, 
  PersonalityType, 
  PERSONALITY_TRAITS 
} from '../types';
import { prisma } from '../db-client';

export class LearningService {
  private static instance: LearningService;

  static getInstance(): LearningService {
    if (!LearningService.instance) {
      LearningService.instance = new LearningService();
    }
    return LearningService.instance;
  }

  // Create or get user profile
  async getOrCreateUserProfile(
    userId?: string,
    name?: string,
    email?: string
  ): Promise<UserProfile> {
    // For now, we'll use a default profile - in production, this would use auth
    const defaultId = 'default-user';
    
    let profile = await prisma.userProfile.findUnique({
      where: { id: userId || defaultId }
    });

    if (!profile) {
      profile = await prisma.userProfile.create({
        data: {
          id: userId || defaultId,
          name: name || 'MAMS User',
          email,
          personalityScores: {
            red: 0.25,
            blue: 0.25,
            green: 0.25,
            yellow: 0.25
          }
        }
      });
    }

    return profile as UserProfile;
  }

  // Update personality assessment
  async updatePersonalityAssessment(
    profileId: string,
    responses: Record<string, number>
  ): Promise<UserProfile> {
    // Simple 4-color personality scoring algorithm
    const scores = {
      red: 0,
      blue: 0,
      green: 0,
      yellow: 0
    };

    // Process responses (this would be more sophisticated in reality)
    Object.entries(responses).forEach(([question, value]) => {
      // Example scoring logic - you'd have specific question mappings
      if (question.includes('decisive') || question.includes('results')) {
        scores.red += value;
      } else if (question.includes('analytical') || question.includes('precise')) {
        scores.blue += value;
      } else if (question.includes('supportive') || question.includes('stable')) {
        scores.green += value;
      } else if (question.includes('enthusiastic') || question.includes('social')) {
        scores.yellow += value;
      }
    });

    // Normalize scores
    const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
    if (total > 0) {
      Object.keys(scores).forEach(key => {
        scores[key as keyof typeof scores] = scores[key as keyof typeof scores] / total;
      });
    }

    // Determine primary personality type
    const primaryType = Object.entries(scores).reduce((a, b) => 
      scores[a[0] as keyof typeof scores] > scores[b[0] as keyof typeof scores] ? a : b
    )[0].toUpperCase() as PersonalityType;

    const profile = await prisma.userProfile.update({
      where: { id: profileId },
      data: {
        personalityType: primaryType,
        personalityScores: scores
      }
    });

    return profile as UserProfile;
  }

  // Add or update user skill
  async updateUserSkill(
    profileId: string,
    skillName: string,
    category: string,
    levelChange: number = 0,
    success: boolean = true
  ): Promise<UserSkill> {
    const existingSkill = await prisma.userSkill.findUnique({
      where: {
        profileId_name: {
          profileId,
          name: skillName
        }
      }
    });

    if (existingSkill) {
      // Update existing skill with reinforcement learning
      const newLevel = Math.max(1.0, Math.min(10.0, existingSkill.level + levelChange));
      const newInteractions = existingSkill.interactions + 1;
      const newSuccesses = existingSkill.successes + (success ? 1 : 0);
      const newFailures = existingSkill.failures + (success ? 0 : 1);
      const newConfidence = newSuccesses / newInteractions;

      const skill = await prisma.userSkill.update({
        where: { id: existingSkill.id },
        data: {
          level: newLevel,
          confidence: newConfidence,
          interactions: newInteractions,
          successes: newSuccesses,
          failures: newFailures,
          lastUpdated: new Date()
        }
      });

      return skill as UserSkill;
    } else {
      // Create new skill
      const skill = await prisma.userSkill.create({
        data: {
          profileId,
          name: skillName,
          category,
          level: Math.max(1.0, 1.0 + levelChange),
          confidence: success ? 1.0 : 0.0,
          interactions: 1,
          successes: success ? 1 : 0,
          failures: success ? 0 : 1
        }
      });

      return skill as UserSkill;
    }
  }

  // Add agent rating
  async addAgentRating(
    agentId: string,
    rating: number,
    feedback?: string,
    category?: string,
    profileId?: string,
    messageId?: string,
    taskId?: string,
    context: Record<string, any> = {}
  ): Promise<AgentRating> {
    const agentRating = await prisma.agentRating.create({
      data: {
        agentId,
        profileId,
        messageId,
        taskId,
        rating: Math.max(1, Math.min(5, rating)), // Ensure 1-5 range
        feedback,
        category,
        context
      }
    });

    // Update agent performance metrics based on rating
    await this.updateAgentPerformanceFromRating(agentId, rating);

    return agentRating as AgentRating;
  }

  // Get user skills
  async getUserSkills(profileId: string): Promise<UserSkill[]> {
    const skills = await prisma.userSkill.findMany({
      where: { profileId },
      orderBy: [
        { level: 'desc' },
        { confidence: 'desc' }
      ]
    });

    return skills as UserSkill[];
  }

  // Get learning analytics
  async getLearningAnalytics(profileId: string): Promise<Record<string, any>> {
    const [profile, skills, ratings] = await Promise.all([
      prisma.userProfile.findUnique({ where: { id: profileId } }),
      prisma.userSkill.findMany({ where: { profileId } }),
      prisma.agentRating.findMany({ 
        where: { profileId },
        include: { agent: true }
      })
    ]);

    if (!profile) {
      throw new Error('Profile not found');
    }

    // Calculate skill distribution
    const skillsByCategory = skills.reduce((acc, skill) => {
      if (!acc[skill.category]) acc[skill.category] = [];
      acc[skill.category].push(skill);
      return acc;
    }, {} as Record<string, UserSkill[]>);

    // Calculate learning progress
    const totalInteractions = skills.reduce((sum, skill) => sum + skill.interactions, 0);
    const totalSuccesses = skills.reduce((sum, skill) => sum + skill.successes, 0);
    const overallSuccessRate = totalInteractions > 0 ? totalSuccesses / totalInteractions : 0;

    // Calculate agent rating trends
    const agentRatings = ratings.reduce((acc, rating) => {
      if (!acc[rating.agentId]) {
        acc[rating.agentId] = {
          agentName: rating.agent.name,
          ratings: []
        };
      }
      acc[rating.agentId].ratings.push(rating.rating);
      return acc;
    }, {} as Record<string, any>);

    Object.keys(agentRatings).forEach(agentId => {
      const ratings = agentRatings[agentId].ratings;
      agentRatings[agentId].averageRating = ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length;
      agentRatings[agentId].totalRatings = ratings.length;
    });

    return {
      profile: {
        ...profile,
        personalityTraits: profile.personalityType ? 
          PERSONALITY_TRAITS[profile.personalityType as keyof typeof PERSONALITY_TRAITS] : null
      },
      skills: {
        total: skills.length,
        byCategory: skillsByCategory,
        averageLevel: skills.length > 0 ? skills.reduce((sum, s) => sum + s.level, 0) / skills.length : 0,
        averageConfidence: skills.length > 0 ? skills.reduce((sum, s) => sum + s.confidence, 0) / skills.length : 0
      },
      interactions: {
        total: totalInteractions,
        successes: totalSuccesses,
        successRate: overallSuccessRate
      },
      agentRatings: Object.values(agentRatings),
      recommendations: await this.generateLearningRecommendations(profileId)
    };
  }

  // Generate learning recommendations
  private async generateLearningRecommendations(profileId: string): Promise<string[]> {
    const skills = await prisma.userSkill.findMany({
      where: { profileId },
      orderBy: { confidence: 'asc' }
    });

    const recommendations: string[] = [];

    // Find skills with low confidence
    const lowConfidenceSkills = skills.filter(skill => skill.confidence < 0.6);
    if (lowConfidenceSkills.length > 0) {
      recommendations.push(`Focus on improving confidence in: ${lowConfidenceSkills.slice(0, 3).map(s => s.name).join(', ')}`);
    }

    // Find skills with low interaction count
    const underutilizedSkills = skills.filter(skill => skill.interactions < 5);
    if (underutilizedSkills.length > 0) {
      recommendations.push(`Practice more with: ${underutilizedSkills.slice(0, 3).map(s => s.name).join(', ')}`);
    }

    // Suggest skill diversification
    const categories = [...new Set(skills.map(s => s.category))];
    if (categories.length < 3) {
      recommendations.push('Consider developing skills in new categories to diversify your expertise');
    }

    return recommendations;
  }

  // Update agent performance based on rating
  private async updateAgentPerformanceFromRating(agentId: string, rating: number): Promise<void> {
    // Get recent ratings for this agent
    const recentRatings = await prisma.agentRating.findMany({
      where: {
        agentId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    if (recentRatings.length > 0) {
      const averageRating = recentRatings.reduce((sum, r) => sum + r.rating, 0) / recentRatings.length;
      
      // Update agent success rate based on ratings (3+ is considered success)
      const successRate = recentRatings.filter(r => r.rating >= 3).length / recentRatings.length;

      await prisma.agent.update({
        where: { id: agentId },
        data: {
          successRate
        }
      });
    }
  }

  // Suggest personality-based responses
  async getPersonalityBasedSuggestions(profileId: string, context: string): Promise<string[]> {
    const profile = await prisma.userProfile.findUnique({ where: { id: profileId } });
    
    if (!profile || !profile.personalityType) {
      return ['How can I help you today?', 'What would you like to work on?'];
    }

    const suggestions: Record<PersonalityType, string[]> = {
      'RED': [
        'Let\'s get straight to the solution',
        'What\'s the most efficient approach?',
        'Show me the results',
        'Let\'s make this happen quickly'
      ],
      'BLUE': [
        'Can you provide more details?',
        'Let\'s analyze this systematically',
        'What are the specific requirements?',
        'Let\'s examine all the data'
      ],
      'GREEN': [
        'Let\'s take this step by step',
        'How does this affect everyone involved?',
        'What\'s the most collaborative approach?',
        'Let\'s ensure everyone is comfortable'
      ],
      'YELLOW': [
        'This sounds exciting!',
        'Let\'s explore creative possibilities',
        'How can we make this more engaging?',
        'What\'s the fun way to approach this?'
      ]
    };

    return suggestions[profile.personalityType as keyof typeof suggestions] || suggestions['BLUE'];
  }
}

export const learningService = LearningService.getInstance();
