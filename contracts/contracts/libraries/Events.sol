// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Events
 * @dev Library containing all events used across SwiftyTask contracts
 */
library Events {
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
}
