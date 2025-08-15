// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../libraries/DataTypes.sol";
import "./TaskManager.sol";
import "./DisputeManager.sol";

/**
 * @title AutomationManager
 * @dev Handles Chainlink Automation for task timeouts and dispute resolution
 */
contract AutomationManager is AutomationCompatibleInterface {
    // External contracts
    IERC20 public immutable paymentToken;
    TaskManager public immutable taskManager;
    DisputeManager public immutable disputeManager;

    constructor(
        address _paymentToken,
        address _taskManager,
        address _disputeManager
    ) {
        paymentToken = IERC20(_paymentToken);
        taskManager = TaskManager(_taskManager);
        disputeManager = DisputeManager(_disputeManager);
    }

    /**
     * @dev Chainlink Automation upkeep check
     * Checks for tasks that need automated actions (timeouts, etc.)
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint256[] memory expiredTasks = new uint256[](10); // Max 10 per upkeep
        uint256 count = 0;

        // Note: In a modular system, we'd need to query TaskManager for total tasks
        // For now, we'll use a reasonable loop limit
        uint256 maxTaskId = 1000; // This should come from TaskManager

        // Check for expired open tasks or disputes
        for (uint256 i = 1; i <= maxTaskId && count < 10; i++) {
            try taskManager.getTask(i) returns (DataTypes.Task memory task) {
                // Check for expired open tasks
                if (
                    task.status == DataTypes.TaskStatus.Open &&
                    block.timestamp > task.deadline
                ) {
                    expiredTasks[count] = i;
                    count++;
                }
                // Check for expired disputes
                else if (task.status == DataTypes.TaskStatus.Disputed) {
                    try disputeManager.getDispute(i) returns (
                        DataTypes.Dispute memory dispute
                    ) {
                        if (
                            dispute.createdAt > 0 &&
                            block.timestamp >
                            dispute.createdAt + DataTypes.DISPUTE_TIMEOUT
                        ) {
                            expiredTasks[count] = i;
                            count++;
                        }
                    } catch {
                        // Skip if dispute doesn't exist
                    }
                }
            } catch {
                // Skip if task doesn't exist
                continue;
            }
        }

        upkeepNeeded = count > 0;
        performData = abi.encode(expiredTasks, count);
    }

    /**
     * @dev Chainlink Automation upkeep perform
     * Automatically handles expired tasks and disputes
     */
    function performUpkeep(bytes calldata performData) external override {
        (uint256[] memory expiredTasks, uint256 count) = abi.decode(
            performData,
            (uint256[], uint256)
        );

        for (uint256 i = 0; i < count; i++) {
            uint256 taskId = expiredTasks[i];

            try taskManager.getTask(taskId) returns (
                DataTypes.Task memory task
            ) {
                if (
                    task.status == DataTypes.TaskStatus.Open &&
                    block.timestamp > task.deadline
                ) {
                    // Cancel expired task and refund client
                    _refundExpiredTask(taskId, task);
                } else if (task.status == DataTypes.TaskStatus.Disputed) {
                    // Auto-resolve expired dispute
                    try disputeManager.autoResolveDispute(taskId) {
                        // Dispute resolved automatically
                    } catch {
                        // Failed to resolve dispute
                    }
                }
            } catch {
                // Skip if task doesn't exist
                continue;
            }
        }
    }

    /**
     * @dev Refund expired task
     */
    function _refundExpiredTask(
        uint256 taskId,
        DataTypes.Task memory task
    ) internal {
        // Note: In a full implementation, this would need to coordinate with TaskManager
        // to update task status and handle refunds

        uint256 refundAmount = task.budgetTokens + task.clientStake;

        // This is a simplified refund - in practice, TaskManager would handle this
        if (paymentToken.balanceOf(address(taskManager)) >= refundAmount) {
            // Would need interface to TaskManager for proper refund
        }
    }
}
