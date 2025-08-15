/**
 * Constants for the SwiftyTask backend
 * Non-secret configuration values that change frequently
 */

// Server Configuration
export const SERVER_CONFIG = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_PREFIX: '/api/v1'
};

// Blockchain Configuration
export const BLOCKCHAIN_CONFIG = {
  MANTLE_TESTNET: {
    RPC_URL: 'https://rpc.testnet.mantle.xyz',
    CHAIN_ID: 5001,
    NAME: 'Mantle Testnet',
    CURRENCY: {
      NAME: 'MNT',
      SYMBOL: 'MNT',
      DECIMALS: 18
    }
  },
  // Mock USDC contract address for Mantle testnet
  USDC_ADDRESS: '0x...',
  // Default gas limit for transactions
  DEFAULT_GAS_LIMIT: 500000
};

// Contract Configuration
export const CONTRACT_CONFIG = {
  // These will be set after deployment
  SWIFTY_TASK_ADDRESS: '',
  PRICE_FEED_ADDRESS: '', // USDC/USD price feed
  ABI_PATH: '../contracts/artifacts/contracts/SwiftyTaskMain.sol/SwiftyTaskMain.json'
};

// Business Logic Constants
export const BUSINESS_RULES = {
  // Minimum reputation required for certain actions
  MIN_REPUTATION_FOR_HIGH_VALUE_TASKS: 75,
  MIN_REPUTATION_FOR_DISPUTES: 50,
  
  // Task constraints
  MIN_TASK_BUDGET_USD: 5, // $5 minimum
  MAX_TASK_BUDGET_USD: 10000, // $10,000 maximum
  MIN_TASK_DEADLINE_HOURS: 1,
  MAX_TASK_DEADLINE_DAYS: 30,
  
  // Bidding constraints
  MAX_BIDS_PER_TASK: 50,
  MIN_BID_AMOUNT_USD: 1,
  
  // Reputation scoring
  REPUTATION_INCREASE_TASK_COMPLETE: 5,
  REPUTATION_DECREASE_DISPUTE_LOSS: 10,
  REPUTATION_INCREASE_GOOD_REVIEW: 3,
  
  // Platform fees
  PLATFORM_FEE_PERCENTAGE: 2.5
};

// API Rate Limiting
export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  MESSAGE: 'Too many requests from this IP, please try again later'
};

// AI Matching Algorithm Configuration
export const AI_MATCHING_CONFIG = {
  // Skill matching weights
  EXACT_SKILL_MATCH_WEIGHT: 10,
  PARTIAL_SKILL_MATCH_WEIGHT: 5,
  EXPERIENCE_WEIGHT: 8,
  REPUTATION_WEIGHT: 7,
  COMPLETION_RATE_WEIGHT: 6,
  RESPONSE_TIME_WEIGHT: 4,
  
  // Matching thresholds
  MIN_MATCH_SCORE: 30,
  RECOMMENDED_MATCH_SCORE: 60,
  EXCELLENT_MATCH_SCORE: 80,
  
  // Skill categories for matching
  SKILL_CATEGORIES: {
    'development': ['javascript', 'typescript', 'python', 'react', 'node.js', 'web3', 'solidity'],
    'design': ['ui/ux', 'graphic design', 'figma', 'photoshop', 'illustration', 'branding'],
    'marketing': ['content writing', 'social media', 'seo', 'copywriting', 'email marketing'],
    'data': ['data analysis', 'excel', 'sql', 'python', 'machine learning', 'statistics'],
    'business': ['project management', 'business analysis', 'consulting', 'strategy']
  }
};

// Mock Service URLs (for development)
export const MOCK_SERVICES = {
  ORB_VERIFICATION: 'http://localhost:5001/api/verify',
  PARA_GOVERNANCE: 'http://localhost:5002/api/governance',
  AI_MATCHING: 'http://localhost:5003/api/match'
};

// File Upload Configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  UPLOAD_PATH: './uploads'
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};
