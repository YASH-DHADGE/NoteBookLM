import asyncHandler from 'express-async-handler';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';
import mammoth from 'mammoth';
import { fileURLToPath } from 'url';
import Content from '../models/Content.js';

// Import PDF.js (ESM)
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure upload directory
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Ensure upload directory exists
(async () => {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (err) {
        console.error('Failed to create uploads directory:', err);
    }
})();

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'text/markdown',
        'audio/mpeg',
        'audio/wav',
        'audio/mp4',
        'audio/ogg',
        'video/mp4',
        'video/webm',
        'video/quicktime',
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} not supported`), false);
    }
};

// Configure multer upload
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
    },
});

/**
 * Extract text from uploaded file based on type
 */
const extractText = async (filePath, mimeType) => {
    console.log(`🔍 Attempting to extract text from: ${filePath} (${mimeType})`);
    try {
        if (mimeType === 'application/pdf') {
            console.log('📄 parsing PDF with pdfjs-dist...');

            // Read file as Uint8Array
            const dataBuffer = await fs.readFile(filePath);
            const uint8Array = new Uint8Array(dataBuffer);

            // Load document
            const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
            const doc = await loadingTask.promise;

            console.log(`📄 PDF loaded, pages: ${doc.numPages}`);

            let fullText = '';
            for (let i = 1; i <= doc.numPages; i++) {
                const page = await doc.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }

            console.log(`✅ PDF extracted ${fullText.length} chars`);
            return fullText;
        }

        if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimeType === 'application/msword'
        ) {
            console.log('📝 parsing Word Doc...');
            const result = await mammoth.extractRawText({ path: filePath });
            console.log(`✅ Doc extracted ${result.value.length} chars`);
            return result.value;
        }

        if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
            console.log('📝 parsing Text/MD...');
            const text = await fs.readFile(filePath, 'utf-8');
            console.log(`✅ Text extracted ${text.length} chars`);
            return text;
        }

        console.log('⚠️ Unsupported or media mime type for text extraction:', mimeType);
        // For audio/video, return empty - will need transcription
        return '';
    } catch (error) {
        console.error('❌ Text extraction error:', error);
        return '';
    }
};

/**
 * Determine content type from mime type
 */
const getContentType = (mimeType) => {
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    return 'document';
};

/**
 * Extract text from AI response (handles various Gemini formats)
 */
const extractAiText = (responseData) => {
    if (!responseData) return '';

    // Handle n8n array response
    let data = responseData;
    if (Array.isArray(data) && data.length > 0) {
        data = data[0];
    }

    if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        // Full Gemini API response
        return data.candidates[0].content.parts[0].text;
    }

    if (data?.content?.parts?.[0]?.text) {
        // Direct candidate/content object
        return data.content.parts[0].text;
    }

    if (data?.text && typeof data.text === 'string') {
        // Plain text field
        return data.text;
    }

    if (data?.output && typeof data.output === 'string') {
        // n8n Gemini node output
        return data.output;
    }

    if (data?.response && typeof data.response === 'string') {
        // General response field
        return data.response;
    }

    if (typeof data === 'string') {
        // Direct string response
        return data;
    }

    // Attempt to stringify if it's an object but we don't know the structure
    // (This is the fallback that caused the issue, but we've added more checks above)
    try {
        return typeof data === 'object' ? JSON.stringify(data) : String(data);
    } catch {
        return '';
    }
};

/**
 * @desc    Upload content file
 * @route   POST /api/content/upload
 * @access  Private
 */
export const uploadContent = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
    }

    console.log('📤 File uploaded:', req.file.originalname);

    const { title, notebookId } = req.body;
    const file = req.file;

    // Extract text from document
    const extractedText = await extractText(file.path, file.mimetype);
    const wordCount = extractedText.split(/\s+/).filter(Boolean).length;

    console.log(`📝 Extracted ${wordCount} words from document`);

    // Create content record
    const content = await Content.create({
        user: req.user._id,
        notebook: notebookId,
        title: title || file.originalname.replace(/\.[^/.]+$/, ''),
        type: getContentType(file.mimetype),
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        filePath: file.path,
        extractedText,
        wordCount,
        status: 'uploaded',
    });

    res.status(201).json({
        success: true,
        data: {
            id: content._id,
            title: content.title,
            type: content.type,
            wordCount: content.wordCount,
            status: content.status,
        },
    });
});

/**
 * @desc    Upload content from URL (YouTube, web articles)
 * @route   POST /api/content/upload-url
 * @access  Private
 */
export const uploadFromUrl = asyncHandler(async (req, res) => {
    const { url, title, notebookId } = req.body;

    if (!url) {
        res.status(400);
        throw new Error('URL is required');
    }

    console.log('🔗 Processing URL:', url);

    let contentType = 'url';
    let extractedText = '';

    // Check if YouTube URL
    const youtubeMatch = url.match(
        /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
    );

    if (youtubeMatch) {
        contentType = 'youtube';
        // YouTube transcript extraction would go here
        // For now, we'll mark it for processing
        console.log('📺 YouTube video detected:', youtubeMatch[1]);
    }

    const content = await Content.create({
        user: req.user._id,
        notebook: notebookId,
        title: title || url,
        type: contentType,
        sourceUrl: url,
        extractedText,
        status: 'uploaded',
    });

    res.status(201).json({
        success: true,
        data: {
            id: content._id,
            title: content.title,
            type: content.type,
            status: content.status,
        },
    });
});

/**
 * @desc    Analyze content with AI (via n8n)
 * @route   POST /api/content/:id/analyze
 * @access  Private
 */
export const analyzeContent = asyncHandler(async (req, res) => {
    console.log('🔍 Analyze request for ID:', req.params.id);
    console.log('🔍 User ID:', req.user._id);

    const content = await Content.findOne({
        _id: req.params.id,
        user: req.user._id,
    });

    if (!content) {
        console.log('❌ Content not found for ID:', req.params.id, 'and user:', req.user._id);
        res.status(404);
        throw new Error('Content not found');
    }

    if (!content.extractedText || content.extractedText.length < 50) {
        res.status(400);
        throw new Error('Not enough text content to analyze. Please upload a document with more content.');
    }

    console.log('🤖 Starting AI analysis for:', content.title);
    console.log('📄 Content ID:', content._id);
    console.log('📝 Text length:', content.extractedText?.length || 0, 'characters');

    // Update status
    content.status = 'processing';
    await content.save();

    const webhookUrl = process.env.N8N_CONTENT_ANALYSIS_URL;

    if (!webhookUrl) {
        content.status = 'error';
        content.errorMessage = 'N8N_CONTENT_ANALYSIS_URL not configured in backend .env';
        await content.save();
        res.status(500);
        throw new Error('Content analysis service not configured. Please contact administrator.');
    }

    console.log('🔗 Webhook URL:', webhookUrl);

    try {
        const n8nPayload = {
            contentId: content._id.toString(),
            title: content.title,
            text: content.extractedText.substring(0, 50000), // Limit text size
            wordCount: content.wordCount,
            type: content.type,
        };

        console.log('📡 Calling n8n webhook for analysis...');
        console.log('📦 Payload size:', JSON.stringify(n8nPayload).length, 'bytes');

        const response = await axios.post(webhookUrl, n8nPayload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000, // 2 minutes timeout
        });

        console.log('✅ n8n response status:', response.status);
        console.log('📥 n8n response data type:', typeof response.data);
        console.log('📥 n8n response data:', JSON.stringify(response.data).substring(0, 500));

        let responseData = response.data;

        // Handle n8n array response (common when using Respond to Webhook)
        if (Array.isArray(responseData) && responseData.length > 0) {
            responseData = responseData[0];
            console.log('📦 Unwrapped array response');
        }

        const analysisText = extractAiText(response.data);

        console.log('📝 Analysis text length:', analysisText.length, 'characters');
        console.log('📝 Analysis text preview:', analysisText.substring(0, 200));

        // Validate we got some content
        if (!analysisText || analysisText.length === 0) {
            throw new Error('n8n returned empty response. Check your workflow configuration.');
        }

        // Create summary from the analysis text
        // First 500 chars for executive summary, full text for detailed analysis
        content.summary = {
            executive: analysisText.substring(0, 500) + (analysisText.length > 500 ? '...' : ''),
            keyPoints: [],
            detailedAnalysis: analysisText,
            entities: [],
            topics: [],
            processingTime: null,
            confidence: null,
        };
        content.status = 'analyzed';
        content.errorMessage = null; // Clear any previous errors
        await content.save();

        console.log('✅ Analysis complete for:', content.title);
        console.log('📊 Summary length:', content.summary.executive?.length || 0, 'characters');

        res.json({
            success: true,
            data: content,
        });
    } catch (error) {
        console.error('❌ Analysis error:', error.message);

        // Determine specific error type and provide helpful message
        let userMessage = 'Analysis failed';
        let statusCode = 502;

        if (error.code === 'ECONNREFUSED') {
            userMessage = 'Cannot connect to n8n. Please ensure n8n is running on localhost:5678.';
            console.error('🔴 n8n connection refused - is n8n running?');
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            userMessage = 'Analysis timed out. The document may be too large or the AI service is slow.';
            console.error('🔴 Request timed out');
        } else if (error.response) {
            // n8n returned an error response
            const n8nError = error.response.data;
            console.error('🔴 n8n error response:', JSON.stringify(n8nError));

            if (n8nError?.message?.includes('No Respond to Webhook node found')) {
                userMessage = 'n8n workflow misconfigured: Missing "Respond to Webhook" node. Please add it to your workflow.';
                console.error('🔴 n8n workflow needs a "Respond to Webhook" node at the end');
            } else if (n8nError?.message?.includes('Workflow could not be started')) {
                userMessage = 'n8n workflow is not active. Please activate the workflow in n8n.';
            } else if (typeof n8nError === 'string') {
                userMessage = `n8n error: ${n8nError}`;
            } else if (n8nError?.message) {
                userMessage = `n8n error: ${n8nError.message}`;
            }
        } else if (error.message) {
            userMessage = error.message;
        }

        // Update content with error status
        content.status = 'error';
        content.errorMessage = userMessage;
        await content.save();

        console.error('📝 Error saved to content:', userMessage);

        res.status(statusCode);
        throw new Error(userMessage);
    }
});

/**
 * @desc    Generate flashcards from content
 * @route   POST /api/content/:id/flashcards
 * @access  Private
 */
export const generateFlashcards = asyncHandler(async (req, res) => {
    const { count = 10, difficulty = 'medium', questionTypes = ['open-ended'] } = req.body;

    const content = await Content.findOne({
        _id: req.params.id,
        user: req.user._id,
    });

    if (!content) {
        res.status(404);
        throw new Error('Content not found');
    }

    if (!content.extractedText || content.extractedText.length < 50) {
        res.status(400);
        throw new Error('Not enough text content to generate flashcards. Please upload a document with more content.');
    }

    console.log(`📚 Generating ${count} flashcards for:`, content.title);
    console.log('📄 Content ID:', content._id);

    const webhookUrl = process.env.N8N_FLASHCARD_URL;

    if (!webhookUrl) {
        res.status(500);
        throw new Error('Flashcard service not configured. N8N_FLASHCARD_URL missing in backend .env');
    }

    console.log('🔗 Flashcard Webhook URL:', webhookUrl);

    try {
        // Use summary if available, otherwise fall back to extracted text
        const textToSend = content.summary?.detailedAnalysis || content.extractedText;

        const n8nPayload = {
            contentId: content._id.toString(),
            title: content.title,
            text: textToSend.substring(0, 50000), // Primary: full summary or extracted text
            summary: content.summary?.executive || '', // Short executive summary
            detailedAnalysis: content.summary?.detailedAnalysis || '',
            keyPoints: content.summary?.keyPoints || [],
            count,
            difficulty,
            questionTypes,
        };

        console.log('📡 Calling n8n webhook for flashcard generation...');
        console.log('📦 Payload size:', JSON.stringify(n8nPayload).length, 'bytes');

        const response = await axios.post(webhookUrl, n8nPayload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000, // 2 minutes timeout
        });

        console.log('✅ n8n response status:', response.status);
        console.log('📥 n8n raw response type:', typeof response.data);
        console.log('📥 n8n raw response (first 500 chars):', JSON.stringify(response.data).substring(0, 500));

        // Parse flashcards from response — handle multiple n8n/Gemini output formats
        let flashcards = [];
        let rawData = response.data;

        // Unwrap n8n array wrapper
        if (Array.isArray(rawData) && rawData.length > 0) {
            rawData = rawData[0];
        }

        if (Array.isArray(rawData)) {
            // Direct array of flashcards
            flashcards = rawData;
        } else if (rawData?.flashcards && Array.isArray(rawData.flashcards)) {
            // { flashcards: [...] }
            flashcards = rawData.flashcards;
        } else {
            // Try to extract a JSON array from text (Gemini often returns JSON inside markdown)
            const textContent = extractAiText(rawData);
            console.log('📦 Trying to extract flashcards from AI text, length:', textContent.length);

            // Look for a JSON array in the text (handles ```json ... ``` fences too)
            const jsonMatch = textContent.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed)) {
                        flashcards = parsed;
                        console.log('✅ Extracted flashcard array from AI text');
                    }
                } catch (e) {
                    console.error('❌ Failed to parse extracted JSON array:', e.message);
                }
            }

            // Also try parsing the entire text as JSON
            if (flashcards.length === 0) {
                try {
                    const parsed = JSON.parse(textContent);
                    flashcards = Array.isArray(parsed) ? parsed : parsed.flashcards || [];
                } catch {
                    // Not JSON, that's fine
                }
            }
        }

        // Validate we got flashcards
        if (!flashcards || flashcards.length === 0) {
            throw new Error('n8n returned no flashcards. Check your workflow configuration.');
        }

        // Normalize flashcard format
        content.flashcards = flashcards.map((card, index) => ({
            question: extractAiText(card.question || card.q || card.front || card),
            answer: extractAiText(card.answer || card.a || card.back || ''),
            difficulty: card.difficulty || difficulty,
            topic: card.topic || '',
            sourceReference: card.source || '',
        }));

        content.flashcardSettings = { count, difficulty, questionTypes };
        content.status = 'flashcards_generated';
        content.errorMessage = null; // Clear any previous errors
        await content.save();

        console.log(`✅ Generated ${content.flashcards.length} flashcards`);

        res.json({
            success: true,
            data: {
                id: content._id,
                flashcards: content.flashcards,
                count: content.flashcards.length,
            },
        });
    } catch (error) {
        console.error('❌ Flashcard generation error:', error.message);

        // Determine specific error type and provide helpful message
        let userMessage = 'Flashcard generation failed';
        let statusCode = 502;

        if (error.code === 'ECONNREFUSED') {
            userMessage = 'Cannot connect to n8n. Please ensure n8n is running on localhost:5678.';
            console.error('🔴 n8n connection refused - is n8n running?');
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            userMessage = 'Flashcard generation timed out. The document may be too large or the AI service is slow.';
            console.error('🔴 Request timed out');
        } else if (error.response) {
            // n8n returned an error response
            const n8nError = error.response.data;
            console.error('🔴 n8n error response:', JSON.stringify(n8nError));

            if (n8nError?.message?.includes('No Respond to Webhook node found')) {
                userMessage = 'n8n workflow misconfigured: Missing "Respond to Webhook" node. Please add it to your workflow.';
                console.error('🔴 n8n workflow needs a "Respond to Webhook" node at the end');
            } else if (n8nError?.message?.includes('Workflow could not be started')) {
                userMessage = 'n8n workflow is not active. Please activate the workflow in n8n.';
            } else if (typeof n8nError === 'string') {
                userMessage = `n8n error: ${n8nError}`;
            } else if (n8nError?.message) {
                userMessage = `n8n error: ${n8nError.message}`;
            }
        } else if (error.message) {
            userMessage = error.message;
        }

        // Update content with error status
        content.status = 'error';
        content.errorMessage = userMessage;
        await content.save();

        console.error('📝 Error saved to content:', userMessage);

        res.status(statusCode);
        throw new Error(userMessage);
    }
});

/**
 * @desc    Get all content for user
 * @route   GET /api/content
 * @access  Private
 */
export const getContents = asyncHandler(async (req, res) => {
    const { type, status, limit = 20, page = 1, notebookId } = req.query;

    const query = { user: req.user._id };
    if (type) query.type = type;
    if (status) query.status = status;
    if (notebookId) query.notebook = notebookId;

    const contents = await Content.find(query)
        .select('-extractedText -flashcards')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

    const total = await Content.countDocuments(query);

    res.json({
        success: true,
        data: contents,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
        },
    });
});

/**
 * @desc    Get single content with flashcards
 * @route   GET /api/content/:id
 * @access  Private
 */
export const getContent = asyncHandler(async (req, res) => {
    const content = await Content.findOne({
        _id: req.params.id,
        user: req.user._id,
    });

    if (!content) {
        res.status(404);
        throw new Error('Content not found');
    }

    res.json({
        success: true,
        data: content,
    });
});

/**
 * @desc    Update flashcard review status
 * @route   PATCH /api/content/:id/flashcards/:flashcardId
 * @access  Private
 */
export const updateFlashcard = asyncHandler(async (req, res) => {
    const { known, reviewCount } = req.body;

    const content = await Content.findOne({
        _id: req.params.id,
        user: req.user._id,
    });

    if (!content) {
        res.status(404);
        throw new Error('Content not found');
    }

    const flashcard = content.flashcards.id(req.params.flashcardId);

    if (!flashcard) {
        res.status(404);
        throw new Error('Flashcard not found');
    }

    if (typeof known === 'boolean') flashcard.known = known;
    if (typeof reviewCount === 'number') flashcard.reviewCount = reviewCount;
    flashcard.lastReviewed = new Date();

    // Simple spaced repetition: next review in 1, 3, 7, 14, 30 days based on review count
    const intervals = [1, 3, 7, 14, 30];
    const intervalIndex = Math.min(flashcard.reviewCount, intervals.length - 1);
    flashcard.nextReviewDate = new Date(
        Date.now() + intervals[intervalIndex] * 24 * 60 * 60 * 1000
    );

    await content.save();

    res.json({
        success: true,
        data: flashcard,
    });
});

/**
 * @desc    Delete content
 * @route   DELETE /api/content/:id
 * @access  Private
 */
export const deleteContent = asyncHandler(async (req, res) => {
    const content = await Content.findOne({
        _id: req.params.id,
        user: req.user._id,
    });

    if (!content) {
        res.status(404);
        throw new Error('Content not found');
    }

    // Delete uploaded file if exists
    if (content.filePath) {
        try {
            await fs.unlink(content.filePath);
        } catch (err) {
            console.error('Failed to delete file:', err.message);
        }
    }

    await content.deleteOne();

    res.json({
        success: true,
        message: 'Content deleted',
    });
});

/**
 * @desc    Generate quiz questions from content
 * @route   POST /api/content/:id/quiz
 * @access  Private
 */
export const generateQuiz = asyncHandler(async (req, res) => {
    const { count = 10, difficulty = 'medium' } = req.body;

    const content = await Content.findOne({
        _id: req.params.id,
        user: req.user._id,
    });

    if (!content) {
        res.status(404);
        throw new Error('Content not found');
    }

    // Use summary if available, otherwise use extracted text
    const textToUse = content.summary?.detailedAnalysis || content.extractedText;

    if (!textToUse || textToUse.length < 50) {
        res.status(400);
        throw new Error('Not enough text content to generate quiz. Please analyze the document first.');
    }

    console.log(`📝 Generating ${count} quiz questions for:`, content.title);

    const webhookUrl = process.env.N8N_QUIZ_URL;

    if (!webhookUrl) {
        // If no quiz webhook, generate placeholder quiz from content
        console.log('⚠️ N8N_QUIZ_URL not configured, using placeholder quiz');

        content.quiz = [{
            question: `What is the main topic of "${content.title}"?`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 0,
            explanation: 'This is a placeholder question. Configure N8N_QUIZ_URL for AI-generated quizzes.',
            difficulty: 'easy',
        }];
        content.quizSettings = { count, difficulty };
        await content.save();

        return res.json({
            success: true,
            data: {
                id: content._id,
                quiz: content.quiz,
                count: content.quiz.length,
            },
        });
    }

    try {
        const n8nPayload = {
            contentId: content._id.toString(),
            title: content.title,
            text: textToUse.substring(0, 50000),
            summary: content.summary?.executive || '',
            count,
            difficulty,
        };

        console.log('📡 Calling n8n webhook for quiz generation...');

        const response = await axios.post(webhookUrl, n8nPayload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000,
        });

        console.log('✅ n8n response status:', response.status);

        // Extract quiz from Gemini response format
        let quizData = response.data;

        if (Array.isArray(quizData) && quizData.length > 0) {
            quizData = quizData[0];
        }

        if (quizData?.candidates?.[0]?.content?.parts?.[0]?.text) {
            const quizText = quizData.candidates[0].content.parts[0].text;
            // Try to parse JSON from the response
            const jsonMatch = quizText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                try {
                    quizData = JSON.parse(jsonMatch[0]);
                } catch {
                    console.error('Failed to parse quiz JSON');
                }
            }
        }

        let questions = Array.isArray(quizData) ? quizData : quizData?.questions || quizData?.quiz || [];

        content.quiz = questions.map((q, index) => ({
            question: extractAiText(q.question || q.q || q),
            options: Array.isArray(q.options || q.choices) ? (q.options || q.choices) : [],
            correctAnswer: q.correctAnswer ?? q.correct ?? q.answer ?? 0,
            explanation: extractAiText(q.explanation || ''),
            difficulty: q.difficulty || difficulty,
            topic: q.topic || '',
        }));

        content.quizSettings = { count, difficulty };
        content.status = 'quiz_generated';
        await content.save();

        console.log(`✅ Generated ${content.quiz.length} quiz questions`);

        res.json({
            success: true,
            data: {
                id: content._id,
                quiz: content.quiz,
                count: content.quiz.length,
            },
        });
    } catch (error) {
        console.error('❌ Quiz generation error:', error.message);
        res.status(502);
        throw new Error(`Quiz generation failed: ${error.message}`);
    }
});

/**
 * @desc    Generate mind map from content
 * @route   POST /api/content/:id/mindmap
 * @access  Private
 */
export const generateMindMap = asyncHandler(async (req, res) => {
    const content = await Content.findOne({
        _id: req.params.id,
        user: req.user._id,
    });

    if (!content) {
        res.status(404);
        throw new Error('Content not found');
    }

    // Use summary if available, otherwise use extracted text
    const textToUse = content.summary?.detailedAnalysis || content.extractedText;

    if (!textToUse || textToUse.length < 50) {
        res.status(400);
        throw new Error('Not enough text content to generate mind map. Please analyze the document first.');
    }

    console.log(`🗺️ Generating mind map for:`, content.title);

    const webhookUrl = process.env.N8N_MINDMAP_URL;

    if (!webhookUrl) {
        // Generate simple mind map from summary
        console.log('⚠️ N8N_MINDMAP_URL not configured, generating placeholder');

        const topics = content.summary?.topics || [];
        const keyPoints = content.summary?.keyPoints || [];

        content.mindmap = {
            rootNode: {
                id: 'root',
                label: content.title,
                children: [
                    ...topics.slice(0, 5).map((t, i) => ({
                        id: `topic-${i}`,
                        label: t,
                        children: [],
                    })),
                    ...keyPoints.slice(0, 5).map((kp, i) => ({
                        id: `keypoint-${i}`,
                        label: kp.substring(0, 50) + (kp.length > 50 ? '...' : ''),
                        children: [],
                    })),
                ],
            },
            generatedAt: new Date(),
        };
        content.status = 'mindmap_generated';
        await content.save();

        return res.json({
            success: true,
            data: {
                id: content._id,
                mindmap: content.mindmap,
            },
        });
    }

    try {
        const n8nPayload = {
            contentId: content._id.toString(),
            title: content.title,
            text: textToUse.substring(0, 50000),
            summary: content.summary?.executive || '',
            keyPoints: content.summary?.keyPoints || [],
        };

        console.log('📡 Calling n8n webhook for mind map generation...');

        const response = await axios.post(webhookUrl, n8nPayload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000,
        });

        console.log('✅ n8n response status:', response.status);

        let mindmapData = response.data;

        if (Array.isArray(mindmapData) && mindmapData.length > 0) {
            mindmapData = mindmapData[0];
        }

        content.mindmap = {
            rootNode: mindmapData?.rootNode || mindmapData || { id: 'root', label: content.title, children: [] },
            generatedAt: new Date(),
        };
        content.status = 'mindmap_generated';
        await content.save();

        res.json({
            success: true,
            data: {
                id: content._id,
                mindmap: content.mindmap,
            },
        });
    } catch (error) {
        console.error('❌ Mind map generation error:', error.message);
        res.status(502);
        throw new Error(`Mind map generation failed: ${error.message}`);
    }
});

/**
 * @desc    Generate podcast script from content
 * @route   POST /api/content/:id/podcast
 * @access  Private
 */
export const generatePodcast = asyncHandler(async (req, res) => {
    const content = await Content.findOne({
        _id: req.params.id,
        user: req.user._id,
    });

    if (!content) {
        res.status(404);
        throw new Error('Content not found');
    }

    const textToUse = content.summary?.detailedAnalysis || content.extractedText;

    if (!textToUse || textToUse.length < 50) {
        res.status(400);
        throw new Error('Not enough text content. Please analyze the document first.');
    }

    console.log(`🎙️ Generating podcast for:`, content.title);

    const webhookUrl = process.env.N8N_PODCAST_URL;

    if (!webhookUrl) {
        res.status(500);
        throw new Error('Podcast service not configured. N8N_PODCAST_URL missing in backend .env');
    }

    try {
        const n8nPayload = {
            contentId: content._id.toString(),
            title: content.title,
            type: content.type,
            wordCount: content.wordCount,
            text: textToUse.substring(0, 50000),
        };

        console.log('📡 Calling n8n webhook for podcast generation...');

        const response = await axios.post(webhookUrl, n8nPayload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 180000, // 3 min — podcast scripts are long
        });

        console.log('✅ n8n podcast response status:', response.status);
        console.log('📥 Raw response preview:', JSON.stringify(response.data).substring(0, 300));

        // Extract the text from Gemini response
        const rawText = extractAiText(response.data);

        // Attempt to parse as JSON (podcast script object)
        let podcastData = null;

        // Try to find a JSON object in the text
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                podcastData = JSON.parse(jsonMatch[0]);
                console.log('✅ Parsed podcast JSON successfully');
            } catch (e) {
                console.error('⚠️ Failed to parse podcast JSON, using raw text');
            }
        }

        // Fallback: wrap raw text into a script structure
        if (!podcastData || !podcastData.script) {
            podcastData = {
                title: `${content.title} — Podcast Overview`,
                description: `An AI-generated podcast discussion about "${content.title}"`,
                duration_estimate: '~10 min',
                script: [
                    { speaker: 'Alex', text: rawText }
                ],
            };
        }

        res.json({
            success: true,
            data: {
                id: content._id,
                podcast: podcastData,
            },
        });
    } catch (error) {
        console.error('❌ Podcast generation error:', error.message);
        res.status(502);
        throw new Error(`Podcast generation failed: ${error.message}`);
    }
});

