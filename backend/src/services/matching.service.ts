/**
 * AI Matching Service for SwiftyTask
 * Implements a rule-based algorithm to match freelancers with tasks
 * This is a mock implementation that can be replaced with actual AI/ML models
 */

import { 
  MatchingCriteria, 
  FreelancerProfile, 
  MatchResult, 
  User,
  Task
} from '../types';
import { AI_MATCHING_CONFIG } from '../../constants';
import { blockchainService } from './blockchain.service';

export class MatchingService {
  
  /**
   * Find the best freelancer matches for a given task
   * @param criteria Task criteria for matching
   * @param maxResults Maximum number of results to return
   * @returns Array of matched freelancers with scores
   */
  async findMatches(
    criteria: MatchingCriteria,
    maxResults: number = 10
  ): Promise<MatchResult[]> {
    try {
      // Get all registered users (in production, this would be paginated/filtered)
      const allFreelancers = await this.getAllFreelancers();
      
      // Score each freelancer against the task criteria
      const scoredMatches = await Promise.all(
        allFreelancers.map(async (freelancer) => {
          const score = await this.calculateMatchScore(criteria, freelancer);
          return {
            freelancer: freelancer.address,
            score,
            matchingSkills: this.getMatchingSkills(criteria.requiredSkills, freelancer.skills),
            reasons: this.generateMatchReasons(criteria, freelancer, score),
            estimatedCompletionTime: this.estimateCompletionTime(criteria, freelancer)
          };
        })
      );

      // Filter by minimum score and sort by score descending
      const validMatches = scoredMatches
        .filter(match => match.score >= AI_MATCHING_CONFIG.MIN_MATCH_SCORE)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

      return validMatches;
    } catch (error) {
      console.error('Error finding matches:', error);
      throw new Error('Failed to find freelancer matches');
    }
  }

  /**
   * Calculate a match score between a task and a freelancer
   * @param criteria Task criteria
   * @param freelancer Freelancer profile
   * @returns Match score (0-100)
   */
  private async calculateMatchScore(
    criteria: MatchingCriteria,
    freelancer: FreelancerProfile
  ): Promise<number> {
    let totalScore = 0;
    let maxPossibleScore = 0;

    // 1. Skill matching (most important)
    const skillScore = this.calculateSkillScore(criteria.requiredSkills, freelancer.skills);
    totalScore += skillScore * AI_MATCHING_CONFIG.EXACT_SKILL_MATCH_WEIGHT;
    maxPossibleScore += 100 * AI_MATCHING_CONFIG.EXACT_SKILL_MATCH_WEIGHT;

    // 2. Reputation score
    const reputationScore = Math.min(freelancer.reputation, 100);
    totalScore += reputationScore * AI_MATCHING_CONFIG.REPUTATION_WEIGHT;
    maxPossibleScore += 100 * AI_MATCHING_CONFIG.REPUTATION_WEIGHT;

    // 3. Experience score (based on completed tasks)
    const experienceScore = this.calculateExperienceScore(freelancer.completedTasks);
    totalScore += experienceScore * AI_MATCHING_CONFIG.EXPERIENCE_WEIGHT;
    maxPossibleScore += 100 * AI_MATCHING_CONFIG.EXPERIENCE_WEIGHT;

    // 4. Success rate score
    const successScore = Math.min(freelancer.successRate, 100);
    totalScore += successScore * AI_MATCHING_CONFIG.COMPLETION_RATE_WEIGHT;
    maxPossibleScore += 100 * AI_MATCHING_CONFIG.COMPLETION_RATE_WEIGHT;

    // 5. Response time score (faster is better)
    const responseScore = this.calculateResponseTimeScore(freelancer.responseTime);
    totalScore += responseScore * AI_MATCHING_CONFIG.RESPONSE_TIME_WEIGHT;
    maxPossibleScore += 100 * AI_MATCHING_CONFIG.RESPONSE_TIME_WEIGHT;

    // 6. Urgency bonus (if task is urgent and freelancer has fast response time)
    if (criteria.isUrgent && freelancer.responseTime <= 2) {
      totalScore += 10; // Bonus points for urgent tasks
    }

    // 7. Budget compatibility (prefer freelancers who typically work in this budget range)
    const budgetScore = this.calculateBudgetCompatibility(criteria.budgetUSD, freelancer);
    totalScore += budgetScore * 3; // Lower weight for budget compatibility
    maxPossibleScore += 100 * 3;

    // Normalize to 0-100 scale
    return Math.min(100, (totalScore / maxPossibleScore) * 100);
  }

  /**
   * Calculate skill matching score
   */
  private calculateSkillScore(requiredSkills: string[], freelancerSkills: string[]): number {
    if (requiredSkills.length === 0) return 100;

    const normalizedRequired = requiredSkills.map(skill => skill.toLowerCase().trim());
    const normalizedFreelancer = freelancerSkills.map(skill => skill.toLowerCase().trim());

    let exactMatches = 0;
    let partialMatches = 0;

    for (const required of normalizedRequired) {
      // Check for exact matches
      if (normalizedFreelancer.includes(required)) {
        exactMatches++;
      } else {
        // Check for partial matches (similar skills)
        const hasPartialMatch = normalizedFreelancer.some(skill => 
          skill.includes(required) || required.includes(skill) || 
          this.areSkillsRelated(required, skill)
        );
        if (hasPartialMatch) {
          partialMatches++;
        }
      }
    }

    const exactMatchScore = (exactMatches / normalizedRequired.length) * 100;
    const partialMatchScore = (partialMatches / normalizedRequired.length) * 50;

    return Math.min(100, exactMatchScore + partialMatchScore);
  }

  /**
   * Check if two skills are related
   */
  private areSkillsRelated(skill1: string, skill2: string): boolean {
    // Check if skills are in the same category
    for (const [category, skills] of Object.entries(AI_MATCHING_CONFIG.SKILL_CATEGORIES)) {
      const categorySkills = skills.map(s => s.toLowerCase());
      if (categorySkills.includes(skill1) && categorySkills.includes(skill2)) {
        return true;
      }
    }

    // Check for common synonyms/related terms
    const relatedSkills: { [key: string]: string[] } = {
      'javascript': ['js', 'react', 'node.js', 'typescript', 'vue', 'angular'],
      'python': ['django', 'flask', 'machine learning', 'data analysis'],
      'design': ['ui', 'ux', 'graphic design', 'figma', 'photoshop'],
      'marketing': ['social media', 'content', 'seo', 'copywriting'],
      'web3': ['blockchain', 'solidity', 'defi', 'smart contracts']
    };

    for (const [baseSkill, related] of Object.entries(relatedSkills)) {
      if ((skill1.includes(baseSkill) || baseSkill.includes(skill1)) &&
          (skill2.includes(baseSkill) || baseSkill.includes(skill2) || 
           related.some(r => skill2.includes(r) || r.includes(skill2)))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate experience score based on completed tasks
   */
  private calculateExperienceScore(completedTasks: number): number {
    // More tasks = higher score, with diminishing returns
    if (completedTasks === 0) return 0;
    if (completedTasks >= 50) return 100;
    
    // Logarithmic scale to avoid extreme advantages for very high task counts
    return Math.min(100, (Math.log(completedTasks + 1) / Math.log(51)) * 100);
  }

  /**
   * Calculate response time score (lower response time = higher score)
   */
  private calculateResponseTimeScore(responseTimeHours: number): number {
    if (responseTimeHours <= 1) return 100;
    if (responseTimeHours <= 4) return 90;
    if (responseTimeHours <= 12) return 75;
    if (responseTimeHours <= 24) return 60;
    if (responseTimeHours <= 48) return 40;
    return 20;
  }

  /**
   * Calculate budget compatibility score
   */
  private calculateBudgetCompatibility(taskBudget: number, freelancer: FreelancerProfile): number {
    // This is a simplified calculation - in reality, you'd look at freelancer's historical earnings
    const avgTaskValue = freelancer.totalEarned > 0 && freelancer.completedTasks > 0 
      ? freelancer.totalEarned / freelancer.completedTasks 
      : taskBudget;

    const ratio = Math.min(taskBudget / avgTaskValue, avgTaskValue / taskBudget);
    return ratio * 100;
  }

  /**
   * Get matching skills between required and freelancer skills
   */
  private getMatchingSkills(requiredSkills: string[], freelancerSkills: string[]): string[] {
    const normalizedRequired = requiredSkills.map(skill => skill.toLowerCase().trim());
    const normalizedFreelancer = freelancerSkills.map(skill => skill.toLowerCase().trim());

    return requiredSkills.filter(required => 
      normalizedFreelancer.includes(required.toLowerCase().trim()) ||
      normalizedFreelancer.some(skill => this.areSkillsRelated(required.toLowerCase(), skill))
    );
  }

  /**
   * Generate human-readable reasons for the match
   */
  private generateMatchReasons(
    criteria: MatchingCriteria,
    freelancer: FreelancerProfile,
    score: number
  ): string[] {
    const reasons: string[] = [];

    const matchingSkills = this.getMatchingSkills(criteria.requiredSkills, freelancer.skills);
    if (matchingSkills.length > 0) {
      reasons.push(`Matches ${matchingSkills.length} required skill(s): ${matchingSkills.join(', ')}`);
    }

    if (freelancer.reputation >= 90) {
      reasons.push('Excellent reputation (90+)');
    } else if (freelancer.reputation >= 75) {
      reasons.push('Good reputation (75+)');
    }

    if (freelancer.completedTasks >= 20) {
      reasons.push(`Experienced with ${freelancer.completedTasks} completed tasks`);
    }

    if (freelancer.successRate >= 95) {
      reasons.push('Very high success rate (95%+)');
    } else if (freelancer.successRate >= 85) {
      reasons.push('High success rate (85%+)');
    }

    if (freelancer.responseTime <= 2) {
      reasons.push('Fast response time (under 2 hours)');
    } else if (freelancer.responseTime <= 12) {
      reasons.push('Good response time (under 12 hours)');
    }

    if (criteria.isUrgent && freelancer.responseTime <= 4) {
      reasons.push('Available for urgent tasks');
    }

    if (score >= AI_MATCHING_CONFIG.EXCELLENT_MATCH_SCORE) {
      reasons.push('Excellent overall match');
    } else if (score >= AI_MATCHING_CONFIG.RECOMMENDED_MATCH_SCORE) {
      reasons.push('Recommended match');
    }

    return reasons;
  }

  /**
   * Estimate completion time based on task and freelancer profile
   */
  private estimateCompletionTime(
    criteria: MatchingCriteria,
    freelancer: FreelancerProfile
  ): number {
    // Base time estimate based on budget (rough approximation)
    let baseHours = criteria.budgetUSD / 25; // Assuming $25/hour average

    // Adjust based on freelancer's average completion time
    const freelancerMultiplier = freelancer.averageCompletionTime > 0 
      ? freelancer.averageCompletionTime / baseHours 
      : 1;

    // Adjust based on skill match (better match = faster completion)
    const skillMatchScore = this.calculateSkillScore(criteria.requiredSkills, freelancer.skills);
    const skillMultiplier = 1 - (skillMatchScore / 200); // Max 50% reduction for perfect match

    // Adjust for urgency
    const urgencyMultiplier = criteria.isUrgent ? 0.8 : 1;

    const estimatedHours = baseHours * freelancerMultiplier * skillMultiplier * urgencyMultiplier;

    return Math.max(1, Math.round(estimatedHours)); // Minimum 1 hour
  }

  /**
   * Get all freelancer profiles
   * In production, this would be optimized with proper querying/caching
   */
  private async getAllFreelancers(): Promise<FreelancerProfile[]> {
    try {
      // This is a mock implementation
      // In reality, you'd query your database or cache for freelancer profiles
      const mockFreelancers: FreelancerProfile[] = [
        {
          address: '0x1234567890123456789012345678901234567890',
          skills: ['javascript', 'react', 'node.js', 'web3'],
          reputation: 85,
          completedTasks: 15,
          averageCompletionTime: 24,
          successRate: 93,
          responseTime: 2
        },
        {
          address: '0x2345678901234567890123456789012345678901',
          skills: ['python', 'data analysis', 'machine learning'],
          reputation: 92,
          completedTasks: 28,
          averageCompletionTime: 36,
          successRate: 96,
          responseTime: 1.5
        },
        {
          address: '0x3456789012345678901234567890123456789012',
          skills: ['ui/ux', 'figma', 'graphic design', 'branding'],
          reputation: 88,
          completedTasks: 22,
          averageCompletionTime: 18,
          successRate: 91,
          responseTime: 3
        }
      ];

      return mockFreelancers;
    } catch (error) {
      console.error('Error getting freelancers:', error);
      return [];
    }
  }

  /**
   * Update freelancer profile with new task completion data
   */
  async updateFreelancerProfile(
    freelancerAddress: string,
    taskCompletionTime: number,
    success: boolean
  ): Promise<void> {
    try {
      // In production, this would update the database/cache
      console.log(`Updating freelancer ${freelancerAddress} profile:`, {
        taskCompletionTime,
        success
      });
    } catch (error) {
      console.error('Error updating freelancer profile:', error);
    }
  }

  /**
   * Get recommended freelancers for a task (cached results)
   */
  async getRecommendedFreelancers(taskId: number): Promise<MatchResult[]> {
    try {
      // Get task details
      const task = await blockchainService.getTask(taskId);
      
      const criteria: MatchingCriteria = {
        taskId,
        requiredSkills: task.requiredSkills,
        budgetUSD: task.budgetUSD,
        deadline: task.deadline,
        isUrgent: task.isUrgent,
        clientReputation: 75 // Default client reputation
      };

      return await this.findMatches(criteria, 5);
    } catch (error) {
      console.error('Error getting recommended freelancers:', error);
      throw new Error('Failed to get recommended freelancers');
    }
  }
}

// Export singleton instance
export const matchingService = new MatchingService();
