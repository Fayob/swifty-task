// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../libraries/DataTypes.sol";
import "../libraries/Events.sol";
import "./UserManager.sol";
import "./TaskManager.sol";

/**
 * @title DisputeManager
 * @dev Handles dispute creation and resolution
 */
contract DisputeManager is ReentrancyGuard {
    // State variables
    mapping(uint256 => DataTypes.Dispute) public disputes;
    address public disputeArbitrator;

    // External contracts
    IERC20 public immutable paymentToken;
    UserManager public immutable userManager;
    TaskManager public immutable taskManager;
    address public immutable owner;

    // Modifiers
    modifier onlyArbitrator() {
        require(
            msg.sender == disputeArbitrator || msg.sender == owner,
            "Not authorized arbitrator"
        );
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor(
        address _paymentToken,
        address _userManager,
        address _taskManager,
        address _disputeArbitrator,
        address _owner
    ) {
        paymentToken = IERC20(_paymentToken);
        userManager = UserManager(_userManager);
        taskManager = TaskManager(_taskManager);
        disputeArbitrator = _disputeArbitrator;
        owner = _owner;
    }

    /**
     * @dev Create a dispute for a task
     */
    function createDispute(uint256 taskId, string memory reason) external {
        DataTypes.Task memory task = taskManager.getTask(taskId);
        require(
            msg.sender == task.client || msg.sender == task.selectedFreelancer,
            "Not authorized to dispute"
        );
        require(
            task.status == DataTypes.TaskStatus.Assigned ||
                task.status == DataTypes.TaskStatus.InProgress ||
                task.status == DataTypes.TaskStatus.UnderReview,
            "Cannot dispute at this stage"
        );
        require(disputes[taskId].createdAt == 0, "Dispute already exists");

        // Update task status in TaskManager (requires interface)
        // For now, we'll emit event and handle in main contract

        disputes[taskId] = DataTypes.Dispute({
            taskId: taskId,
            initiator: msg.sender,
            reason: reason,
            createdAt: block.timestamp,
            status: DataTypes.DisputeStatus.Open,
            arbitrator: disputeArbitrator
        });

        emit Events.DisputeCreated(taskId, msg.sender, reason);
    }

    /**
     * @dev Resolve a dispute (only arbitrator)
     */
    function resolveDispute(
        uint256 taskId,
        address winner,
        uint256 paymentPercentage
    ) external onlyArbitrator nonReentrant {
        DataTypes.Task memory task = taskManager.getTask(taskId);
        DataTypes.Dispute storage dispute = disputes[taskId];

        require(
            task.status == DataTypes.TaskStatus.Disputed,
            "Task not disputed"
        );
        require(
            dispute.status == DataTypes.DisputeStatus.Open,
            "Dispute not open"
        );
        require(paymentPercentage <= 100, "Invalid percentage");
        require(
            winner == task.client || winner == task.selectedFreelancer,
            "Winner must be client or freelancer"
        );

        // Calculate payments
        uint256 totalAmount = task.budgetTokens + task.clientStake;
        uint256 winnerAmount = (totalAmount * paymentPercentage) / 100;
        uint256 loserAmount = totalAmount - winnerAmount;

        address loser = (winner == task.client)
            ? task.selectedFreelancer
            : task.client;

        // Update dispute status
        dispute.status = DataTypes.DisputeStatus.Resolved;

        // Transfer payments
        if (winnerAmount > 0) {
            require(
                paymentToken.transfer(winner, winnerAmount),
                "Winner payment failed"
            );
        }
        if (loserAmount > 0) {
            require(
                paymentToken.transfer(loser, loserAmount),
                "Loser payment failed"
            );
        }

        // Update reputations
        userManager.updateReputation(winner, true);
        userManager.updateReputation(loser, false);

        emit Events.DisputeResolved(taskId, winner, winnerAmount);
    }

    /**
     * @dev Auto-resolve expired dispute
     */
    function autoResolveDispute(uint256 taskId) external {
        DataTypes.Task memory task = taskManager.getTask(taskId);
        DataTypes.Dispute storage dispute = disputes[taskId];

        require(
            dispute.status == DataTypes.DisputeStatus.Open,
            "Dispute not open"
        );
        require(
            block.timestamp > dispute.createdAt + DataTypes.DISPUTE_TIMEOUT,
            "Dispute not expired"
        );

        dispute.status = DataTypes.DisputeStatus.Resolved;

        // Default resolution: 70% to client, 30% to freelancer
        uint256 totalAmount = task.budgetTokens + task.clientStake;
        uint256 clientAmount = (totalAmount * 70) / 100;
        uint256 freelancerAmount = totalAmount - clientAmount;

        paymentToken.transfer(task.client, clientAmount);
        if (task.selectedFreelancer != address(0) && freelancerAmount > 0) {
            paymentToken.transfer(task.selectedFreelancer, freelancerAmount);
        }

        emit Events.DisputeResolved(taskId, task.client, clientAmount);
    }

    /**
     * @dev Get dispute details
     */
    function getDispute(
        uint256 taskId
    ) external view returns (DataTypes.Dispute memory) {
        return disputes[taskId];
    }

    /**
     * @dev Set dispute arbitrator
     */
    function setDisputeArbitrator(address newArbitrator) external onlyOwner {
        disputeArbitrator = newArbitrator;
    }
}
