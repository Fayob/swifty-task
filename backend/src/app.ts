/**
 * Express Application Setup
 * Main application configuration and middleware setup
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

// Import routes
import taskRoutes from './routes/task.routes';
import userRoutes from './routes/user.routes';

// Import middleware
import { 
  authRateLimitMiddleware, 
  readOnlyRateLimitMiddleware 
} from './middleware/rateLimit.middleware';
import { 
  walletAuthMiddleware, 
  generateNonce, 
  createSignMessage 
} from './middleware/auth.middleware';

// Import services
import { blockchainService } from './services/blockchain.service';
import { mockOrbService, mockParaService } from './services/mock.service';

// Load environment variables
dotenv.config();

// Import constants
import { SERVER_CONFIG } from '../constants';

class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
    this.initializeServices();
  }

  private configureMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    const corsOptions = {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3001'
      ],
      credentials: true,
      optionsSuccessStatus: 200
    };
    this.app.use(cors(corsOptions));

    // Compression
    this.app.use(compression());

    // Logging
    if (SERVER_CONFIG.NODE_ENV === 'development') {
      this.app.use(morgan('combined'));
    } else {
      this.app.use(morgan('common'));
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Trust proxy (for rate limiting behind reverse proxy)
    this.app.set('trust proxy', 1);
  }

  private configureRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'SwiftyTask API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Authentication endpoints
    this.app.post('/api/v1/auth/nonce', authRateLimitMiddleware, this.generateNonceEndpoint);
    this.app.post('/api/v1/auth/login', authRateLimitMiddleware, walletAuthMiddleware);

    // API routes with rate limiting
    this.app.use('/api/v1/tasks', taskRoutes);
    this.app.use('/api/v1/users', userRoutes);

    // Governance endpoints (Para integration)
    this.app.get('/api/v1/governance/proposals', readOnlyRateLimitMiddleware, this.getGovernanceProposals);
    this.app.post('/api/v1/governance/vote', this.voteOnProposal);

    // Platform statistics
    this.app.get('/api/v1/stats', readOnlyRateLimitMiddleware, this.getPlatformStats);

    // Blockchain utilities
    this.app.get('/api/v1/blockchain/gas-price', readOnlyRateLimitMiddleware, this.getGasPrice);
    this.app.get('/api/v1/blockchain/exchange-rate', readOnlyRateLimitMiddleware, this.getExchangeRate);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found'
      });
    });
  }

  private configureErrorHandling(): void {
    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', error);

      // Don't leak error details in production
      const isDevelopment = SERVER_CONFIG.NODE_ENV === 'development';
      
      res.status(error.statusCode || 500).json({
        success: false,
        error: isDevelopment ? error.message : 'Internal server error',
        ...(isDevelopment && { stack: error.stack })
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  private initializeServices(): void {
    // Initialize blockchain service event listeners
    try {
      blockchainService.setupEventListeners();
      console.log('Blockchain service initialized');
    } catch (error) {
      console.warn('Failed to initialize blockchain service:', error);
    }
  }

  // Route handlers

  private generateNonceEndpoint = (req: express.Request, res: express.Response): void => {
    try {
      const { address } = req.body;

      if (!address) {
        res.status(400).json({
          success: false,
          error: 'Wallet address is required'
        });
        return;
      }

      const nonce = generateNonce();
      const message = createSignMessage(address, nonce);

      res.json({
        success: true,
        data: {
          nonce,
          message
        }
      });
    } catch (error) {
      console.error('Error generating nonce:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate nonce'
      });
    }
  };

  private getGovernanceProposals = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const proposals = await mockParaService.getActiveProposals();
      const stats = await mockParaService.getGovernanceStats();

      res.json({
        success: true,
        data: {
          proposals,
          stats
        }
      });
    } catch (error) {
      console.error('Error getting governance proposals:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get governance proposals'
      });
    }
  };

  private voteOnProposal = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { proposalId, support } = req.body;
      const voterAddress = req.user?.address;

      if (!voterAddress) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (typeof proposalId !== 'number' || typeof support !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'Invalid proposal ID or support value'
        });
        return;
      }

      const votingPower = await mockParaService.getVotingPower(voterAddress);
      const success = await mockParaService.voteOnProposal(proposalId, voterAddress, support, votingPower);

      res.json({
        success,
        data: {
          proposalId,
          support,
          votingPower
        },
        message: 'Vote recorded successfully'
      });
    } catch (error) {
      console.error('Error voting on proposal:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record vote'
      });
    }
  };

  private getPlatformStats = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const blockchainStats = await blockchainService.getPlatformStats();
      const governanceStats = await mockParaService.getGovernanceStats();

      const stats = {
        blockchain: blockchainStats,
        governance: governanceStats,
        lastUpdated: new Date().toISOString()
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting platform stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get platform statistics'
      });
    }
  };

  private getGasPrice = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const gasPrice = await blockchainService.getGasPrice();

      res.json({
        success: true,
        data: {
          gasPrice: gasPrice.toString(),
          gasPriceGwei: Number(gasPrice) / 1e9
        }
      });
    } catch (error) {
      console.error('Error getting gas price:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get gas price'
      });
    }
  };

  private getExchangeRate = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const rate = await blockchainService.getUSDToTokenRate();

      res.json({
        success: true,
        data: {
          usdToTokenRate: rate,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting exchange rate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get exchange rate'
      });
    }
  };
}

export default new App().app;
