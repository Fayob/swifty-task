/**
 * Mock Services for SwiftyTask
 * Simulates Orb identity verification and Para governance
 */

import axios from 'axios';
import { 
  OrbVerificationResponse, 
  ParaGovernanceProposal 
} from '../types';

export class MockOrbService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.ORB_API_URL || 'http://localhost:5001/api';
  }

  /**
   * Mock Orb identity verification
   * In production, this would integrate with Orb's actual API
   */
  async verifyIdentity(userAddress: string): Promise<OrbVerificationResponse> {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock verification logic - in reality this would be Orb's sophisticated verification
      const mockResult = this.generateMockVerification(userAddress);
      
      console.log(`Orb verification for ${userAddress}:`, mockResult);
      return mockResult;
    } catch (error) {
      console.error('Error with Orb verification:', error);
      throw new Error('Identity verification failed');
    }
  }

  /**
   * Generate mock verification result based on address
   */
  private generateMockVerification(userAddress: string): OrbVerificationResponse {
    // Use address to generate deterministic but varied results
    const addressSum = userAddress.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    
    // Determine verification level based on address characteristics
    let verificationLevel: 'basic' | 'enhanced' | 'premium';
    let riskScore: number;
    let isVerified: boolean;

    if (addressSum % 10 === 0) {
      // 10% get premium verification
      verificationLevel = 'premium';
      riskScore = Math.floor(Math.random() * 10); // 0-9 (very low risk)
      isVerified = true;
    } else if (addressSum % 3 === 0) {
      // 33% get enhanced verification
      verificationLevel = 'enhanced';
      riskScore = Math.floor(Math.random() * 25); // 0-24 (low risk)
      isVerified = true;
    } else if (addressSum % 2 === 0) {
      // 50% of remaining get basic verification
      verificationLevel = 'basic';
      riskScore = Math.floor(Math.random() * 40) + 10; // 10-49 (medium risk)
      isVerified = true;
    } else {
      // Some fail verification
      verificationLevel = 'basic';
      riskScore = Math.floor(Math.random() * 30) + 70; // 70-99 (high risk)
      isVerified = false;
    }

    return {
      isVerified,
      verificationLevel,
      verificationDate: new Date().toISOString(),
      riskScore
    };
  }

  /**
   * Check verification status
   */
  async getVerificationStatus(userAddress: string): Promise<OrbVerificationResponse | null> {
    try {
      // In production, this would check cached verification status
      return await this.verifyIdentity(userAddress);
    } catch (error) {
      console.error('Error getting verification status:', error);
      return null;
    }
  }
}

export class MockParaService {
  private baseUrl: string;
  private mockProposals: ParaGovernanceProposal[] = [];

  constructor() {
    this.baseUrl = process.env.PARA_GOVERNANCE_URL || 'http://localhost:5002/api';
    this.initializeMockProposals();
  }

  /**
   * Initialize some mock governance proposals
   */
  private initializeMockProposals(): void {
    this.mockProposals = [
      {
        id: 1,
        title: 'Add "Blockchain Development" as a verified skill category',
        description: 'Proposal to add blockchain development as an official skill category with verification requirements.',
        proposer: '0x1234567890123456789012345678901234567890',
        category: 'skill-categories',
        votesFor: 1250,
        votesAgainst: 230,
        status: 'active',
        deadline: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days from now
      },
      {
        id: 2,
        title: 'Reduce platform fee for tasks under $50',
        description: 'Proposal to reduce platform fee from 2.5% to 1.5% for micro-tasks under $50 to encourage small task creation.',
        proposer: '0x2345678901234567890123456789012345678901',
        category: 'platform-fees',
        votesFor: 890,
        votesAgainst: 450,
        status: 'active',
        deadline: Date.now() + 5 * 24 * 60 * 60 * 1000 // 5 days from now
      },
      {
        id: 3,
        title: 'Implement reputation bonus for verified users',
        description: 'Proposal to give a +5 reputation bonus to users who complete Orb identity verification.',
        proposer: '0x3456789012345678901234567890123456789012',
        category: 'reputation-system',
        votesFor: 2100,
        votesAgainst: 120,
        status: 'passed',
        deadline: Date.now() - 2 * 24 * 60 * 60 * 1000 // 2 days ago
      }
    ];
  }

  /**
   * Get all active governance proposals
   */
  async getActiveProposals(): Promise<ParaGovernanceProposal[]> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return this.mockProposals.filter(proposal => 
        proposal.status === 'active' || proposal.status === 'passed'
      );
    } catch (error) {
      console.error('Error getting governance proposals:', error);
      throw new Error('Failed to get governance proposals');
    }
  }

  /**
   * Get proposal by ID
   */
  async getProposal(proposalId: number): Promise<ParaGovernanceProposal | null> {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return this.mockProposals.find(p => p.id === proposalId) || null;
    } catch (error) {
      console.error('Error getting proposal:', error);
      return null;
    }
  }

  /**
   * Vote on a proposal
   */
  async voteOnProposal(
    proposalId: number,
    voterAddress: string,
    support: boolean,
    votingPower: number = 1
  ): Promise<boolean> {
    try {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const proposal = this.mockProposals.find(p => p.id === proposalId);
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      if (proposal.status !== 'active') {
        throw new Error('Proposal is not active');
      }

      if (Date.now() > proposal.deadline) {
        throw new Error('Voting period has ended');
      }

      // Update vote counts
      if (support) {
        proposal.votesFor += votingPower;
      } else {
        proposal.votesAgainst += votingPower;
      }

      console.log(`Vote recorded: ${voterAddress} voted ${support ? 'FOR' : 'AGAINST'} proposal ${proposalId}`);
      
      return true;
    } catch (error) {
      console.error('Error voting on proposal:', error);
      throw new Error('Failed to record vote');
    }
  }

  /**
   * Create a new governance proposal
   */
  async createProposal(
    title: string,
    description: string,
    category: string,
    proposerAddress: string
  ): Promise<ParaGovernanceProposal> {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newProposal: ParaGovernanceProposal = {
        id: this.mockProposals.length + 1,
        title,
        description,
        proposer: proposerAddress,
        category,
        votesFor: 0,
        votesAgainst: 0,
        status: 'active',
        deadline: Date.now() + 14 * 24 * 60 * 60 * 1000 // 14 days from now
      };

      this.mockProposals.push(newProposal);
      
      console.log(`New proposal created: ${title} by ${proposerAddress}`);
      
      return newProposal;
    } catch (error) {
      console.error('Error creating proposal:', error);
      throw new Error('Failed to create proposal');
    }
  }

  /**
   * Get voting power for a user (based on reputation and completed tasks)
   */
  async getVotingPower(userAddress: string): Promise<number> {
    try {
      // Mock calculation based on user activity
      // In production, this would query user's reputation and task history
      const addressSum = userAddress.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      
      // Base voting power of 1, with bonuses for activity
      let votingPower = 1;
      
      // Reputation bonus (mock calculation)
      if (addressSum % 100 > 80) votingPower += 2; // High reputation users
      else if (addressSum % 100 > 60) votingPower += 1; // Medium reputation users
      
      // Task completion bonus
      if (addressSum % 50 > 40) votingPower += 1; // Active users
      
      return Math.min(votingPower, 5); // Cap at 5 voting power
    } catch (error) {
      console.error('Error getting voting power:', error);
      return 1; // Default voting power
    }
  }

  /**
   * Get governance statistics
   */
  async getGovernanceStats(): Promise<{
    totalProposals: number;
    activeProposals: number;
    totalVotes: number;
    participationRate: number;
  }> {
    try {
      const totalProposals = this.mockProposals.length;
      const activeProposals = this.mockProposals.filter(p => p.status === 'active').length;
      const totalVotes = this.mockProposals.reduce((sum, p) => sum + p.votesFor + p.votesAgainst, 0);
      
      return {
        totalProposals,
        activeProposals,
        totalVotes,
        participationRate: 68.5 // Mock participation rate
      };
    } catch (error) {
      console.error('Error getting governance stats:', error);
      throw new Error('Failed to get governance statistics');
    }
  }
}

export class MockPimlicoService {
  private apiKey: string;
  private bundlerUrl: string;

  constructor() {
    this.apiKey = process.env.PIMLICO_API_KEY || 'mock_api_key';
    this.bundlerUrl = process.env.PIMLICO_BUNDLER_URL || 'https://api.pimlico.io/v1/mantle-testnet/rpc';
  }

  /**
   * Simulate gasless transaction submission
   */
  async submitGaslessTransaction(
    userAddress: string,
    contractAddress: string,
    functionData: string,
    value: string = '0'
  ): Promise<{
    userOpHash: string;
    bundleHash: string;
    status: 'pending' | 'confirmed' | 'failed';
  }> {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock successful transaction
      const userOpHash = '0x' + Math.random().toString(16).substring(2) + Math.random().toString(16).substring(2);
      const bundleHash = '0x' + Math.random().toString(16).substring(2) + Math.random().toString(16).substring(2);

      console.log(`Gasless transaction submitted for ${userAddress}:`, {
        userOpHash,
        bundleHash,
        contractAddress,
        functionData
      });

      return {
        userOpHash,
        bundleHash,
        status: 'pending'
      };
    } catch (error) {
      console.error('Error submitting gasless transaction:', error);
      throw new Error('Failed to submit gasless transaction');
    }
  }

  /**
   * Check transaction status
   */
  async getTransactionStatus(userOpHash: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed';
    transactionHash?: string;
    blockNumber?: number;
    gasUsed?: number;
  }> {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock transaction confirmation after some time
      const isConfirmed = Math.random() > 0.3; // 70% chance of confirmation

      if (isConfirmed) {
        return {
          status: 'confirmed',
          transactionHash: '0x' + Math.random().toString(16).substring(2) + Math.random().toString(16).substring(2),
          blockNumber: Math.floor(Math.random() * 1000000),
          gasUsed: Math.floor(Math.random() * 200000) + 50000
        };
      } else {
        return {
          status: 'pending'
        };
      }
    } catch (error) {
      console.error('Error getting transaction status:', error);
      return { status: 'failed' };
    }
  }

  /**
   * Estimate gas for gasless transaction
   */
  async estimateGas(
    userAddress: string,
    contractAddress: string,
    functionData: string
  ): Promise<{
    gasLimit: number;
    gasPrice: number;
    maxFeePerGas: number;
    maxPriorityFeePerGas: number;
  }> {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      // Mock gas estimation
      return {
        gasLimit: Math.floor(Math.random() * 200000) + 100000,
        gasPrice: Math.floor(Math.random() * 50) + 20, // 20-70 gwei
        maxFeePerGas: Math.floor(Math.random() * 100) + 50, // 50-150 gwei
        maxPriorityFeePerGas: Math.floor(Math.random() * 10) + 2 // 2-12 gwei
      };
    } catch (error) {
      console.error('Error estimating gas:', error);
      throw new Error('Failed to estimate gas');
    }
  }
}

// Export singleton instances
export const mockOrbService = new MockOrbService();
export const mockParaService = new MockParaService();
export const mockPimlicoService = new MockPimlicoService();
