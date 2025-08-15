/**
 * User Controller
 * Handles all user-related API endpoints
 */

import { Request, Response } from 'express';
import { 
  RegisterUserRequest, 
  ApiResponse,
  UserAnalytics
} from '../types';
import { blockchainService } from '../services/blockchain.service';
import { mockOrbService } from '../services/mock.service';

export class UserController {
  
  /**
   * Register a new user
   */
  async registerUser(req: Request, res: Response): Promise<void> {
    try {
      const userData: RegisterUserRequest = req.body;
      const userAddress = req.user?.address;

      if (!userAddress) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Validate user data
      const validationError = this.validateUserData(userData);
      if (validationError) {
        res.status(400).json({
          success: false,
          error: validationError
        });
        return;
      }

      // Check if user is already registered
      const isRegistered = await blockchainService.isUserRegistered(userAddress);
      if (isRegistered) {
        res.status(400).json({
          success: false,
          error: 'User is already registered'
        });
        return;
      }

      // Create profile hash (in production, this would be stored in IPFS)
      const profileHash = `QmProfile${Date.now()}${Math.random()}`;

      // Register user on blockchain
      const transaction = await blockchainService.registerUser(
        userAddress,
        userData.skills,
        profileHash
      );

      const response: ApiResponse = {
        success: true,
        data: { 
          transaction,
          profileHash,
          userAddress
        },
        message: 'User registered successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register user'
      });
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.params.address || req.user?.address;

      if (!userAddress) {
        res.status(400).json({
          success: false,
          error: 'User address is required'
        });
        return;
      }

      // Get user from blockchain
      const user = await blockchainService.getUser(userAddress);
      
      if (user.userAddress === '0x0000000000000000000000000000000000000000') {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Get user's tasks
      const userTasks = await blockchainService.getUserTasks(userAddress);

      // Get verification status from Orb
      let verificationStatus = null;
      try {
        verificationStatus = await mockOrbService.getVerificationStatus(userAddress);
      } catch (error) {
        console.warn('Could not get verification status:', error);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          ...user,
          taskIds: userTasks,
          verificationStatus
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user profile'
      });
    }
  }

  /**
   * Update user skills
   */
  async updateUserSkills(req: Request, res: Response): Promise<void> {
    try {
      const { skills } = req.body;
      const userAddress = req.user?.address;

      if (!userAddress) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (!skills || !Array.isArray(skills) || skills.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Skills array is required'
        });
        return;
      }

      // Validate skills
      const validSkills = skills.filter(skill => 
        typeof skill === 'string' && skill.trim().length > 0
      );

      if (validSkills.length === 0) {
        res.status(400).json({
          success: false,
          error: 'At least one valid skill is required'
        });
        return;
      }

      // Note: This would require a smart contract function to update skills
      // For now, we'll simulate the update
      console.log(`Updating skills for ${userAddress}:`, validSkills);

      const response: ApiResponse = {
        success: true,
        data: { skills: validSkills },
        message: 'Skills updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating user skills:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user skills'
      });
    }
  }

  /**
   * Verify user identity with Orb
   */
  async verifyIdentity(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;

      if (!userAddress) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user is registered
      const isRegistered = await blockchainService.isUserRegistered(userAddress);
      if (!isRegistered) {
        res.status(400).json({
          success: false,
          error: 'User must be registered first'
        });
        return;
      }

      // Verify identity with Orb
      const verificationResult = await mockOrbService.verifyIdentity(userAddress);

      // Update verification status on blockchain (this would require a contract function)
      if (verificationResult.isVerified) {
        console.log(`User ${userAddress} verified with Orb`);
      }

      const response: ApiResponse = {
        success: true,
        data: verificationResult,
        message: verificationResult.isVerified ? 'Identity verified successfully' : 'Identity verification failed'
      };

      res.json(response);
    } catch (error) {
      console.error('Error verifying identity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify identity'
      });
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.params.address || req.user?.address;

      if (!userAddress) {
        res.status(400).json({
          success: false,
          error: 'User address is required'
        });
        return;
      }

      // Get user profile
      const user = await blockchainService.getUser(userAddress);
      
      if (user.userAddress === '0x0000000000000000000000000000000000000000') {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Get user's tasks
      const userTasks = await blockchainService.getUserTasks(userAddress);

      // Calculate analytics (simplified version)
      const analytics: UserAnalytics = {
        userAddress,
        tasksCreated: userTasks.length, // This is simplified - would need to distinguish client/freelancer tasks
        tasksCompleted: user.completedTasks,
        totalSpent: 0, // Would need to calculate from task history
        totalEarned: user.totalEarned,
        averageRating: user.reputation / 20, // Convert to 5-star scale
        responseTime: 0, // Would need to calculate from bid/response history
        successRate: user.completedTasks > 0 ? (user.completedTasks / (user.completedTasks + 1)) * 100 : 0 // Simplified
      };

      const response: ApiResponse<UserAnalytics> = {
        success: true,
        data: analytics
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting user analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user analytics'
      });
    }
  }

  /**
   * Get user's task history
   */
  async getUserTasks(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.params.address || req.user?.address;

      if (!userAddress) {
        res.status(400).json({
          success: false,
          error: 'User address is required'
        });
        return;
      }

      // Get user's task IDs
      const taskIds = await blockchainService.getUserTasks(userAddress);

      // Get task details
      const tasks = await Promise.all(
        taskIds.map(async (taskId) => {
          try {
            return await blockchainService.getTask(taskId);
          } catch (error) {
            console.warn(`Could not get task ${taskId}:`, error);
            return null;
          }
        })
      );

      // Filter out null tasks and separate by role
      const validTasks = tasks.filter(task => task !== null);
      const clientTasks = validTasks.filter(task => task!.client.toLowerCase() === userAddress.toLowerCase());
      const freelancerTasks = validTasks.filter(task => 
        task!.selectedFreelancer && task!.selectedFreelancer.toLowerCase() === userAddress.toLowerCase()
      );

      const response: ApiResponse = {
        success: true,
        data: {
          clientTasks,
          freelancerTasks,
          totalTasks: validTasks.length
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting user tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user tasks'
      });
    }
  }

  /**
   * Search users by skills
   */
  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const { skills, minReputation, verified } = req.query;

      // This is a simplified search - in production you'd have a proper user index
      console.log('Searching users with criteria:', { skills, minReputation, verified });

      // For now, return mock results
      const mockUsers = [
        {
          userAddress: '0x1234567890123456789012345678901234567890',
          skills: ['javascript', 'react', 'web3'],
          reputation: 85,
          completedTasks: 15,
          isVerified: true
        },
        {
          userAddress: '0x2345678901234567890123456789012345678901',
          skills: ['python', 'data analysis'],
          reputation: 92,
          completedTasks: 28,
          isVerified: true
        }
      ];

      const response: ApiResponse = {
        success: true,
        data: mockUsers
      };

      res.json(response);
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search users'
      });
    }
  }

  // Private helper methods

  private validateUserData(userData: RegisterUserRequest): string | null {
    if (!userData.skills || !Array.isArray(userData.skills) || userData.skills.length === 0) {
      return 'At least one skill is required';
    }

    // Validate each skill
    const invalidSkills = userData.skills.filter(skill => 
      typeof skill !== 'string' || skill.trim().length === 0
    );

    if (invalidSkills.length > 0) {
      return 'All skills must be non-empty strings';
    }

    if (userData.skills.length > 20) {
      return 'Maximum 20 skills allowed';
    }

    if (!userData.profileData) {
      return 'Profile data is required';
    }

    if (!userData.profileData.name || userData.profileData.name.trim().length === 0) {
      return 'Name is required';
    }

    if (!userData.profileData.bio || userData.profileData.bio.trim().length === 0) {
      return 'Bio is required';
    }

    if (userData.profileData.hourlyRate && userData.profileData.hourlyRate < 0) {
      return 'Hourly rate must be non-negative';
    }

    return null;
  }
}

export const userController = new UserController();
