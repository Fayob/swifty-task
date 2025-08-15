/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse
 */

import rateLimit from 'express-rate-limit';
import { RATE_LIMIT_CONFIG } from '../../constants';

/**
 * General rate limiting middleware
 */
export const rateLimitMiddleware = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.WINDOW_MS,
  max: RATE_LIMIT_CONFIG.MAX_REQUESTS,
  message: {
    success: false,
    error: RATE_LIMIT_CONFIG.MESSAGE
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests from rate limiting
  skip: (req, res) => res.statusCode < 400,
  // Custom key generator based on IP and user address if authenticated
  keyGenerator: (req) => {
    const userAddress = req.user?.address;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return userAddress ? `${ip}:${userAddress}` : ip;
  }
});

/**
 * Strict rate limiting for authentication endpoints
 */
export const authRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Don't skip any requests for auth endpoints
  skip: () => false
});

/**
 * Relaxed rate limiting for read-only endpoints
 */
export const readOnlyRateLimitMiddleware = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.WINDOW_MS,
  max: RATE_LIMIT_CONFIG.MAX_REQUESTS * 3, // 3x the normal limit for read operations
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skip: (req, res) => res.statusCode < 400,
  keyGenerator: (req) => {
    const userAddress = req.user?.address;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return userAddress ? `readonly:${ip}:${userAddress}` : `readonly:${ip}`;
  }
});

/**
 * Very strict rate limiting for write operations
 */
export const writeRateLimitMiddleware = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit each user to 20 write operations per 5 minutes
  message: {
    success: false,
    error: 'Too many write operations, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => res.statusCode < 400,
  keyGenerator: (req) => {
    const userAddress = req.user?.address;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return userAddress ? `write:${userAddress}` : `write:${ip}`;
  }
});

/**
 * Rate limiting for blockchain operations (very conservative)
 */
export const blockchainRateLimitMiddleware = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // Limit each user to 10 blockchain operations per 10 minutes
  message: {
    success: false,
    error: 'Too many blockchain operations, please wait before trying again'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => res.statusCode < 400,
  keyGenerator: (req) => {
    const userAddress = req.user?.address;
    return userAddress ? `blockchain:${userAddress}` : `blockchain:${req.ip}`;
  }
});
