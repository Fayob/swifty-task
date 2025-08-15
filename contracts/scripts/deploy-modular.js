/**
 * Deployment script for modular SwiftyTask contracts
 * Deploys all modules and the main orchestrator contract
 */

const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying SwiftyTask Modular Contracts...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Contract addresses (update these for Mantle testnet)
    const USDC_ADDRESS = process.env.USDC_ADDRESS; // Mock USDC for testnet
    const PRICE_FEED_ADDRESS = process.env.PRICE_FEED_ADDRESS; // USDC/USD price feed
    const DISPUTE_ARBITRATOR = process.env.DISPUTE_ARBITRATOR || deployer.address;

    console.log("\n📋 Deployment Configuration:");
    console.log("USDC Address:", USDC_ADDRESS);
    console.log("Price Feed Address:", PRICE_FEED_ADDRESS);
    console.log("Dispute Arbitrator:", DISPUTE_ARBITRATOR);

    try {
        // Deploy Libraries first (if needed for linking)
        console.log("\n Deploying Libraries...");
        
        const DataTypes = await ethers.getContractFactory("DataTypes");
        const dataTypes = await DataTypes.deploy();
        await dataTypes.deployed();
        console.log("DataTypes library deployed to:", dataTypes.address);

        const Events = await ethers.getContractFactory("Events");
        const events = await Events.deploy();
        await events.deployed();
        console.log("Events library deployed to:", events.address);

        // Deploy Main Contract (which will deploy all modules)
        console.log("\n  Deploying Main Contract...");

        const SwiftyTaskMain = await ethers.getContractFactory("SwiftyTaskMain");
        const swiftyTaskMain = await SwiftyTaskMain.deploy(
            USDC_ADDRESS,
            PRICE_FEED_ADDRESS,
            DISPUTE_ARBITRATOR
        );
        await swiftyTaskMain.deployed();
        console.log("SwiftyTaskMain deployed to:", swiftyTaskMain.address);

        // Get module addresses
        console.log("\n Getting Module Addresses...");
        const userManagerAddress = await swiftyTaskMain.userManager();
        const taskManagerAddress = await swiftyTaskMain.taskManager();
        const disputeManagerAddress = await swiftyTaskMain.disputeManager();
        const aiMatchingManagerAddress = await swiftyTaskMain.aiMatchingManager();
        const automationManagerAddress = await swiftyTaskMain.automationManager();

        console.log("UserManager deployed to:", userManagerAddress);
        console.log("TaskManager deployed to:", taskManagerAddress);
        console.log("DisputeManager deployed to:", disputeManagerAddress);
        console.log("AIMatchingManager deployed to:", aiMatchingManagerAddress);
        console.log("AutomationManager deployed to:", automationManagerAddress);

        // Verify contracts are working
        console.log("\n Verifying Deployment...");
        
        // Test basic functionality
        const totalUsers = await swiftyTaskMain.getUserManager().then(addr => 
            ethers.getContractAt("UserManager", addr)
        ).then(contract => contract.totalUsers());
        console.log("Initial total users:", totalUsers.toString());

        // Display summary
        console.log("\n Deployment Summary:");
        console.log("=====================================");
        console.log("Main Contract:", swiftyTaskMain.address);
        console.log("User Manager:", userManagerAddress);
        console.log("Task Manager:", taskManagerAddress);
        console.log("Dispute Manager:", disputeManagerAddress);
        console.log("AI Matching Manager:", aiMatchingManagerAddress);
        console.log("Automation Manager:", automationManagerAddress);
        console.log("=====================================");

        // Save deployment info
        const deploymentInfo = {
            network: hre.network.name,
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            contracts: {
                SwiftyTaskMain: swiftyTaskMain.address,
                UserManager: userManagerAddress,
                TaskManager: taskManagerAddress,
                DisputeManager: disputeManagerAddress,
                AIMatchingManager: aiMatchingManagerAddress,
                AutomationManager: automationManagerAddress,
                DataTypes: dataTypes.address,
                Events: events.address
            },
            configuration: {
                usdcAddress: USDC_ADDRESS,
                priceFeedAddress: PRICE_FEED_ADDRESS,
                disputeArbitrator: DISPUTE_ARBITRATOR
            }
          };
    } catch (error) {
        console.error("\n Deployment failed:", error);
        process.exit(1);
    }
}

// Error handling
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(" Deployment script failed:", error);
        process.exit(1);
    });
