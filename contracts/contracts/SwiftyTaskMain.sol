// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

import "./interfaces/ISwiftyTask.sol";
import "./libraries/DataTypes.sol";
import "./libraries/Events.sol";
import "./modules/UserManager.sol";
import "./modules/TaskManager.sol";
import "./modules/DisputeManager.sol";
import "./modules/AIMatchingManager.sol";
import "./modules/AutomationManager.sol";

/**
 * @title SwiftyTaskMain
 * @dev Main contract that orchestrates all SwiftyTask modules
 * @author SwiftyTask Team
 */
contract SwiftyTaskMain is ISwiftyTask, Ownable(msg.sender), Pausable {
    // Module contracts
    UserManager public immutable userManager;
    TaskManager public immutable taskManager;
    DisputeManager public immutable disputeManager;
    AIMatchingManager public immutable aiMatchingManager;
    AutomationManager public immutable automationManager;

    // External contracts
    IERC20 public immutable paymentToken;
    AggregatorV3Interface public immutable priceFeed;

    /**
     * @dev Constructor initializes all modules and external contracts
     */
    constructor(
        address _paymentToken,
        address _priceFeed,
        address _disputeArbitrator
    ) {
        paymentToken = IERC20(_paymentToken);
        priceFeed = AggregatorV3Interface(_priceFeed);

        // Deploy modules
        userManager = new UserManager(address(this));
        taskManager = new TaskManager(
            _paymentToken,
            _priceFeed,
            address(userManager),
            address(this)
        );
        disputeManager = new DisputeManager(
            _paymentToken,
            address(userManager),
            address(taskManager),
            _disputeArbitrator,
            address(this)
        );
        aiMatchingManager = new AIMatchingManager(
            _paymentToken,
            address(userManager),
            address(taskManager),
            address(this)
        );
        automationManager = new AutomationManager(
            _paymentToken,
            address(taskManager),
            address(disputeManager)
        );
    }

    // =============================================================
    //                        USER FUNCTIONS
    // =============================================================

    /**
     * @dev Register a new user on the platform
     */
    function registerUser(
        string[] memory skills,
        string memory profileHash
    ) external {
        userManager.registerUser(msg.sender, skills, profileHash);
    }

    /**
     * @dev Update user skills
     */
    function updateUserSkills(string[] memory newSkills) external {
        userManager.updateUserSkills(msg.sender, newSkills);
    }

    /**
     * @dev Verify user identity (Orb integration placeholder)
     */
    function verifyUser(address user, bool verified) external onlyOwner {
        userManager.verifyUser(user, verified);
    }

    // =============================================================
    //                        TASK FUNCTIONS
    // =============================================================

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
    ) external override whenNotPaused returns (uint256 taskId) {
        taskId = taskManager.createTask(
            title,
            description,
            requiredSkills,
            budgetUSD,
            deadline,
            isUrgent
        );

        // Enable AI matching for new task
        aiMatchingManager.enableAIMatching(taskId);

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
    ) external override whenNotPaused {
        taskManager.submitBid(
            taskId,
            proposedPrice,
            proposal,
            estimatedDelivery
        );
    }

    /**
     * @dev Accept a bid and assign task to freelancer
     */
    function acceptBid(uint256 taskId, uint256 bidIndex) external override {
        taskManager.acceptBid(taskId, bidIndex);
    }

    /**
     * @dev Mark task as completed and release payment
     */
    function completeTask(uint256 taskId) external override {
        taskManager.completeTask(taskId);
    }

    // =============================================================
    //                       DISPUTE FUNCTIONS
    // =============================================================

    /**
     * @dev Create a dispute for a task
     */
    function createDispute(
        uint256 taskId,
        string memory reason
    ) external override {
        disputeManager.createDispute(taskId, reason);
    }

    /**
     * @dev Resolve a dispute (only arbitrator)
     */
    function resolveDispute(
        uint256 taskId,
        address winner,
        uint256 paymentPercentage
    ) external {
        disputeManager.resolveDispute(taskId, winner, paymentPercentage);
    }

    // =============================================================
    //                    AI MATCHING FUNCTIONS
    // =============================================================

    /**
     * @dev Submit AI-generated matches for a task
     */
    function submitAIMatches(
        uint256 taskId,
        DataTypes.MatchResult[] memory matches
    ) external {
        aiMatchingManager.submitAIMatches(taskId, matches);
    }

    /**
     * @dev Accept AI-generated match and auto-assign task
     */
    function acceptAIMatch(uint256 taskId, uint256 matchIndex) external {
        aiMatchingManager.acceptAIMatch(taskId, matchIndex);
    }

    /**
     * @dev Toggle AI matching for a task
     */
    function toggleAIMatching(uint256 taskId, bool enabled) external {
        aiMatchingManager.toggleAIMatching(taskId, enabled);
    }

    /**
     * @dev Get AI matches for a task
     */
    function getAIMatches(
        uint256 taskId
    ) external view returns (DataTypes.MatchResult[] memory) {
        return aiMatchingManager.getAIMatches(taskId);
    }

    /**
     * @dev Check if freelancer has skills matching task requirements
     */
    function checkSkillMatch(
        uint256 taskId,
        address freelancer
    )
        external
        view
        returns (bool hasMatchingSkills, string[] memory matchingSkills)
    {
        return aiMatchingManager.checkSkillMatch(taskId, freelancer);
    }

    // =============================================================
    //                        VIEW FUNCTIONS
    // =============================================================

    /**
     * @dev Get task details
     */
    function getTask(uint256 taskId) external view returns (Task memory) {
        DataTypes.Task memory task = taskManager.getTask(taskId);
        return
            Task({
                id: task.id,
                title: task.title,
                description: task.description,
                requiredSkills: task.requiredSkills,
                budgetUSD: task.budgetUSD,
                budgetTokens: task.budgetTokens,
                deadline: task.deadline,
                status: TaskStatus(uint8(task.status)),
                selectedFreelancer: task.selectedFreelancer,
                createdAt: task.createdAt,
                isUrgent: task.isUrgent,
                client: task.client,
                clientStake: task.clientStake
            });
    }

    /**
     * @dev Get all bids for a task
     */
    function getTaskBids(uint256 taskId) external view returns (Bid[] memory) {
        DataTypes.Bid[] memory bids = taskManager.getTaskBids(taskId);
        Bid[] memory interfaceBids = new Bid[](bids.length);

        for (uint i = 0; i < bids.length; i++) {
            interfaceBids[i] = Bid({
                freelancer: bids[i].freelancer,
                taskId: bids[i].taskId,
                proposedPrice: bids[i].proposedPrice,
                proposal: bids[i].proposal,
                estimatedDelivery: bids[i].estimatedDelivery,
                submittedAt: bids[i].submittedAt,
                status: BidStatus(uint8(bids[i].status))
            });
        }

        return interfaceBids;
    }

    /**
     * @dev Get user profile
     */
    function getUser(address userAddr) external view returns (User memory) {
        DataTypes.User memory user = userManager.getUser(userAddr);
        return
            User({
                userAddress: user.userAddress,
                skills: user.skills,
                reputation: user.reputation,
                completedTasks: user.completedTasks,
                totalEarned: user.totalEarned,
                isVerified: user.isVerified,
                joinedAt: user.joinedAt,
                profileHash: user.profileHash
            });
    }

    /**
     * @dev Get user's tasks
     */
    function getUserTasks(
        address userAddr
    ) external view returns (uint256[] memory) {
        return taskManager.getUserTasks(userAddr);
    }

    /**
     * @dev Get dispute details
     */
    function getDispute(
        uint256 taskId
    ) external view returns (DataTypes.Dispute memory) {
        return disputeManager.getDispute(taskId);
    }

    /**
     * @dev Get current USD to token conversion rate
     */
    function getUSDToTokenRate() external view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return uint256(price);
    }

    // =============================================================
    //                     ADMIN FUNCTIONS
    // =============================================================

    /**
     * @dev Update platform fee
     */
    function updatePlatformFee(uint256 newFee) external onlyOwner {
        taskManager.updatePlatformFee(newFee);
    }

    /**
     * @dev Set dispute arbitrator
     */
    function setDisputeArbitrator(address newArbitrator) external onlyOwner {
        disputeManager.setDisputeArbitrator(newArbitrator);
    }

    /**
     * @dev Authorize/deauthorize AI matching service
     */
    function setAuthorizedMatcher(
        address matcher,
        bool authorized
    ) external onlyOwner {
        aiMatchingManager.setAuthorizedMatcher(matcher, authorized);
    }

    /**
     * @dev Update AI matching fee
     */
    function updateAIMatchingFee(uint256 newFee) external onlyOwner {
        aiMatchingManager.updateAIMatchingFee(newFee);
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency token recovery
     */
    function emergencyTokenRecovery(
        address token,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }

    // =============================================================
    //                    CHAINLINK AUTOMATION
    // =============================================================

    /**
     * @dev Chainlink Automation upkeep check
     */
    function checkUpkeep(
        bytes calldata checkData
    ) external view returns (bool upkeepNeeded, bytes memory performData) {
        return automationManager.checkUpkeep(checkData);
    }

    /**
     * @dev Chainlink Automation upkeep perform
     */
    function performUpkeep(bytes calldata performData) external {
        automationManager.performUpkeep(performData);
    }
}
