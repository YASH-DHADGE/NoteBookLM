import express from 'express';
import {
    uploadContent,
    uploadFromUrl,
    analyzeContent,
    generateFlashcards,
    generateQuiz,
    generateMindMap,
    generatePodcast,
    getContents,
    getContent,
    updateFlashcard,
    deleteContent,
    upload,
} from '../controllers/contentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Content CRUD
router.get('/', getContents);
router.get('/:id', getContent);
router.delete('/:id', deleteContent);

// Upload routes
router.post('/upload', upload.single('file'), uploadContent);
router.post('/upload-url', uploadFromUrl);

// AI processing routes
router.post('/:id/analyze', analyzeContent);
router.post('/:id/flashcards', generateFlashcards);
router.post('/:id/quiz', generateQuiz);
router.post('/:id/mindmap', generateMindMap);
router.post('/:id/podcast', generatePodcast);

// Flashcard update
router.patch('/:id/flashcards/:flashcardId', updateFlashcard);

export default router;
