// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libraries/DataTypes.sol";
import "../libraries/Events.sol";

/**
 * @title UserManager
 * @dev Handles user registration, verification, and reputation management
 */
contract UserManager {
    // State variables
    mapping(address => DataTypes.User) public users;
    uint256 public totalUsers;

    // Modifiers
    modifier validUser() {
        require(
            users[msg.sender].userAddress != address(0),
            "User not registered"
        );
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == owner(), "Not authorized");
        _;
    }

    // Owner address (should be set by main contract)
    address private _owner;

    constructor(address owner_) {
        _owner = owner_;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @dev Register a new user on the platform
     * @param user User address
     * @param skills Array of skill strings
     * @param profileHash IPFS hash containing profile information
     */
    function registerUser(
        address user,
        string[] memory skills,
        string memory profileHash
    ) external {
        require(
            users[user].userAddress == address(0),
            "User already registered"
        );

        users[user] = DataTypes.User({
            userAddress: user,
            skills: skills,
            reputation: DataTypes.DEFAULT_REPUTATION,
            completedTasks: 0,
            totalEarned: 0,
            isVerified: false,
            joinedAt: block.timestamp,
            profileHash: profileHash
        });

        totalUsers++;

        emit Events.UserVerified(user, false);
    }

    /**
     * @dev Update user skills
     * @param user User address
     * @param newSkills Updated skills array
     */
    function updateUserSkills(
        address user,
        string[] memory newSkills
    ) external {
        require(users[user].userAddress != address(0), "User not registered");
        users[user].skills = newSkills;
    }

    /**
     * @dev Verify user identity (Orb integration placeholder)
     * @param user Address of user to verify
     * @param verified Verification status
     */
    function verifyUser(address user, bool verified) external onlyAdmin {
        require(users[user].userAddress != address(0), "User not registered");
        users[user].isVerified = verified;
        emit Events.UserVerified(user, verified);
    }

    /**
     * @dev Update user reputation
     * @param user User address
     * @param positive Whether the outcome was positive
     */
    function updateReputation(address user, bool positive) external {
        DataTypes.User storage userProfile = users[user];
        require(userProfile.userAddress != address(0), "User not registered");

        if (positive) {
            userProfile.reputation = userProfile.reputation >= 95
                ? 100
                : userProfile.reputation + 5;
        } else {
            userProfile.reputation = userProfile.reputation <= 5
                ? 1
                : userProfile.reputation - 5;
        }

        emit Events.ReputationUpdated(user, userProfile.reputation);
    }

    /**
     * @dev Update user task completion stats
     * @param freelancer Freelancer address
     * @param paymentAmount Payment amount received
     */
    function updateTaskStats(
        address freelancer,
        uint256 paymentAmount
    ) external {
        DataTypes.User storage userProfile = users[freelancer];
        require(userProfile.userAddress != address(0), "User not registered");

        userProfile.completedTasks++;
        userProfile.totalEarned += paymentAmount;
    }

    /**
     * @dev Get user profile
     * @param userAddr User address
     * @return User profile data
     */
    function getUser(
        address userAddr
    ) external view returns (DataTypes.User memory) {
        return users[userAddr];
    }

    /**
     * @dev Check if user is registered
     * @param userAddr User address
     * @return True if user is registered
     */
    function isUserRegistered(address userAddr) external view returns (bool) {
        return users[userAddr].userAddress != address(0);
    }
}
