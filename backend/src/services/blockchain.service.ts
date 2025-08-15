/**
 * Blockchain service for interacting with SwiftyTask smart contract
 * Handles all blockchain operations including reading contract state and sending transactions
 */

import { ethers, Contract, JsonRpcProvider, Wallet } from 'ethers';
import { 
  Task, 
  Bid, 
  User, 
  Dispute, 
  TaskStatus, 
  BidStatus,
  ContractTransaction,
  GaslessTransactionRequest 
} from '../types';

// Import contract ABI (you'll need to copy this from the compiled contract)
// import contractABI from '../../../contracts/artifacts/contracts/SwiftyTaskMain.sol/SwiftyTaskMain.json';
import contractABI from '../ABI/contract_abi.json';

export class BlockchainService {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private contract: Contract;
  private contractAddress: string;

  constructor() {
    // Initialize provider for Mantle testnet
    this.provider = new JsonRpcProvider(
      process.env.MANTLE_RPC_URL || 'https://rpc.testnet.mantle.xyz'
    );

    // Initialize wallet (for admin functions)
    if (process.env.PRIVATE_KEY) {
      this.wallet = new Wallet(process.env.PRIVATE_KEY, this.provider);
    } else {
      throw new Error('PRIVATE_KEY environment variable is required');
    }

    // Initialize contract
    this.contractAddress = process.env.CONTRACT_ADDRESS || '';
    if (!this.contractAddress) {
      throw new Error('CONTRACT_ADDRESS environment variable is required');
    }

    this.contract = new Contract(
      this.contractAddress,
      contractABI.abi,
      this.wallet
    );
  }

  /**
   * Get current gas price for Mantle network
   */
  async getGasPrice(): Promise<bigint> {
    try {
      const gasPrice = await this.provider.getFeeData();
      return gasPrice.gasPrice || BigInt(1000000000); // 1 gwei default
    } catch (error) {
      console.error('Error getting gas price:', error);
      return BigInt(1000000000); // Default 1 gwei
    }
  }

  /**
   * Get USDC to USD conversion rate from Chainlink
   */
  async getUSDToTokenRate(): Promise<number> {
    try {
      const rate = await this.contract.getUSDToTokenRate();
      return Number(rate);
    } catch (error) {
      console.error('Error getting USD to token rate:', error);
      throw new Error('Failed to get current exchange rate');
    }
  }

  /**
   * Register a new user on the platform
   */
  async registerUser(
    userAddress: string,
    skills: string[],
    profileHash: string
  ): Promise<ContractTransaction> {
    try {
      const gasPrice = await this.getGasPrice();
      
      const tx = await this.contract.registerUser(skills, profileHash, {
        gasPrice,
        gasLimit: 200000
      });

      await tx.wait();
      
      return {
        hash: tx.hash,
        blockNumber: tx.blockNumber,
        gasUsed: tx.gasUsed
      };
    } catch (error) {
      console.error('Error registering user:', error);
      throw new Error('Failed to register user on blockchain');
    }
  }

  /**
   * Create a new task
   */
  async createTask(
    title: string,
    description: string,
    requiredSkills: string[],
    budgetUSD: number,
    deadline: number,
    isUrgent: boolean,
    clientAddress: string
  ): Promise<{ taskId: number; transaction: ContractTransaction }> {
    try {
      const gasPrice = await this.getGasPrice();
      
      // Convert budget to wei (scaled by 1e8 as per contract)
      const budgetScaled = BigInt(budgetUSD * 1e8);
      
      const tx = await this.contract.createTask(
        title,
        description,
        requiredSkills,
        budgetScaled,
        deadline,
        isUrgent,
        {
          gasPrice,
          gasLimit: 300000
        }
      );

      const receipt = await tx.wait();
      
      // Extract task ID from event
      const taskCreatedEvent = receipt.logs.find(
        (log: any) => log.fragment?.name === 'TaskCreated'
      );
      
      const taskId = taskCreatedEvent ? Number(taskCreatedEvent.args[0]) : 0;

      return {
        taskId,
        transaction: {
          hash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed
        }
      };
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error('Failed to create task on blockchain');
    }
  }

  /**
   * Submit a bid for a task
   */
  async submitBid(
    taskId: number,
    proposedPrice: number,
    proposal: string,
    estimatedDelivery: number,
    freelancerAddress: string
  ): Promise<ContractTransaction> {
    try {
      const gasPrice = await this.getGasPrice();
      
      // Convert price to scaled format
      const priceScaled = BigInt(proposedPrice * 1e8);
      
      const tx = await this.contract.submitBid(
        taskId,
        priceScaled,
        proposal,
        estimatedDelivery,
        {
          gasPrice,
          gasLimit: 250000
        }
      );

      const receipt = await tx.wait();
      
      return {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed
      };
    } catch (error) {
      console.error('Error submitting bid:', error);
      throw new Error('Failed to submit bid on blockchain');
    }
  }

  /**
   * Accept a bid for a task
   */
  async acceptBid(
    taskId: number,
    bidIndex: number,
    clientAddress: string
  ): Promise<ContractTransaction> {
    try {
      const gasPrice = await this.getGasPrice();
      
      const tx = await this.contract.acceptBid(taskId, bidIndex, {
        gasPrice,
        gasLimit: 200000
      });

      const receipt = await tx.wait();
      
      return {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed
      };
    } catch (error) {
      console.error('Error accepting bid:', error);
      throw new Error('Failed to accept bid on blockchain');
    }
  }

  /**
   * Complete a task and release payment
   */
  async completeTask(
    taskId: number,
    clientAddress: string
  ): Promise<ContractTransaction> {
    try {
      const gasPrice = await this.getGasPrice();
      
      const tx = await this.contract.completeTask(taskId, {
        gasPrice,
        gasLimit: 300000
      });

      const receipt = await tx.wait();
      
      return {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed
      };
    } catch (error) {
      console.error('Error completing task:', error);
      throw new Error('Failed to complete task on blockchain');
    }
  }

  /**
   * Create a dispute for a task
   */
  async createDispute(
    taskId: number,
    reason: string,
    initiatorAddress: string
  ): Promise<ContractTransaction> {
    try {
      const gasPrice = await this.getGasPrice();
      
      const tx = await this.contract.createDispute(taskId, reason, {
        gasPrice,
        gasLimit: 200000
      });

      const receipt = await tx.wait();
      
      return {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed
      };
    } catch (error) {
      console.error('Error creating dispute:', error);
      throw new Error('Failed to create dispute on blockchain');
    }
  }

  /**
   * Get task details by ID
   */
  async getTask(taskId: number): Promise<Task> {
    try {
      const task = await this.contract.getTask(taskId);
      
      return {
        id: Number(task.id),
        client: task.client,
        title: task.title,
        description: task.description,
        requiredSkills: task.requiredSkills,
        budgetUSD: Number(task.budgetUSD) / 1e8, // Convert back to USD
        budgetTokens: Number(task.budgetTokens),
        deadline: Number(task.deadline),
        status: Number(task.status) as TaskStatus,
        selectedFreelancer: task.selectedFreelancer,
        createdAt: Number(task.createdAt),
        isUrgent: task.isUrgent,
        clientStake: Number(task.clientStake)
      };
    } catch (error) {
      console.error('Error getting task:', error);
      throw new Error('Failed to get task from blockchain');
    }
  }

  /**
   * Get all bids for a task
   */
  async getTaskBids(taskId: number): Promise<Bid[]> {
    try {
      const bids = await this.contract.getTaskBids(taskId);
      
      return bids.map((bid: any) => ({
        freelancer: bid.freelancer,
        taskId: Number(bid.taskId),
        proposedPrice: Number(bid.proposedPrice) / 1e8, // Convert back to USD
        proposal: bid.proposal,
        estimatedDelivery: Number(bid.estimatedDelivery),
        submittedAt: Number(bid.submittedAt),
        status: Number(bid.status) as BidStatus
      }));
    } catch (error) {
      console.error('Error getting task bids:', error);
      throw new Error('Failed to get task bids from blockchain');
    }
  }

  /**
   * Get user profile
   */
  async getUser(userAddress: string): Promise<User> {
    try {
      const user = await this.contract.getUser(userAddress);
      
      return {
        userAddress: user.userAddress,
        skills: user.skills,
        reputation: Number(user.reputation),
        completedTasks: Number(user.completedTasks),
        totalEarned: Number(user.totalEarned),
        isVerified: user.isVerified,
        joinedAt: Number(user.joinedAt),
        profileHash: user.profileHash
      };
    } catch (error) {
      console.error('Error getting user:', error);
      throw new Error('Failed to get user from blockchain');
    }
  }

  /**
   * Get user's tasks
   */
  async getUserTasks(userAddress: string): Promise<number[]> {
    try {
      const taskIds = await this.contract.getUserTasks(userAddress);
      return taskIds.map((id: any) => Number(id));
    } catch (error) {
      console.error('Error getting user tasks:', error);
      throw new Error('Failed to get user tasks from blockchain');
    }
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats(): Promise<{
    totalTasks: number;
    totalUsers: number;
    nextTaskId: number;
  }> {
    try {
      const [totalTasks, totalUsers, nextTaskId] = await Promise.all([
        this.contract.totalTasks(),
        this.contract.totalUsers(),
        this.contract.nextTaskId()
      ]);

      return {
        totalTasks: Number(totalTasks),
        totalUsers: Number(totalUsers),
        nextTaskId: Number(nextTaskId)
      };
    } catch (error) {
      console.error('Error getting platform stats:', error);
      throw new Error('Failed to get platform statistics');
    }
  }

  /**
   * Listen for contract events
   */
  setupEventListeners(): void {
    // Task events
    this.contract.on('TaskCreated', (taskId, client, title, budgetUSD, deadline, event) => {
      console.log('Task Created:', {
        taskId: Number(taskId),
        client,
        title,
        budgetUSD: Number(budgetUSD) / 1e8,
        deadline: Number(deadline)
      });
    });

    this.contract.on('BidSubmitted', (taskId, freelancer, proposedPrice, proposal, event) => {
      console.log('Bid Submitted:', {
        taskId: Number(taskId),
        freelancer,
        proposedPrice: Number(proposedPrice) / 1e8,
        proposal
      });
    });

    this.contract.on('TaskCompleted', (taskId, freelancer, paymentAmount, event) => {
      console.log('Task Completed:', {
        taskId: Number(taskId),
        freelancer,
        paymentAmount: Number(paymentAmount)
      });
    });

    this.contract.on('DisputeCreated', (taskId, initiator, reason, event) => {
      console.log('Dispute Created:', {
        taskId: Number(taskId),
        initiator,
        reason
      });
    });
  }

  /**
   * Check if user is registered
   */
  async isUserRegistered(userAddress: string): Promise<boolean> {
    try {
      const user = await this.contract.users(userAddress);
      return user.userAddress !== ethers.ZeroAddress;
    } catch (error) {
      return false;
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(
    functionName: string,
    parameters: any[]
  ): Promise<bigint> {
    try {
      const gasEstimate = await this.contract[functionName].estimateGas(...parameters);
      return gasEstimate;
    } catch (error) {
      console.error('Error estimating gas:', error);
      return BigInt(500000); // Default gas limit
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
