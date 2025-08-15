/**
 * TypeScript type definitions for SwiftyTask backend
 */

// Enum definitions matching the smart contract
export enum TaskStatus {
  Open = 0,
  Assigned = 1,
  InProgress = 2,
  UnderReview = 3,
  Completed = 4,
  Disputed = 5,
  Cancelled = 6
}

export enum BidStatus {
  Pending = 0,
  Accepted = 1,
  Rejected = 2,
  Withdrawn = 3
}

export enum DisputeStatus {
  Open = 0,
  InProgress = 1,
  Resolved = 2,
  Escalated = 3
}

// Core data types matching smart contract structs
export interface Task {
  id: number;
  client: string;
  title: string;
  description: string;
  requiredSkills: string[];
  budgetUSD: number; // In USD scaled by 1e8
  budgetTokens: number; // Actual token amount
  deadline: number; // Unix timestamp
  status: TaskStatus;
  selectedFreelancer: string;
  createdAt: number; // Unix timestamp
  isUrgent: boolean;
  clientStake: number;
}

export interface Bid {
  freelancer: string;
  taskId: number;
  proposedPrice: number; // In USD scaled by 1e8
  proposal: string;
  estimatedDelivery: number; // Unix timestamp
  submittedAt: number; // Unix timestamp
  status: BidStatus;
}

export interface User {
  userAddress: string;
  skills: string[];
  reputation: number; // Out of 100
  completedTasks: number;
  totalEarned: number; // In tokens
  isVerified: boolean;
  joinedAt: number; // Unix timestamp
  profileHash: string; // IPFS hash
}

export interface Dispute {
  taskId: number;
  initiator: string;
  reason: string;
  createdAt: number; // Unix timestamp
  status: DisputeStatus;
  arbitrator: string;
}

// API request/response types
export interface CreateTaskRequest {
  title: string;
  description: string;
  requiredSkills: string[];
  budgetUSD: number;
  deadline: string; // ISO string, will be converted to timestamp
  isUrgent: boolean;
}

export interface SubmitBidRequest {
  taskId: number;
  proposedPrice: number;
  proposal: string;
  estimatedDelivery: string; // ISO string
}

export interface RegisterUserRequest {
  skills: string[];
  profileData: {
    name: string;
    bio: string;
    portfolio?: string;
    location?: string;
    hourlyRate?: number;
    languages?: string[];
  };
}

export interface CreateDisputeRequest {
  taskId: number;
  reason: string;
  evidence?: string[];
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TaskResponse extends Task {
  clientInfo: {
    address: string;
    reputation: number;
    isVerified: boolean;
  };
  freelancerInfo?: {
    address: string;
    reputation: number;
    isVerified: boolean;
  };
  bidsCount: number;
}

export interface BidResponse extends Bid {
  freelancerInfo: {
    address: string;
    reputation: number;
    completedTasks: number;
    isVerified: boolean;
    skills: string[];
  };
}

// Blockchain interaction types
export interface ContractTransaction {
  hash: string;
  blockNumber?: number;
  gasUsed?: number;
  status?: number;
}

export interface GaslessTransactionRequest {
  userAddress: string;
  functionName: string;
  parameters: any[];
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

// AI Matching types
export interface MatchingCriteria {
  taskId: number;
  requiredSkills: string[];
  budgetUSD: number;
  deadline: number;
  isUrgent: boolean;
  clientReputation: number;
}

export interface FreelancerProfile {
  address: string;
  skills: string[];
  reputation: number;
  completedTasks: number;
  averageCompletionTime: number; // in hours
  successRate: number; // percentage
  responseTime: number; // average response time in hours
}

export interface MatchResult {
  freelancer: string;
  score: number;
  matchingSkills: string[];
  reasons: string[];
  estimatedCompletionTime: number;
}

// Mock service response types
export interface OrbVerificationResponse {
  isVerified: boolean;
  verificationLevel: 'basic' | 'enhanced' | 'premium';
  verificationDate: string;
  riskScore: number; // 0-100, lower is better
}

export interface ParaGovernanceProposal {
  id: number;
  title: string;
  description: string;
  proposer: string;
  category: string;
  votesFor: number;
  votesAgainst: number;
  status: 'active' | 'passed' | 'rejected' | 'executed';
  deadline: number;
}

// Authentication types
export interface AuthRequest {
  address: string;
  signature: string;
  message: string;
  nonce: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresIn: number;
}

// Webhook types for external integrations
export interface ChainlinkAutomationWebhook {
  jobId: string;
  data: {
    taskIds: number[];
    action: 'timeout' | 'dispute_resolution' | 'payment_release';
  };
  timestamp: number;
}

// Analytics types
export interface PlatformAnalytics {
  totalTasks: number;
  completedTasks: number;
  totalUsers: number;
  totalVolume: number; // in USD
  averageTaskValue: number;
  averageCompletionTime: number; // in hours
  disputeRate: number; // percentage
  topSkills: { skill: string; count: number }[];
}

export interface UserAnalytics {
  userAddress: string;
  tasksCreated: number;
  tasksCompleted: number;
  totalSpent: number; // for clients
  totalEarned: number; // for freelancers
  averageRating: number;
  responseTime: number; // average in hours
  successRate: number; // percentage
}

// Error types
export interface CustomError extends Error {
  statusCode: number;
  isOperational: boolean;
}

// Pagination helper types
export interface PaginationQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TaskFilters {
  status?: TaskStatus;
  skills?: string[];
  minBudget?: number;
  maxBudget?: number;
  isUrgent?: boolean;
  clientAddress?: string;
}

export interface BidFilters {
  status?: BidStatus;
  taskId?: number;
  freelancerAddress?: string;
  minPrice?: number;
  maxPrice?: number;
}
