/**
 * User Routes
 * Define all user-related API endpoints
 */

import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';

const router = Router();

// Apply rate limiting to all user routes
router.use(rateLimitMiddleware);

/**
 * @route POST /api/v1/users/register
 * @desc Register a new user
 * @access Private
 */
router.post('/register', authMiddleware, userController.registerUser.bind(userController));

/**
 * @route GET /api/v1/users/profile
 * @desc Get current user's profile
 * @access Private
 */
router.get('/profile', authMiddleware, userController.getUserProfile.bind(userController));

/**
 * @route GET /api/v1/users/:address
 * @desc Get user profile by address
 * @access Public
 */
router.get('/:address', userController.getUserProfile.bind(userController));

/**
 * @route PUT /api/v1/users/skills
 * @desc Update user skills
 * @access Private
 */
router.put('/skills', authMiddleware, userController.updateUserSkills.bind(userController));

/**
 * @route POST /api/v1/users/verify
 * @desc Verify user identity with Orb
 * @access Private
 */
router.post('/verify', authMiddleware, userController.verifyIdentity.bind(userController));

/**
 * @route GET /api/v1/users/analytics/:address
 * @desc Get user analytics
 * @access Public
 */
router.get('/analytics/:address', userController.getUserAnalytics.bind(userController));

/**
 * @route GET /api/v1/users/analytics
 * @desc Get current user's analytics
 * @access Private
 */
router.get('/analytics', authMiddleware, userController.getUserAnalytics.bind(userController));

/**
 * @route GET /api/v1/users/tasks/:address
 * @desc Get user's task history
 * @access Public
 */
router.get('/tasks/:address', userController.getUserTasks.bind(userController));

/**
 * @route GET /api/v1/users/search
 * @desc Search users by skills and criteria
 * @access Public
 * @query skills - Comma-separated list of skills
 * @query minReputation - Minimum reputation score
 * @query verified - Filter verified users only (true/false)
 */
router.get('/search', userController.searchUsers.bind(userController));

export default router;
