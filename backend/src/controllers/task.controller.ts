/**
 * Task Controller
 * Handles all task-related API endpoints
 */

import { Request, Response } from 'express';
import { 
  CreateTaskRequest, 
  SubmitBidRequest, 
  TaskFilters, 
  BidFilters,
  ApiResponse,
  TaskResponse,
  BidResponse
} from '../types';
import { blockchainService } from '../services/blockchain.service';
import { matchingService } from '../services/matching.service';
import { integrationService } from '../services/integration.service';
import { BUSINESS_RULES, PAGINATION } from '../../constants';

export class TaskController {
  
  /**
   * Create a new task
   */
  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const taskData: CreateTaskRequest = req.body;
      const clientAddress = req.user?.address; // Assuming auth middleware sets this

      if (!clientAddress) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Validate task data
      const validationError = this.validateTaskData(taskData);
      if (validationError) {
        res.status(400).json({
          success: false,
          error: validationError
        });
        return;
      }

      // Check if user is registered
      const isRegistered = await blockchainService.isUserRegistered(clientAddress);
      if (!isRegistered) {
        res.status(400).json({
          success: false,
          error: 'User must be registered to create tasks'
        });
        return;
      }

      // Use integration service for complete workflow
      const result = await integrationService.createTaskWorkflow(taskData, clientAddress);

      const response: ApiResponse = {
        success: true,
        data: {
          taskId: result.taskId,
          transaction: result.transaction,
          aiMatches: result.aiMatches?.slice(0, 3), // Top 3 AI matches
          gaslessOptions: result.gaslessOptions
        },
        message: 'Task created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create task'
      });
    }
  }

  /**
   * Get task by ID
   */
  async getTask(req: Request, res: Response): Promise<void> {
    try {
      const taskId = parseInt(req.params.taskId);
      
      if (isNaN(taskId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid task ID'
        });
        return;
      }

      const task = await blockchainService.getTask(taskId);
      const bids = await blockchainService.getTaskBids(taskId);
      
      // Get client info
      const clientInfo = await blockchainService.getUser(task.client);
      
      // Get freelancer info if assigned
      let freelancerInfo = null;
      if (task.selectedFreelancer && task.selectedFreelancer !== '0x0000000000000000000000000000000000000000') {
        freelancerInfo = await blockchainService.getUser(task.selectedFreelancer);
      }

      const taskResponse: TaskResponse = {
        ...task,
        clientInfo: {
          address: clientInfo.userAddress,
          reputation: clientInfo.reputation,
          isVerified: clientInfo.isVerified
        },
        freelancerInfo: freelancerInfo ? {
          address: freelancerInfo.userAddress,
          reputation: freelancerInfo.reputation,
          isVerified: freelancerInfo.isVerified
        } : undefined,
        bidsCount: bids.length
      };

      const response: ApiResponse<TaskResponse> = {
        success: true,
        data: taskResponse
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get task'
      });
    }
  }

  /**
   * Get tasks with filters and pagination
   */
  async getTasks(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || PAGINATION.DEFAULT_PAGE;
      const limit = Math.min(
        parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT,
        PAGINATION.MAX_LIMIT
      );

      const filters: TaskFilters = {
        status: req.query.status ? parseInt(req.query.status as string) : undefined,
        skills: req.query.skills ? (req.query.skills as string).split(',') : undefined,
        minBudget: req.query.minBudget ? parseFloat(req.query.minBudget as string) : undefined,
        maxBudget: req.query.maxBudget ? parseFloat(req.query.maxBudget as string) : undefined,
        isUrgent: req.query.isUrgent ? req.query.isUrgent === 'true' : undefined,
        clientAddress: req.query.client as string
      };

      // Get platform stats to know total tasks
      const stats = await blockchainService.getPlatformStats();
      
      // Calculate pagination
      const offset = (page - 1) * limit;
      const totalTasks = stats.totalTasks;
      const totalPages = Math.ceil(totalTasks / limit);

      // Get tasks (simplified - in production you'd implement proper filtering)
      const tasks: TaskResponse[] = [];
      
      for (let i = Math.max(1, stats.nextTaskId - offset - limit); 
           i < Math.min(stats.nextTaskId, stats.nextTaskId - offset); 
           i++) {
        try {
          const task = await blockchainService.getTask(i);
          const clientInfo = await blockchainService.getUser(task.client);
          const bids = await blockchainService.getTaskBids(i);

          // Apply filters
          if (this.shouldIncludeTask(task, filters)) {
            tasks.push({
              ...task,
              clientInfo: {
                address: clientInfo.userAddress,
                reputation: clientInfo.reputation,
                isVerified: clientInfo.isVerified
              },
              bidsCount: bids.length
            });
          }
        } catch (error) {
          // Skip tasks that don't exist or have errors
          continue;
        }
      }

      const response: ApiResponse<TaskResponse[]> = {
        success: true,
        data: tasks,
        pagination: {
          page,
          limit,
          total: totalTasks,
          totalPages
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tasks'
      });
    }
  }

  /**
   * Submit a bid for a task
   */
  async submitBid(req: Request, res: Response): Promise<void> {
    try {
      const bidData: SubmitBidRequest = req.body;
      const freelancerAddress = req.user?.address;

      if (!freelancerAddress) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Validate bid data
      const validationError = this.validateBidData(bidData);
      if (validationError) {
        res.status(400).json({
          success: false,
          error: validationError
        });
        return;
      }

      // Check if user is registered
      const isRegistered = await blockchainService.isUserRegistered(freelancerAddress);
      if (!isRegistered) {
        res.status(400).json({
          success: false,
          error: 'User must be registered to submit bids'
        });
        return;
      }

      // Convert estimated delivery to timestamp
      const estimatedDelivery = new Date(bidData.estimatedDelivery).getTime() / 1000;

      // Submit bid on blockchain
      const transaction = await blockchainService.submitBid(
        bidData.taskId,
        bidData.proposedPrice,
        bidData.proposal,
        estimatedDelivery,
        freelancerAddress
      );

      const response: ApiResponse = {
        success: true,
        data: { transaction },
        message: 'Bid submitted successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error submitting bid:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit bid'
      });
    }
  }

  /**
   * Get bids for a task
   */
  async getTaskBids(req: Request, res: Response): Promise<void> {
    try {
      const taskId = parseInt(req.params.taskId);
      
      if (isNaN(taskId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid task ID'
        });
        return;
      }

      const bids = await blockchainService.getTaskBids(taskId);
      
      // Enrich bids with freelancer information
      const enrichedBids: BidResponse[] = await Promise.all(
        bids.map(async (bid) => {
          const freelancerInfo = await blockchainService.getUser(bid.freelancer);
          return {
            ...bid,
            freelancerInfo: {
              address: freelancerInfo.userAddress,
              reputation: freelancerInfo.reputation,
              completedTasks: freelancerInfo.completedTasks,
              isVerified: freelancerInfo.isVerified,
              skills: freelancerInfo.skills
            }
          };
        })
      );

      const response: ApiResponse<BidResponse[]> = {
        success: true,
        data: enrichedBids
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting task bids:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get task bids'
      });
    }
  }

  /**
   * Accept a bid
   */
  async acceptBid(req: Request, res: Response): Promise<void> {
    try {
      const taskId = parseInt(req.params.taskId);
      const bidIndex = parseInt(req.body.bidIndex);
      const clientAddress = req.user?.address;

      if (!clientAddress) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (isNaN(taskId) || isNaN(bidIndex)) {
        res.status(400).json({
          success: false,
          error: 'Invalid task ID or bid index'
        });
        return;
      }

      // Verify client owns the task
      const task = await blockchainService.getTask(taskId);
      if (task.client.toLowerCase() !== clientAddress.toLowerCase()) {
        res.status(403).json({
          success: false,
          error: 'Only task client can accept bids'
        });
        return;
      }

      // Accept bid on blockchain
      const transaction = await blockchainService.acceptBid(taskId, bidIndex, clientAddress);

      const response: ApiResponse = {
        success: true,
        data: { transaction },
        message: 'Bid accepted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error accepting bid:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to accept bid'
      });
    }
  }

  /**
   * Complete a task
   */
  async completeTask(req: Request, res: Response): Promise<void> {
    try {
      const taskId = parseInt(req.params.taskId);
      const clientAddress = req.user?.address;

      if (!clientAddress) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (isNaN(taskId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid task ID'
        });
        return;
      }

      // Verify client owns the task
      const task = await blockchainService.getTask(taskId);
      if (task.client.toLowerCase() !== clientAddress.toLowerCase()) {
        res.status(403).json({
          success: false,
          error: 'Only task client can complete tasks'
        });
        return;
      }

      // Complete task on blockchain
      const transaction = await blockchainService.completeTask(taskId, clientAddress);

      const response: ApiResponse = {
        success: true,
        data: { transaction },
        message: 'Task completed successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error completing task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete task'
      });
    }
  }

  /**
   * Get recommended freelancers for a task
   */
  async getTaskRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const taskId = parseInt(req.params.taskId);
      
      if (isNaN(taskId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid task ID'
        });
        return;
      }

      const recommendations = await matchingService.getRecommendedFreelancers(taskId);

      const response: ApiResponse = {
        success: true,
        data: recommendations
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting task recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get task recommendations'
      });
    }
  }

  // Private helper methods

  private validateTaskData(taskData: CreateTaskRequest): string | null {
    if (!taskData.title || taskData.title.trim().length === 0) {
      return 'Title is required';
    }

    if (!taskData.description || taskData.description.trim().length === 0) {
      return 'Description is required';
    }

    if (!taskData.requiredSkills || taskData.requiredSkills.length === 0) {
      return 'At least one required skill must be specified';
    }

    if (!taskData.budgetUSD || taskData.budgetUSD < BUSINESS_RULES.MIN_TASK_BUDGET_USD) {
      return `Budget must be at least $${BUSINESS_RULES.MIN_TASK_BUDGET_USD}`;
    }

    if (taskData.budgetUSD > BUSINESS_RULES.MAX_TASK_BUDGET_USD) {
      return `Budget cannot exceed $${BUSINESS_RULES.MAX_TASK_BUDGET_USD}`;
    }

    const deadline = new Date(taskData.deadline);
    const now = new Date();
    const minDeadline = new Date(now.getTime() + BUSINESS_RULES.MIN_TASK_DEADLINE_HOURS * 60 * 60 * 1000);
    const maxDeadline = new Date(now.getTime() + BUSINESS_RULES.MAX_TASK_DEADLINE_DAYS * 24 * 60 * 60 * 1000);

    if (deadline < minDeadline) {
      return `Deadline must be at least ${BUSINESS_RULES.MIN_TASK_DEADLINE_HOURS} hours from now`;
    }

    if (deadline > maxDeadline) {
      return `Deadline cannot be more than ${BUSINESS_RULES.MAX_TASK_DEADLINE_DAYS} days from now`;
    }

    return null;
  }

  private validateBidData(bidData: SubmitBidRequest): string | null {
    if (!bidData.taskId || isNaN(bidData.taskId)) {
      return 'Valid task ID is required';
    }

    if (!bidData.proposedPrice || bidData.proposedPrice < BUSINESS_RULES.MIN_BID_AMOUNT_USD) {
      return `Proposed price must be at least $${BUSINESS_RULES.MIN_BID_AMOUNT_USD}`;
    }

    if (!bidData.proposal || bidData.proposal.trim().length === 0) {
      return 'Proposal description is required';
    }

    if (!bidData.estimatedDelivery) {
      return 'Estimated delivery date is required';
    }

    const deliveryDate = new Date(bidData.estimatedDelivery);
    const now = new Date();

    if (deliveryDate <= now) {
      return 'Estimated delivery must be in the future';
    }

    return null;
  }

  private shouldIncludeTask(task: any, filters: TaskFilters): boolean {
    if (filters.status !== undefined && task.status !== filters.status) {
      return false;
    }

    if (filters.minBudget !== undefined && task.budgetUSD < filters.minBudget) {
      return false;
    }

    if (filters.maxBudget !== undefined && task.budgetUSD > filters.maxBudget) {
      return false;
    }

    if (filters.isUrgent !== undefined && task.isUrgent !== filters.isUrgent) {
      return false;
    }

    if (filters.clientAddress && task.client.toLowerCase() !== filters.clientAddress.toLowerCase()) {
      return false;
    }

    if (filters.skills && filters.skills.length > 0) {
      const hasMatchingSkill = filters.skills.some(skill =>
        task.requiredSkills.some((taskSkill: string) =>
          taskSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );
      if (!hasMatchingSkill) {
        return false;
      }
    }

    return true;
  }
}

export const taskController = new TaskController();
