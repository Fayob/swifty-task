// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "../libraries/DataTypes.sol";
import "../libraries/Events.sol";
import "./UserManager.sol";

/**
 * @title TaskManager
 * @dev Handles task creation, bidding, and completion
 */
contract TaskManager is ReentrancyGuard {
    // State variables
    mapping(uint256 => DataTypes.Task) public tasks;
    mapping(uint256 => DataTypes.Bid[]) public taskBids;
    mapping(address => uint256[]) public userTasks;
    mapping(address => uint256[]) public userBids;

    uint256 public nextTaskId;
    uint256 public totalTasks;
    uint256 public platformFee = 250; // 2.5%

    // External contracts
    IERC20 public immutable paymentToken;
    AggregatorV3Interface public immutable priceFeed;
    UserManager public immutable userManager;
    address public immutable owner;

    // Modifiers
    modifier onlyClient(uint256 taskId) {
        require(tasks[taskId].client == msg.sender, "Not task client");
        _;
    }

    modifier taskExists(uint256 taskId) {
        require(taskId < nextTaskId && taskId > 0, "Task does not exist");
        _;
    }

    modifier validUser() {
        require(
            userManager.isUserRegistered(msg.sender),
            "User not registered"
        );
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor(
        address _paymentToken,
        address _priceFeed,
        address _userManager,
        address _owner
    ) {
        paymentToken = IERC20(_paymentToken);
        priceFeed = AggregatorV3Interface(_priceFeed);
        userManager = UserManager(_userManager);
        owner = _owner;
        nextTaskId = 1;
    }

    /**
     * @dev Create a new task with escrow payment
     */
    function createTask(
        string memory title,
        string memory description,
        string[] memory requiredSkills,
        uint256 budgetUSD,
        uint256 deadline,
        bool isUrgent
    ) external validUser returns (uint256 taskId) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(budgetUSD > 0, "Budget must be positive");
        require(deadline > block.timestamp, "Deadline must be in future");
        require(requiredSkills.length > 0, "Must specify required skills");

        // Calculate token amount based on current USD price
        uint256 tokenAmount = _usdToToken(budgetUSD);
        require(tokenAmount > 0, "Invalid token amount");

        // Calculate client stake (10% of budget for commitment)
        uint256 clientStake = tokenAmount / 10;
        uint256 totalRequired = tokenAmount + clientStake;

        // Transfer tokens to escrow
        require(
            paymentToken.transferFrom(msg.sender, address(this), totalRequired),
            "Token transfer failed"
        );

        taskId = nextTaskId++;

        tasks[taskId] = DataTypes.Task({
            id: taskId,
            client: msg.sender,
            title: title,
            description: description,
            requiredSkills: requiredSkills,
            budgetUSD: budgetUSD,
            budgetTokens: tokenAmount,
            deadline: deadline,
            status: DataTypes.TaskStatus.Open,
            selectedFreelancer: address(0),
            createdAt: block.timestamp,
            isUrgent: isUrgent,
            clientStake: clientStake
        });

        userTasks[msg.sender].push(taskId);
        totalTasks++;

        emit Events.TaskCreated(taskId, msg.sender, title, budgetUSD, deadline);

        return taskId;
    }

    /**
     * @dev Submit a bid for a task
     */
    function submitBid(
        uint256 taskId,
        uint256 proposedPrice,
        string memory proposal,
        uint256 estimatedDelivery
    ) external taskExists(taskId) validUser {
        DataTypes.Task memory task = tasks[taskId];

        require(
            task.status == DataTypes.TaskStatus.Open,
            "Task not accepting bids"
        );
        require(task.client != msg.sender, "Cannot bid on own task");
        require(proposedPrice > 0, "Price must be positive");
        require(proposedPrice <= task.budgetUSD, "Bid exceeds budget");
        require(estimatedDelivery <= task.deadline, "Delivery after deadline");
        require(
            block.timestamp <= task.deadline - DataTypes.BID_DEADLINE,
            "Bidding period closed"
        );

        // Check if user already has a pending bid
        DataTypes.Bid[] storage bids = taskBids[taskId];
        for (uint i = 0; i < bids.length; i++) {
            require(
                bids[i].freelancer != msg.sender ||
                    bids[i].status != DataTypes.BidStatus.Pending,
                "Already has pending bid"
            );
        }

        bids.push(
            DataTypes.Bid({
                freelancer: msg.sender,
                taskId: taskId,
                proposedPrice: proposedPrice,
                proposal: proposal,
                estimatedDelivery: estimatedDelivery,
                submittedAt: block.timestamp,
                status: DataTypes.BidStatus.Pending
            })
        );

        userBids[msg.sender].push(taskId);

        emit Events.BidSubmitted(taskId, msg.sender, proposedPrice, proposal);
    }

    /**
     * @dev Accept a bid and assign task to freelancer
     */
    function acceptBid(
        uint256 taskId,
        uint256 bidIndex
    ) external taskExists(taskId) onlyClient(taskId) {
        DataTypes.Task storage task = tasks[taskId];
        require(
            task.status == DataTypes.TaskStatus.Open,
            "Task not accepting bids"
        );

        DataTypes.Bid[] storage bids = taskBids[taskId];
        require(bidIndex < bids.length, "Invalid bid index");
        require(
            bids[bidIndex].status == DataTypes.BidStatus.Pending,
            "Bid not pending"
        );

        DataTypes.Bid storage acceptedBid = bids[bidIndex];

        // Update task status
        task.status = DataTypes.TaskStatus.Assigned;
        task.selectedFreelancer = acceptedBid.freelancer;

        // Update bid statuses
        acceptedBid.status = DataTypes.BidStatus.Accepted;
        for (uint i = 0; i < bids.length; i++) {
            if (
                i != bidIndex && bids[i].status == DataTypes.BidStatus.Pending
            ) {
                bids[i].status = DataTypes.BidStatus.Rejected;
            }
        }

        emit Events.BidAccepted(
            taskId,
            acceptedBid.freelancer,
            acceptedBid.proposedPrice
        );
    }

    /**
     * @dev Mark task as completed and release payment
     */
    function completeTask(
        uint256 taskId
    ) external taskExists(taskId) onlyClient(taskId) nonReentrant {
        DataTypes.Task storage task = tasks[taskId];
        require(
            task.status == DataTypes.TaskStatus.Assigned ||
                task.status == DataTypes.TaskStatus.InProgress,
            "Invalid task status"
        );
        require(
            task.selectedFreelancer != address(0),
            "No freelancer assigned"
        );

        task.status = DataTypes.TaskStatus.Completed;

        // Calculate payments
        uint256 platformFeeAmount = (task.budgetTokens * platformFee) / 10000;
        uint256 freelancerPayment = task.budgetTokens - platformFeeAmount;

        // Update freelancer stats
        userManager.updateTaskStats(task.selectedFreelancer, freelancerPayment);

        // Release payments
        require(
            paymentToken.transfer(task.selectedFreelancer, freelancerPayment),
            "Freelancer payment failed"
        );
        require(
            paymentToken.transfer(owner, platformFeeAmount),
            "Platform fee transfer failed"
        );

        // Return client stake
        require(
            paymentToken.transfer(task.client, task.clientStake),
            "Client stake return failed"
        );

        // Update reputations
        userManager.updateReputation(task.selectedFreelancer, true);
        userManager.updateReputation(task.client, true);

        emit Events.TaskCompleted(
            taskId,
            task.selectedFreelancer,
            freelancerPayment
        );
    }

    /**
     * @dev Convert USD amount to token amount using Chainlink price feed
     */
    function _usdToToken(uint256 usdAmount) internal view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price feed");

        return (usdAmount * 1e6) / uint256(price);
    }

    /**
     * @dev Get task details
     */
    function getTask(
        uint256 taskId
    ) external view returns (DataTypes.Task memory) {
        return tasks[taskId];
    }

    /**
     * @dev Get all bids for a task
     */
    function getTaskBids(
        uint256 taskId
    ) external view returns (DataTypes.Bid[] memory) {
        return taskBids[taskId];
    }

    /**
     * @dev Get user's tasks
     */
    function getUserTasks(
        address userAddr
    ) external view returns (uint256[] memory) {
        return userTasks[userAddr];
    }

    /**
     * @dev Update platform fee (only owner)
     */
    function updatePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= DataTypes.MAX_FEE, "Fee too high");
        platformFee = newFee;
    }
}
