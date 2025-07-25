
import { NextRequest, NextResponse } from 'next/server';
import { learningService } from '@/lib/services/learning-service';
import { PersonalityType } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Get user profile and learning analytics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default-user';
    const action = searchParams.get('action');

    if (action === 'analytics') {
      const analytics = await learningService.getLearningAnalytics(userId);
      return NextResponse.json(analytics);
    }

    if (action === 'skills') {
      const skills = await learningService.getUserSkills(userId);
      return NextResponse.json({ skills });
    }

    if (action === 'suggestions') {
      const context = searchParams.get('context') || '';
      const suggestions = await learningService.getPersonalityBasedSuggestions(userId, context);
      return NextResponse.json({ suggestions });
    }

    // Default: get or create user profile
    const profile = await learningService.getOrCreateUserProfile(userId);
    return NextResponse.json({ profile });

  } catch (error) {
    console.error('Learning GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Update user profile, personality, or skills
export async function POST(request: NextRequest) {
  try {
    const { action, userId = 'default-user', ...data } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'create_profile':
        result = await learningService.getOrCreateUserProfile(
          userId,
          data.name,
          data.email
        );
        break;

      case 'update_personality':
        if (!data.responses) {
          return NextResponse.json({ 
            error: 'responses object is required for personality update' 
          }, { status: 400 });
        }
        
        result = await learningService.updatePersonalityAssessment(
          userId,
          data.responses
        );
        break;

      case 'update_skill':
        if (!data.skillName || !data.category) {
          return NextResponse.json({ 
            error: 'skillName and category are required for skill update' 
          }, { status: 400 });
        }
        
        result = await learningService.updateUserSkill(
          userId,
          data.skillName,
          data.category,
          data.levelChange || 0,
          data.success !== false
        );
        break;

      case 'add_rating':
        if (!data.agentId || data.rating === undefined) {
          return NextResponse.json({ 
            error: 'agentId and rating are required for rating submission' 
          }, { status: 400 });
        }
        
        result = await learningService.addAgentRating(
          data.agentId,
          data.rating,
          data.feedback,
          data.category,
          userId,
          data.messageId,
          data.taskId,
          data.context || {}
        );
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });

  } catch (error) {
    console.error('Learning POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Batch operations for learning data
export async function PUT(request: NextRequest) {
  try {
    const { action, userId = 'default-user', ...data } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'bulk_skill_update':
        if (!data.skills || !Array.isArray(data.skills)) {
          return NextResponse.json({ 
            error: 'skills array is required for bulk skill update' 
          }, { status: 400 });
        }
        
        const skillPromises = data.skills.map((skill: any) =>
          learningService.updateUserSkill(
            userId,
            skill.name,
            skill.category,
            skill.levelChange || 0,
            skill.success !== false
          )
        );
        
        result = await Promise.all(skillPromises);
        break;

      case 'personality_assessment_complete':
        if (!data.responses) {
          return NextResponse.json({ 
            error: 'responses object is required for personality assessment' 
          }, { status: 400 });
        }
        
        const profile = await learningService.updatePersonalityAssessment(
          userId,
          data.responses
        );
        
        // Also update related skills based on personality
        const personalitySkills = {
          'RED': ['leadership', 'decision_making', 'problem_solving'],
          'BLUE': ['analysis', 'research', 'attention_to_detail'],
          'GREEN': ['collaboration', 'communication', 'empathy'],
          'YELLOW': ['creativity', 'innovation', 'social_skills']
        };
        
        const skillsToUpdate = personalitySkills[profile.personalityType as PersonalityType] || [];
        
        for (const skill of skillsToUpdate) {
          await learningService.updateUserSkill(
            userId,
            skill,
            'personality_trait',
            0.2, // Small boost for personality-aligned skills
            true
          );
        }
        
        result = { profile, skillsUpdated: skillsToUpdate.length };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });

  } catch (error) {
    console.error('Learning PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
