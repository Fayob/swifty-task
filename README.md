# SwiftyTask - Decentralized Micro-Task Platform

SwiftyTask is a cutting-edge decentralized micro-task platform built on Mantle Network, featuring AI-powered freelancer matching, gasless transactions, and automated dispute resolution. The platform connects clients with skilled freelancers worldwide using blockchain technology for secure, transparent, and efficient task completion.

### 🎯 The Problem We're Solving

**Traditional freelance platforms have several issues:**

- High fees (20-30% of your earnings)
- Slow payments (sometimes weeks)
- Limited transparency
- Risk of disputes with no fair resolution
- Complex onboarding processes
- Limited access for people without traditional banking

**SwiftyTask solves these problems by:**

- Using blockchain for instant, secure payments
- Charging only 2.5% in fees
- Providing transparent dispute resolution
- Enabling global access without traditional banking
- Using AI to match the best freelancers to tasks

## 🚀 Features

### Core Features

- **Task Creation & Management**: Post tasks with detailed requirements and escrow payments
- **AI-Powered Matching**: Smart algorithm matches the best freelancers to tasks based on skills, reputation, and availability
- **Bidding System**: Competitive bidding process with transparent evaluation criteria
- **Gasless Transactions**: Account abstraction via Pimlico for seamless user experience
- **Secure Payments**: USDC-based payments with automatic escrow and release
- **Reputation System**: Blockchain-based reputation tracking for trust and quality

### Blockchain Integration

- **Mantle Network**: Low-cost, high-performance blockchain for optimal user experience
- **Chainlink Integration**: Real-time price feeds and automated dispute resolution
- **Smart Contract Security**: Contracts with reentrancy protection
- **Identity Verification**: Orb-powered identity verification for enhanced trust

### Governance & Community

- **Decentralized Governance**: Para-powered governance for platform decisions
- **Token-Based Voting**: Community-driven platform improvements and feature additions
- **Transparent Operations**: All platform metrics and fees publicly accessible

## 🏗️ Architecture

The project consists of three main components:

### 1. Smart Contracts (`/contracts`)

- **SwiftyTaskMain.sol**: Main platform contract handling tasks, bids, and payments
- **Chainlink Integration**: Price feeds and automation for dispute resolution
- **Hardhat Setup**: Complete development and deployment environment

### 2. Backend API (`/backend`)

- **Express.js Server**: RESTful API for platform operations
- **Blockchain Service**: Web3 integration for contract interactions
- **AI Matching Service**: Algorithm for freelancer-task matching
- **Mock Services**: Simulated Orb and Para integrations

### 3. Frontend DApp (`/frontend`)

- **Next.js 14**: Modern React framework with App Router
- **RainbowKit + Wagmi**: Seamless wallet connection and Web3 interactions
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Real-time Updates**: Live task and bid status updates

## 🛠️ Technology Stack

### Blockchain

- **Mantle Network**: Layer-2 solution for Ethereum
- **Solidity**: Smart contract development
- **Hardhat**: Development framework and testing
- **Chainlink**: Oracle services and automation
- **Pimlico**: Account abstraction for gasless transactions

### Backend

- **Node.js + Express.js**: Server-side runtime and framework
- **TypeScript**: Type-safe development
- **Ethers.js**: Blockchain interaction library
- **Axios**: HTTP client for external API calls

### Frontend

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **RainbowKit**: Wallet connection UI
- **Wagmi**: React hooks for Ethereum

### Third-Party Integrations

- **Orb**: Identity verification (mocked)
- **Para**: Governance infrastructure (mocked)
- **IPFS**: Decentralized file storage for profiles

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- MetaMask or compatible Web3 wallet
- Mantle testnet tokens

### Automated Setup (Recommended)

1. **Clone and Setup**

   ```bash
   git clone https://github.com/fayob/swifty-task.git
   cd swifty-task
   ```

2. **Configure Environment**

   ```bash
   # Copy environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   cp contracts/.env.example contracts/.env

   # Update with your values in ALL .env files
   PRIVATE_KEY=your_wallet_private_key
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
   ```

3. **Deploy Contracts**

   ```bash
   cd contracts
   npx hardhat run scripts/deploy-modular.js --network mantle
   ```

## 🔄 Integration

### 🏗️ Modular Smart Contracts

- **SwiftyTaskMain.sol**: Main orchestrator contract
- **UserManager**: User registration and verification
- **TaskManager**: Task lifecycle management
- **DisputeManager**: Automated dispute resolution
- **AIMatchingManager**: AI-powered freelancer matching
- **AutomationManager**: Chainlink automation integration

### 🔧 Unified Backend

- **Integration Service**: Orchestrates all workflows
- **Complete API**: Authentication, tasks, users, governance
- **Mock Services**: Orb identity verification, Para governance
- **Blockchain Service**: Direct smart contract interactions

### 🎨 Modern Frontend

- **Next.js 14**: App Router with server components
- **Web3 Integration**: RainbowKit + Wagmi for seamless wallet connection
- **Responsive Design**: Mobile-first with Tailwind CSS
- **Real-time Updates**: Live task and bid notifications

## 🔧 Architecture Decisions

### Why Mantle Network?

- **Low Fees**: Significantly cheaper than Ethereum mainnet
- **Fast Transactions**: Quick confirmation times for better UX
- **EVM Compatibility**: Easy migration and familiar tooling
- **Growing Ecosystem**: Active development and community

### Why Chainlink?

- **Reliable Price Feeds**: Accurate USDC/USD conversion rates
- **Automation**: Decentralized task timeout and dispute handling
- **Battle-tested**: Proven security and reliability

### Why Account Abstraction?

- **Better UX**: Gasless transactions for mainstream adoption
- **Flexible Authentication**: Multiple authentication methods
- **Simplified Onboarding**: Reduces barrier to entry

## 🤝 Contributing

We welcome contributions to SwiftyTask!

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

Built with ❤️ for the future of decentralized work.
