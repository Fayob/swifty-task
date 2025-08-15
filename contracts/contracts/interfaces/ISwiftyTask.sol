// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ISwiftyTask
 * @dev Interface for the main SwiftyTask contract
 */
interface ISwiftyTask {
    // Enums
    enum TaskStatus {
        Open,
        Assigned,
        InProgress,
        UnderReview,
        Completed,
        Disputed,
        Cancelled
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

    // Structs
    struct Task {
        uint256 id;
        address client;
        string title;
        string description;
        string[] requiredSkills;
        uint256 budgetUSD;
        uint256 budgetTokens;
        uint256 deadline;
        TaskStatus status;
        address selectedFreelancer;
        uint256 createdAt;
        bool isUrgent;
        uint256 clientStake;
    }

    struct Bid {
        address freelancer;
        uint256 taskId;
        uint256 proposedPrice;
        string proposal;
        uint256 estimatedDelivery;
        uint256 submittedAt;
        BidStatus status;
    }

    struct User {
        address userAddress;
        string[] skills;
        uint256 reputation;
        uint256 completedTasks;
        uint256 totalEarned;
        bool isVerified;
        uint256 joinedAt;
        string profileHash;
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
        uint256 score;
        string[] matchingSkills;
        uint256 estimatedCompletion;
    }

    // Events
    event TaskCreated(
        uint256 indexed taskId,
        address indexed client,
        string title,
        uint256 budgetUSD,
        uint256 deadline
    );

    event BidSubmitted(
        uint256 indexed taskId,
        address indexed freelancer,
        uint256 proposedPrice,
        string proposal
    );

    event BidAccepted(
        uint256 indexed taskId,
        address indexed freelancer,
        uint256 agreedPrice
    );

    event TaskCompleted(
        uint256 indexed taskId,
        address indexed freelancer,
        uint256 paymentAmount
    );

    event DisputeCreated(
        uint256 indexed taskId,
        address indexed initiator,
        string reason
    );

    event DisputeResolved(
        uint256 indexed taskId,
        address winner,
        uint256 paymentAmount
    );

    event ReputationUpdated(address indexed user, uint256 newReputation);

    event UserVerified(address indexed user, bool verified);

    event AIMatchesGenerated(
        uint256 indexed taskId,
        uint256 matchCount,
        address topMatch
    );

    event MatcherAuthorized(address indexed matcher, bool authorized);

    // Functions
    function createTask(
        string memory title,
        string memory description,
        string[] memory requiredSkills,
        uint256 budgetUSD,
        uint256 deadline,
        bool isUrgent
    ) external returns (uint256 taskId);

    function submitBid(
        uint256 taskId,
        uint256 proposedPrice,
        string memory proposal,
        uint256 estimatedDelivery
    ) external;

    function acceptBid(uint256 taskId, uint256 bidIndex) external;

    function completeTask(uint256 taskId) external;

    function createDispute(uint256 taskId, string memory reason) external;

    function getTask(uint256 taskId) external view returns (Task memory);

    function getTaskBids(uint256 taskId) external view returns (Bid[] memory);

    function getUser(address userAddr) external view returns (User memory);
}
