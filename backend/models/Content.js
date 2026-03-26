import mongoose from 'mongoose';

const flashcardSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
    },
    answer: {
        type: String,
        required: true,
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
    },
    topic: String,
    sourceReference: String,
    known: {
        type: Boolean,
        default: false,
    },
    reviewCount: {
        type: Number,
        default: 0,
    },
    lastReviewed: Date,
    nextReviewDate: Date,
});

const quizQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
    },
    options: [{
        type: String,
    }],
    correctAnswer: {
        type: Number, // index of correct option
        required: true,
    },
    explanation: String,
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
    },
    topic: String,
});

const mindmapNodeSchema = new mongoose.Schema({
    id: String,
    label: String,
    children: [{ type: mongoose.Schema.Types.Mixed }],
});

const summarySchema = new mongoose.Schema({
    executive: String,
    keyPoints: [String],
    detailedAnalysis: String,
    entities: [{
        name: String,
        type: String, // person, date, location, term
    }],
    topics: [String],
    processingTime: Number,
    confidence: Number,
});

const contentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        notebook: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Notebook',
        },
        title: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['document', 'audio', 'video', 'url', 'youtube'],
            required: true,
        },
        originalFilename: String,
        mimeType: String,
        fileSize: Number,
        filePath: String,
        sourceUrl: String,
        extractedText: {
            type: String,
            default: '',
        },
        wordCount: {
            type: Number,
            default: 0,
        },
        duration: Number, // for audio/video in seconds
        summary: summarySchema,
        flashcards: [flashcardSchema],
        flashcardSettings: {
            count: { type: Number, default: 10 },
            difficulty: { type: String, default: 'medium' },
            questionTypes: [String],
        },
        quiz: [quizQuestionSchema],
        quizSettings: {
            count: { type: Number, default: 10 },
            difficulty: { type: String, default: 'medium' },
        },
        mindmap: {
            rootNode: mindmapNodeSchema,
            generatedAt: Date,
        },
        status: {
            type: String,
            enum: ['uploaded', 'processing', 'analyzed', 'flashcards_generated', 'quiz_generated', 'mindmap_generated', 'error'],
            default: 'uploaded',
        },
        errorMessage: String,
        collectionName: String, // for organizing content
        tags: [String],
        isFavorite: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
contentSchema.index({ user: 1, createdAt: -1 });
contentSchema.index({ user: 1, status: 1 });
contentSchema.index({ user: 1, type: 1 });

const Content = mongoose.model('Content', contentSchema);

export default Content;
