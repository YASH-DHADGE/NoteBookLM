// Load environment variables FIRST (before any other imports that depend on them)
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import pptRoutes from './routes/pptRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
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

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
    });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
