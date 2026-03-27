import express from 'express';
import { generateVideoScript, generateVideo } from '../controllers/videoController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Route to kick off video generation
router.post('/generate', generateVideo);
router.post('/generate-script', generateVideoScript);

export default router;
