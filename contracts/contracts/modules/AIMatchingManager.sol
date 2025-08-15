// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../libraries/DataTypes.sol";
import "../libraries/Events.sol";
import "./UserManager.sol";
import "./TaskManager.sol";

/**
 * @title AIMatchingManager
 * @dev Handles AI-powered freelancer matching system
 */
contract AIMatchingManager {
    // State variables
    mapping(uint256 => DataTypes.MatchResult[]) public taskMatches;
    mapping(uint256 => bool) public aiMatchingEnabled;
    mapping(address => bool) public authorizedMatchers;
    uint256 public aiMatchingFee = 10; // 0.1%

    // External contracts
    IERC20 public immutable paymentToken;
    UserManager public immutable userManager;
    TaskManager public immutable taskManager;
    address public immutable owner;

    // Modifiers
    modifier onlyAuthorizedMatcher() {
        require(
            authorizedMatchers[msg.sender] || msg.sender == owner,
            "Not authorized matcher"
        );
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier taskExists(uint256 taskId) {
        // This should check with TaskManager
        _;
    }

    constructor(
        address _paymentToken,
        address _userManager,
        address _taskManager,
        address _owner
    ) {
        paymentToken = IERC20(_paymentToken);
        userManager = UserManager(_userManager);
        taskManager = TaskManager(_taskManager);
        owner = _owner;
    }

    /**
     * @dev Submit AI-generated matches for a task
     */
    function submitAIMatches(
        uint256 taskId,
        DataTypes.MatchResult[] memory matches
    ) external taskExists(taskId) onlyAuthorizedMatcher {
        require(
            aiMatchingEnabled[taskId],
            "AI matching disabled for this task"
        );

        DataTypes.Task memory task = taskManager.getTask(taskId);
        require(
            task.status == DataTypes.TaskStatus.Open,
            "Task not accepting matches"
        );
        require(
            matches.length > 0 && matches.length <= 10,
            "Invalid match count"
        );

        // Clear existing matches
        delete taskMatches[taskId];

        // Add new matches
        for (uint i = 0; i < matches.length; i++) {
            require(
                matches[i].freelancer != address(0),
                "Invalid freelancer address"
            );
            require(matches[i].score <= 100, "Invalid match score");
            require(
                userManager.isUserRegistered(matches[i].freelancer),
                "Freelancer not registered"
            );

            taskMatches[taskId].push(matches[i]);
        }

        // Emit event with top match
        address topMatch = matches.length > 0
            ? matches[0].freelancer
            : address(0);
        emit Events.AIMatchesGenerated(taskId, matches.length, topMatch);
    }

    /**
     * @dev Accept AI-generated match and auto-assign task
     */
    function acceptAIMatch(
        uint256 taskId,
        uint256 matchIndex
    ) external taskExists(taskId) {
        DataTypes.Task memory task = taskManager.getTask(taskId);
        require(msg.sender == task.client, "Not task client");
        require(
            aiMatchingEnabled[taskId],
            "AI matching disabled for this task"
        );
        require(
            task.status == DataTypes.TaskStatus.Open,
            "Task not accepting matches"
        );
        require(matchIndex < taskMatches[taskId].length, "Invalid match index");

        DataTypes.MatchResult memory selectedMatch = taskMatches[taskId][
            matchIndex
        ];

        // Calculate AI matching fee (deducted from budget)
        uint256 matchingFeeAmount = (task.budgetTokens * aiMatchingFee) / 10000;

        // Transfer matching fee to platform
        if (matchingFeeAmount > 0) {
            paymentToken.transfer(owner, matchingFeeAmount);
        }

        // Note: In a full implementation, we'd need to update the task in TaskManager
        // This would require either inheritance or interface calls

        emit Events.BidAccepted(
            taskId,
            selectedMatch.freelancer,
            selectedMatch.score
        );
    }

    /**
     * @dev Toggle AI matching for a task
     */
    function toggleAIMatching(
        uint256 taskId,
        bool enabled
    ) external taskExists(taskId) {
        DataTypes.Task memory task = taskManager.getTask(taskId);
        require(msg.sender == task.client, "Not task client");
        require(
            task.status == DataTypes.TaskStatus.Open,
            "Cannot modify completed task"
        );
        aiMatchingEnabled[taskId] = enabled;
    }

    /**
     * @dev Get AI matches for a task
     */
    function getAIMatches(
        uint256 taskId
    ) external view returns (DataTypes.MatchResult[] memory) {
        return taskMatches[taskId];
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
        DataTypes.Task memory task = taskManager.getTask(taskId);
        DataTypes.User memory freelancerProfile = userManager.getUser(
            freelancer
        );

        string[] memory matches = new string[](task.requiredSkills.length);
        uint256 matchCount = 0;

        // Check each required skill against freelancer skills
        for (uint i = 0; i < task.requiredSkills.length; i++) {
            for (uint j = 0; j < freelancerProfile.skills.length; j++) {
                if (
                    keccak256(bytes(task.requiredSkills[i])) ==
                    keccak256(bytes(freelancerProfile.skills[j]))
                ) {
                    matches[matchCount] = task.requiredSkills[i];
                    matchCount++;
                    break;
                }
            }
        }

        // Create result array with actual matches
        matchingSkills = new string[](matchCount);
        for (uint i = 0; i < matchCount; i++) {
            matchingSkills[i] = matches[i];
        }

        hasMatchingSkills = matchCount > 0;
    }

    /**
     * @dev Authorize/deauthorize AI matching service
     */
    function setAuthorizedMatcher(
        address matcher,
        bool authorized
    ) external onlyOwner {
        require(matcher != address(0), "Invalid matcher address");
        authorizedMatchers[matcher] = authorized;
        emit Events.MatcherAuthorized(matcher, authorized);
    }

    /**
     * @dev Update AI matching fee
     */
    function updateAIMatchingFee(uint256 newFee) external onlyOwner {
        require(newFee <= 500, "AI matching fee too high"); // Max 5%
        aiMatchingFee = newFee;
    }

    /**
     * @dev Enable AI matching for a task (called during task creation)
     */
    function enableAIMatching(uint256 taskId) external {
        aiMatchingEnabled[taskId] = true;
    }
}
