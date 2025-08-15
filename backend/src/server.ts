/**
 * Server Entry Point
 * Starts the Express server and handles graceful shutdown
 */

import app from './app';
import { SERVER_CONFIG } from '../constants';

class Server {
  private server: any;
  
  constructor() {
    this.startServer();
    this.setupGracefulShutdown();
  }

  private startServer(): void {
    const port = SERVER_CONFIG.PORT;
    
    this.server = app.listen(port, () => {
      console.log('🚀 SwiftyTask Backend Server Started');
      console.log(`📡 Server running on port ${port}`);
      console.log(`🌍 Environment: ${SERVER_CONFIG.NODE_ENV}`);
      console.log(`📝 API Documentation: http://localhost:${port}/health`);
      console.log(`⛓️  Blockchain: Mantle Testnet`);
      
      if (SERVER_CONFIG.NODE_ENV === 'development') {
        console.log('\n🔧 Development Mode - Additional logging enabled');
        console.log(`📋 API Base URL: http://localhost:${port}${SERVER_CONFIG.API_PREFIX}`);
      }
      
      console.log('\n✅ Server is ready to accept connections\n');
    });

    this.server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use`);
        console.error('Please try a different port or stop the existing process');
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });
  }

  private setupGracefulShutdown(): void {
    // Handle SIGTERM (Docker, Heroku, etc.)
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    
    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    
    // Handle other shutdown signals
    process.on('SIGUSR1', this.gracefulShutdown.bind(this));
    process.on('SIGUSR2', this.gracefulShutdown.bind(this));
  }

  private gracefulShutdown(signal: string): void {
    console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
    
    if (!this.server) {
      console.log('✅ Server was not running, exiting...');
      process.exit(0);
      return;
    }

    // Stop accepting new connections
    this.server.close((error: any) => {
      if (error) {
        console.error('❌ Error during server shutdown:', error);
        process.exit(1);
        return;
      }

      console.log('✅ Server closed successfully');
      console.log('🔄 Cleaning up resources...');

      // Perform cleanup tasks here
      this.cleanup()
        .then(() => {
          console.log('✅ Cleanup completed');
          console.log('👋 SwiftyTask Backend Server shutdown complete');
          process.exit(0);
        })
        .catch((cleanupError) => {
          console.error('❌ Error during cleanup:', cleanupError);
          process.exit(1);
        });
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown after 30 seconds');
      process.exit(1);
    }, 30000);
  }

  private async cleanup(): Promise<void> {
    try {
      // Close database connections (if any)
      // await database.close();
      
      // Close Redis connections (if any)
      // await redis.disconnect();
      
      // Stop blockchain event listeners
      // blockchainService.removeAllListeners();
      
      // Any other cleanup tasks
      console.log('🧹 All resources cleaned up');
    } catch (error) {
      console.error('⚠️  Warning: Some cleanup tasks failed:', error);
      // Don't throw here - we still want to exit gracefully
    }
  }
}

// Start the server
new Server();

// Export for testing purposes
export default app;
