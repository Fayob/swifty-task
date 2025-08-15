/**
 * Integration Service for SwiftyTask
 * Handles communication between contracts, backend, and external services
 */

import { ethers } from 'ethers';
import { blockchainService } from './blockchain.service';
import { matchingService } from './matching.service';
import { mockOrbService, mockParaService, mockPimlicoService } from './mock.service';
import { 
  Task, 
  User, 
  MatchResult, 
  CreateTaskRequest,
  SubmitBidRequest 
} from '../types';

export class IntegrationService {
  
  /**
   * Complete task creation workflow
   * Handles task creation, AI matching, and notifications
   */
  async createTaskWorkflow(
    taskData: CreateTaskRequest,
    clientAddress: string
  ): Promise<{
    taskId: number;
    transaction: any;
    aiMatches?: MatchResult[];
    gaslessOptions?: any;
  }> {
    try {
      // 1. Create task on blockchain
      const taskResult = await blockchainService.createTask(
        taskData.title,
        taskData.description,
        taskData.requiredSkills,
        taskData.budgetUSD,
        new Date(taskData.deadline).getTime() / 1000,
        taskData.isUrgent,
        clientAddress
      );

      // 2. Generate AI matches
      let aiMatches: MatchResult[] = [];
      try {
        const task = await blockchainService.getTask(taskResult.taskId);
        const matchCriteria = {
          taskId: taskResult.taskId,
          requiredSkills: task.requiredSkills,
          budgetUSD: task.budgetUSD,
          deadline: task.deadline,
          isUrgent: task.isUrgent,
          clientReputation: 75 // Default client reputation
        };

        aiMatches = await matchingService.findMatches(matchCriteria, 5);

        // Submit AI matches to contract if any found
        if (aiMatches.length > 0) {
          await this.submitAIMatches(taskResult.taskId, aiMatches);
        }
      } catch (aiError) {
        console.warn('AI matching failed:', aiError);
        // Continue without AI matches
      }

      // 3. Setup gasless transaction options
      let gaslessOptions;
      try {
        gaslessOptions = await mockPimlicoService.estimateGas(
          clientAddress,
          process.env.SWIFTY_TASK_MAIN_ADDRESS || '',
          '0x' // Encoded function data would go here
        );
      } catch (gaslessError) {
        console.warn('Gasless estimation failed:', gaslessError);
      }

      return {
        taskId: taskResult.taskId,
        transaction: taskResult.transaction,
        aiMatches,
        gaslessOptions
      };

    } catch (error) {
      console.error('Task creation workflow failed:', error);
      throw new Error('Failed to create task with full workflow');
    }
  }

  /**
   * Complete user registration workflow
   * Handles registration, verification, and profile setup
   */
  async registerUserWorkflow(
    userAddress: string,
    skills: string[],
    profileData: any
  ): Promise<{
    transaction: any;
    verification?: any;
    profileHash: string;
  }> {
    try {
      // 1. Create profile hash (in production, upload to IPFS)
      const profileHash = `QmProfile${Date.now()}${Math.random()}`;

      // 2. Register user on blockchain
      const transaction = await blockchainService.registerUser(
        userAddress,
        skills,
        profileHash
      );

      // 3. Attempt identity verification with Orb
      let verification;
      try {
        verification = await mockOrbService.verifyIdentity(userAddress);
        
        // Update verification status on blockchain if verified
        if (verification.isVerified) {
          // Note: This would require a separate transaction
          console.log(`User ${userAddress} verified with Orb`);
        }
      } catch (verificationError) {
        console.warn('Identity verification failed:', verificationError);
      }

      return {
        transaction,
        verification,
        profileHash
      };

    } catch (error) {
      console.error('User registration workflow failed:', error);
      throw new Error('Failed to register user with full workflow');
    }
  }

  /**
   * Complete bid submission workflow
   * Handles bid submission and notifications
   */
  async submitBidWorkflow(
    bidData: SubmitBidRequest,
    freelancerAddress: string
  ): Promise<{
    transaction: any;
    skillMatch?: any;
    gaslessOptions?: any;
  }> {
    try {
      // 1. Check skill compatibility
      const skillMatch = await this.checkSkillCompatibility(
        bidData.taskId,
        freelancerAddress
      );

      // 2. Submit bid on blockchain
      const transaction = await blockchainService.submitBid(
        bidData.taskId,
        bidData.proposedPrice,
        bidData.proposal,
        new Date(bidData.estimatedDelivery).getTime() / 1000,
        freelancerAddress
      );

      // 3. Setup gasless transaction options
      let gaslessOptions;
      try {
        gaslessOptions = await mockPimlicoService.estimateGas(
          freelancerAddress,
          process.env.SWIFTY_TASK_MAIN_ADDRESS || '',
          '0x' // Encoded function data would go here
        );
      } catch (gaslessError) {
        console.warn('Gasless estimation failed:', gaslessError);
      }

      return {
        transaction,
        skillMatch,
        gaslessOptions
      };

    } catch (error) {
      console.error('Bid submission workflow failed:', error);
      throw new Error('Failed to submit bid with full workflow');
    }
  }

  /**
   * Complete task completion workflow
   * Handles completion, payments, and reputation updates
   */
  async completeTaskWorkflow(
    taskId: number,
    clientAddress: string
  ): Promise<{
    transaction: any;
    reputationUpdates: any;
    paymentDetails: any;
  }> {
    try {
      // 1. Get task details before completion
      const task = await blockchainService.getTask(taskId);

      // 2. Complete task on blockchain
      const transaction = await blockchainService.completeTask(taskId, clientAddress);

      // 3. Update freelancer profile in matching service
      if (task.selectedFreelancer) {
        await matchingService.updateFreelancerProfile(
          task.selectedFreelancer,
          24, // Estimated completion time
          true // Successful completion
        );
      }

      // 4. Calculate payment details
      const platformFeeAmount = (task.budgetTokens * 0.025); // 2.5%
      const freelancerPayment = task.budgetTokens - platformFeeAmount;

      const paymentDetails = {
        freelancerPayment,
        platformFee: platformFeeAmount,
        clientStakeReturned: task.clientStake
      };

      // 5. Reputation updates (handled by blockchain service)
      const reputationUpdates = {
        freelancer: task.selectedFreelancer,
        client: task.client,
        positive: true
      };

      return {
        transaction,
        reputationUpdates,
        paymentDetails
      };

    } catch (error) {
      console.error('Task completion workflow failed:', error);
      throw new Error('Failed to complete task with full workflow');
    }
  }

  /**
   * Submit AI matches to smart contract
   */
  private async submitAIMatches(
    taskId: number,
    matches: MatchResult[]
  ): Promise<void> {
    try {
      // Format matches for smart contract
      const contractMatches = matches.map(match => ({
        freelancer: match.freelancer,
        score: match.score,
        matchingSkills: match.matchingSkills,
        estimatedCompletion: match.estimatedCompletionTime
      }));

      // Submit to contract (this would require the actual contract call)
      console.log(`Submitting ${matches.length} AI matches for task ${taskId}`);
      
      // Note: In a full implementation, this would call the contract's submitAIMatches function
      // await blockchainService.submitAIMatches(taskId, contractMatches);

    } catch (error) {
      console.error('Failed to submit AI matches:', error);
      throw error;
    }
  }

  /**
   * Check skill compatibility between freelancer and task
   */
  private async checkSkillCompatibility(
    taskId: number,
    freelancerAddress: string
  ): Promise<{
    hasMatchingSkills: boolean;
    matchingSkills: string[];
    compatibilityScore: number;
  }> {
    try {
      const task = await blockchainService.getTask(taskId);
      const freelancer = await blockchainService.getUser(freelancerAddress);

      const matchingSkills: string[] = [];
      
      // Check each required skill against freelancer skills
      for (const requiredSkill of task.requiredSkills) {
        for (const freelancerSkill of freelancer.skills) {
          if (requiredSkill.toLowerCase().includes(freelancerSkill.toLowerCase()) ||
              freelancerSkill.toLowerCase().includes(requiredSkill.toLowerCase())) {
            matchingSkills.push(requiredSkill);
            break;
          }
        }
      }

      const compatibilityScore = (matchingSkills.length / task.requiredSkills.length) * 100;

      return {
        hasMatchingSkills: matchingSkills.length > 0,
        matchingSkills,
        compatibilityScore
      };

    } catch (error) {
      console.error('Skill compatibility check failed:', error);
      return {
        hasMatchingSkills: false,
        matchingSkills: [],
        compatibilityScore: 0
      };
    }
  }

  /**
   * Get comprehensive task details with all related data
   */
  async getTaskWithDetails(taskId: number): Promise<{
    task: Task;
    bids: any[];
    aiMatches: MatchResult[];
    clientInfo: User;
    freelancerInfo?: User;
    skillMatches?: any;
  }> {
    try {
      // Get all data in parallel
      const [task, bids, clientInfo] = await Promise.all([
        blockchainService.getTask(taskId),
        blockchainService.getTaskBids(taskId),
        blockchainService.getUser(await blockchainService.getTask(taskId).then(t => t.client))
      ]);

      // Get AI matches
      let aiMatches: MatchResult[] = [];
      try {
        aiMatches = await matchingService.getRecommendedFreelancers(taskId);
      } catch (error) {
        console.warn('Failed to get AI matches:', error);
      }

      // Get freelancer info if assigned
      let freelancerInfo;
      if (task.selectedFreelancer && task.selectedFreelancer !== ethers.ZeroAddress) {
        freelancerInfo = await blockchainService.getUser(task.selectedFreelancer);
      }

      return {
        task,
        bids,
        aiMatches,
        clientInfo,
        freelancerInfo
      };

    } catch (error) {
      console.error('Failed to get task details:', error);
      throw new Error('Failed to get comprehensive task details');
    }
  }

  /**
   * Get platform analytics and statistics
   */
  async getPlatformAnalytics(): Promise<{
    blockchain: any;
    governance: any;
    matching: any;
    activity: any;
  }> {
    try {
      const [blockchainStats, governanceStats] = await Promise.all([
        blockchainService.getPlatformStats(),
        mockParaService.getGovernanceStats()
      ]);

      // Calculate matching statistics
      const matchingStats = {
        totalMatches: 150, // Mock data
        averageMatchScore: 75,
        matchAcceptanceRate: 68
      };

      // Calculate activity statistics
      const activityStats = {
        tasksCreatedToday: 12,
        bidsSubmittedToday: 45,
        tasksCompletedToday: 8,
        newUsersToday: 3
      };

      return {
        blockchain: blockchainStats,
        governance: governanceStats,
        matching: matchingStats,
        activity: activityStats
      };

    } catch (error) {
      console.error('Failed to get platform analytics:', error);
      throw new Error('Failed to get platform analytics');
    }
  }
}

// Export singleton instance
export const integrationService = new IntegrationService();
