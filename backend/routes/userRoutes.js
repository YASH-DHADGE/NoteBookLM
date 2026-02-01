import express from 'express';
import {
    getProfile,
    updateProfile,
    updatePassword,
    deleteAccount,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import {
    updateProfileValidation,
    updatePasswordValidation,
    validate,
} from '../middleware/validateMiddleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfileValidation, validate, updateProfile);
router.put('/password', updatePasswordValidation, validate, updatePassword);
router.delete('/account', deleteAccount);

export default router;
