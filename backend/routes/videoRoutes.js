import express from 'express';
import { generateVideoScript, generateVideo, getVideoStatus } from '../controllers/videoController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Route to kick off video generation
router.post('/generate', generateVideo);
router.post('/generate-script', generateVideoScript);
router.get('/status/:jobId', getVideoStatus);

export default router;
