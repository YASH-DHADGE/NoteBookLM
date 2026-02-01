import express from 'express';
import { register, login, logout, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import {
    registerValidation,
    loginValidation,
    validate,
} from '../middleware/validateMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

export default router;
