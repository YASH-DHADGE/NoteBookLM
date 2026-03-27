// Load environment variables FIRST (before any other imports that depend on them)
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import pptRoutes from './routes/pptRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import notebookRoutes from './routes/notebookRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

// Connect to database
connectDB();

const app = express();

// CORS configuration
app.use(
    cors({
        origin: process.env.NODE_ENV === 'production'
            ? 'https://yourdomain.com'
            : 'http://localhost:5173',
        credentials: true,
    })
);

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cookie parser middleware
app.use(cookieParser());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ppt', pptRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/notebooks', notebookRoutes);
app.use('/api/video', videoRoutes);

// Static served uploads
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint with debug info
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
        config: {
            analyzerUrl: process.env.N8N_CONTENT_ANALYSIS_URL,
            flashcardsUrl: process.env.N8N_FLASHCARD_URL,
            pptUrl: process.env.N8N_PPT_WEBHOOK_URL,
        }
    });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
