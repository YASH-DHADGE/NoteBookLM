import express from 'express';
import { 
    getNotebooks, 
    getNotebook, 
    createNotebook, 
    deleteNotebook 
} from '../controllers/notebookController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(getNotebooks)
    .post(createNotebook);

router.route('/:id')
    .get(getNotebook)
    .delete(deleteNotebook);

export default router;
