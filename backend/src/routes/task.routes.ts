/**
 * Task Routes
 * Define all task-related API endpoints
 */

import { Router } from 'express';
import { taskController } from '../controllers/task.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';

const router = Router();

// Apply rate limiting to all task routes
router.use(rateLimitMiddleware);

/**
 * @route POST /api/v1/tasks
 * @desc Create a new task
 * @access Private
 */
router.post('/', authMiddleware, taskController.createTask.bind(taskController));

/**
 * @route GET /api/v1/tasks
 * @desc Get tasks with filters and pagination
 * @access Public
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20, max: 100)
 * @query status - Task status filter
 * @query skills - Comma-separated list of skills
 * @query minBudget - Minimum budget filter
 * @query maxBudget - Maximum budget filter
 * @query isUrgent - Filter urgent tasks (true/false)
 * @query client - Filter by client address
 */
router.get('/', taskController.getTasks.bind(taskController));

/**
 * @route GET /api/v1/tasks/:taskId
 * @desc Get task details by ID
 * @access Public
 */
router.get('/:taskId', taskController.getTask.bind(taskController));

/**
 * @route POST /api/v1/tasks/:taskId/bids
 * @desc Submit a bid for a task
 * @access Private
 */
router.post('/:taskId/bids', authMiddleware, taskController.submitBid.bind(taskController));

/**
 * @route GET /api/v1/tasks/:taskId/bids
 * @desc Get all bids for a task
 * @access Public
 */
router.get('/:taskId/bids', taskController.getTaskBids.bind(taskController));

/**
 * @route POST /api/v1/tasks/:taskId/accept-bid
 * @desc Accept a bid for a task
 * @access Private (Client only)
 */
router.post('/:taskId/accept-bid', authMiddleware, taskController.acceptBid.bind(taskController));

/**
 * @route POST /api/v1/tasks/:taskId/complete
 * @desc Mark task as completed
 * @access Private (Client only)
 */
router.post('/:taskId/complete', authMiddleware, taskController.completeTask.bind(taskController));

/**
 * @route GET /api/v1/tasks/:taskId/recommendations
 * @desc Get recommended freelancers for a task
 * @access Public
 */
router.get('/:taskId/recommendations', taskController.getTaskRecommendations.bind(taskController));

export default router;
