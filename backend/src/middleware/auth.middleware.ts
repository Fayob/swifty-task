/**
 * Authentication Middleware
 * Handles Web3 signature-based authentication
 */

import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        address: string;
        nonce?: string;
      };
    }
  }
}

export interface AuthRequest extends Request {
  user: {
    address: string;
    nonce?: string;
  };
}

/**
 * Authentication middleware that verifies JWT tokens
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Access denied. No valid token provided.'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
      
      if (!decoded.address) {
        res.status(401).json({
          success: false,
          error: 'Invalid token format'
        });
        return;
      }

      // Add user info to request
      req.user = {
        address: decoded.address,
        nonce: decoded.nonce
      };

      next();
    } catch (jwtError) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

/**
 * Generate a JWT token for a user
 */
export const generateToken = (address: string, nonce?: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  const payload = {
    address: address.toLowerCase(),
    nonce,
    iat: Math.floor(Date.now() / 1000)
  };

  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Verify a Web3 signature
 */
export const verifySignature = (
  message: string,
  signature: string,
  expectedAddress: string
): boolean => {
  try {
    // Recover the address from the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    // Compare addresses (case-insensitive)
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

/**
 * Generate a nonce for signature verification
 */
export const generateNonce = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Create a message for signing
 */
export const createSignMessage = (address: string, nonce: string): string => {
  return `Welcome to SwiftyTask!\n\nSign this message to authenticate your wallet.\n\nAddress: ${address}\nNonce: ${nonce}\n\nThis request will not trigger a blockchain transaction or cost any gas fees.`;
};

/**
 * Optional middleware for wallet signature authentication
 * This endpoint would be called to authenticate with wallet signature
 */
export const walletAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { address, signature, message, nonce } = req.body;

    if (!address || !signature || !message || !nonce) {
      res.status(400).json({
        success: false,
        error: 'Missing required authentication fields'
      });
      return;
    }

    // Verify the signature
    const isValidSignature = verifySignature(message, signature, address);
    
    if (!isValidSignature) {
      res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
      return;
    }

    // Verify the message format and nonce
    const expectedMessage = createSignMessage(address, nonce);
    if (message !== expectedMessage) {
      res.status(401).json({
        success: false,
        error: 'Invalid message format'
      });
      return;
    }

    // Generate and send JWT token
    const token = generateToken(address, nonce);
    
    res.json({
      success: true,
      data: {
        token,
        address: address.toLowerCase(),
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      },
      message: 'Authentication successful'
    });
  } catch (error) {
    console.error('Wallet auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};
