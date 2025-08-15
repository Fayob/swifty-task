// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DataTypes
 * @dev Library containing all data structures used across SwiftyTask contracts
 */
library DataTypes {
    // =============================================================
    //                            ENUMS
    // =============================================================

    enum TaskStatus {
        Open, // Accepting bids
        Assigned, // Freelancer selected
        InProgress, // Work in progress
        UnderReview, // Submitted for review
        Completed, // Payment released
        Disputed, // Under dispute
        Cancelled // Task cancelled
    }

    enum BidStatus {
        Pending,
        Accepted,
        Rejected,
        Withdrawn
    }

    enum DisputeStatus {
        Open,
        InProgress,
        Resolved,
        Escalated
    }

    // =============================================================
    //                           STRUCTS
    // =============================================================

    struct Task {
        uint256 id;
        address client;
        string title;
        string description;
        string[] requiredSkills;
        uint256 budgetUSD; // Budget in USD (scaled by 1e8)
        uint256 budgetTokens; // Actual token amount escrowed
        uint256 deadline;
        TaskStatus status;
        address selectedFreelancer;
        uint256 createdAt;
        bool isUrgent;
        uint256 clientStake; // Additional stake for commitment
    }

    struct Bid {
        address freelancer;
        uint256 taskId;
        uint256 proposedPrice; // In USD scaled by 1e8
        string proposal;
        uint256 estimatedDelivery;
        uint256 submittedAt;
        BidStatus status;
    }

    struct User {
        address userAddress;
        string[] skills;
        uint256 reputation; // Out of 100
        uint256 completedTasks;
        uint256 totalEarned;
        bool isVerified; // Orb identity verification
        uint256 joinedAt;
        string profileHash; // IPFS hash for profile data
    }

    struct Dispute {
        uint256 taskId;
        address initiator;
        string reason;
        uint256 createdAt;
        DisputeStatus status;
        address arbitrator;
    }

    struct MatchResult {
        address freelancer;
        uint256 score; // Match score out of 100
        string[] matchingSkills;
        uint256 estimatedCompletion; // In hours
    }

    // =============================================================
    //                         CONSTANTS
    // =============================================================

    uint256 public constant BID_DEADLINE = 7 days;
    uint256 public constant DISPUTE_TIMEOUT = 14 days;
    uint256 public constant MIN_REPUTATION = 50;
    uint256 public constant MAX_FEE = 1000; // 10% maximum
    uint256 public constant DEFAULT_REPUTATION = 75;
}
