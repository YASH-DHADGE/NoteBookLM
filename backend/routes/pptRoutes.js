import express from 'express';
import { generatePptx, generatePptxWithTemplate, healthCheck, upload } from '../controllers/pptController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route for health check
router.get('/health', healthCheck);

// Protected route for PPT generation (without template)
router.post('/generate', protect, generatePptx);

// Protected route for PPT generation with template upload
router.post('/generate-with-template', protect, upload.single('template'), generatePptxWithTemplate);

export default router;
