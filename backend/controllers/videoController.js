import asyncHandler from 'express-async-handler';
import puppeteer from 'puppeteer';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import gTTS from 'gtts';
import Content from '../models/Content.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

ffmpeg.setFfmpegPath(ffmpegStatic);

let browserInstance = null;

const getBrowser = async () => {
    if (!browserInstance || !browserInstance.isConnected()) {
        console.log('Launching new Puppeteer browser instance for video...');
        browserInstance = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });
    }
    return browserInstance;
};

process.on('SIGINT', async () => {
    if (browserInstance) await browserInstance.close();
    process.exit();
});
process.on('SIGTERM', async () => {
    if (browserInstance) await browserInstance.close();
    process.exit();
});

const TEMP_DIR = path.join(__dirname, '..', 'temp');
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'videos');

(async () => {
    try { await fs.mkdir(TEMP_DIR, { recursive: true }); } catch (e) {}
    try { await fs.mkdir(UPLOAD_DIR, { recursive: true }); } catch (e) {}
})();

const generateSpeech = (text, outputPath) => {
    return new Promise((resolve, reject) => {
        const gtts = new gTTS(text, 'en');
        gtts.save(outputPath, function (err, result) {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

// In-memory Job Queue for Video Assembly
const jobs = new Map();

const updateJobAndEmit = (jobId, payload) => {
    const job = jobs.get(jobId);
    if (!job) return;
    Object.assign(job, payload);
    const dataString = JSON.stringify({ 
        jobId, 
        status: job.status, 
        progress: job.progress, 
        step: job.step, 
        error: job.error, 
        result: job.result 
    });
    for (const listener of job.listeners) {
        listener(dataString);
    }
};

/**
 * @desc    Get Job Status (SSE)
 * @route   GET /api/video/status/:jobId
 * @access  Private
 */
export const getVideoStatus = (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);
    
    if (!job) {
        return res.status(404).json({ message: 'Job not found' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const listener = (dataString) => {
        res.write(`data: ${dataString}\n\n`);
        const data = JSON.parse(dataString);
        if (data.status === 'done' || data.status === 'error') {
            res.end();
            job.listeners.delete(listener);
        }
    };
    
    job.listeners.add(listener);
    
    // Send immediate current state
    res.write(`data: ${JSON.stringify({ 
        jobId, status: job.status, progress: job.progress, step: job.step, error: job.error, result: job.result 
    })}\n\n`);
    
    req.on('close', () => {
        job.listeners.delete(listener);
    });
};

/**
 * @desc    Generate script for video based on content
 * @route   POST /api/video/generate-script
 * @access  Private
 */
export const generateVideoScript = asyncHandler(async (req, res) => {
    const { contentId, topic, targetAudience, keyPoints, colorScheme, teachingStyle } = req.body;
    
    let extractedText = '';
    if (contentId) {
        const content = await Content.findOne({ _id: contentId, user: req.user._id });
        if (!content) {
            res.status(404);
            throw new Error('Content not found');
        }
        
        // Return cached script if it exists and parameters haven't changed drastically
        if (content.videoScriptCache && (content.videoScriptCache.topic === topic)) {
            // we could return cached but let's just proceed for now or implement full caching:
            // return res.json({ success: true, data: content.videoScriptCache });
        }
        extractedText = content.summary?.detailedAnalysis || content.extractedText || '';
    }

    // Fallback helper function to extract dummy script if Mistral is unavailable
    const fallbackScriptGeneration = (html, t, style) => {
        const matches = html.match(/<section[^>]*>[\s\S]*?<\/section>|<div[^>]*class="[^"]*slide[^"]*"[^>]*>[\s\S]*?<\/div>/gi) || [];
        const count = Math.max(matches.length, 3);
        const fallback = [];
        for (let i = 0; i < count; i++) {
            const styleText = style === 'storytelling' ? 'Let me tell you a story about' : 'Welcome to slide';
            fallback.push({
                slideNumber: i + 1,
                narration: `${styleText} ${i+1}. The topic is ${t}. As you can see, there are important key points to remember.`
            });
        }
        return fallback;
    };

    console.log(`🎬 Generating video script. Topic: "${topic}", Style: ${teachingStyle}`);

    const pptWebhookUrl = process.env.N8N_PPT_WEBHOOK_URL;
    if (!pptWebhookUrl) throw new Error('N8N_PPT_WEBHOOK_URL not configured');

    const promptStyleMap = {
        'concise': 'Keep the narrative brief and strictly to the point.',
        'detailed': 'Provide a comprehensive and very detailed explanation for every point.',
        'storytelling': 'Weave the facts into an engaging, narrative-driven story.'
    };
    const styleInstruction = promptStyleMap[teachingStyle?.toLowerCase()] || promptStyleMap['concise'];

    const n8nPayload = [{
        "Topic": topic,
        "Target Audience": targetAudience || "General Audience",
        "Key Points to Cover": keyPoints || extractedText.substring(0, 1000),
        "Preferred Color Scheme": colorScheme || "Blue and White",
        "Style": styleInstruction,
        "formMode": "production"
    }];

    const pptResponse = await axios.post(pptWebhookUrl, n8nPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000 
    });

    let htmlContent = '';
    if (Array.isArray(pptResponse.data) && pptResponse.data.length > 0) {
        const firstItem = pptResponse.data[0];
        htmlContent = firstItem.data || firstItem.html || firstItem.body || '';
        if (!htmlContent && typeof firstItem === 'object') {
            for (const key of Object.keys(firstItem)) {
                if (typeof firstItem[key] === 'string' && firstItem[key].includes('<html')) {
                    htmlContent = firstItem[key]; break;
                }
            }
        }
    } else {
        htmlContent = pptResponse.data?.html || pptResponse.data?.data || (typeof pptResponse.data === 'string' ? pptResponse.data : '');
    }

    if (!htmlContent || htmlContent.length < 100) {
        throw new Error('No valid HTML content received from n8n webhook for PPT.');
    }

    // Step 2: Pass HTML to Mistral AI to generate the script
    let script = [];
    const mistralKey = process.env.MISTRAL_API_KEY;
    
    if (mistralKey) {
        console.log('🧠 Calling Mistral AI to generate narration script from HTML...');
        try {
            const mistralResponse = await axios.post('https://api.mistral.ai/v1/chat/completions', {
                model: 'mistral-large-latest',
                messages: [
                    { 
                        role: 'system', 
                        content: 'You are an expert presentation narrator. Based on exactly what is visible in the provided HTML presentation, you are to generate a narration script for each slide. You MUST output ONLY a pure JSON array containing objects with two keys: "slideNumber" (integer) and "narration" (string). For example: [{"slideNumber":1, "narration":"Hello..."}]. Do not output markdown code blocks or any other text.' 
                    },
                    { 
                        role: 'user', 
                        content: `Create a narration script for this presentation. The teaching style should be: ${styleInstruction}\n\nPresentation HTML:\n${htmlContent.substring(0, 30000)}` 
                    }
                ],
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${mistralKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            });

            const mistralText = mistralResponse.data?.choices?.[0]?.message?.content || '';
            
            // Extract JSON array
            const jsonMatch = mistralText.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
                script = JSON.parse(jsonMatch[0]);
            } else {
                script = JSON.parse(mistralText);
            }
            console.log(`✅ Mistral successfully generated ${script.length} script segments.`);
        } catch (mistralError) {
            console.error('❌ Mistral API error:', mistralError.response?.data || mistralError.message);
            // Fallback to basic extraction if Mistral fails, so the app doesn't break entirely
            script = fallbackScriptGeneration(htmlContent, topic, teachingStyle);
        }
    } else {
        console.log('⚠️ No MISTRAL_API_KEY found, falling back to basic script generation.');
        script = fallbackScriptGeneration(htmlContent, topic, teachingStyle);
    }

    const cacheData = { htmlContent, script, topic };

    if (contentId) {
        await Content.findByIdAndUpdate(contentId, { videoScriptCache: cacheData });
    }

    res.json({
        success: true,
        data: cacheData
    });
});

/**
 * @desc    Generate video from HTML and Script (Async Job)
 * @route   POST /api/video/generate
 * @access  Private
 */
export const generateVideo = asyncHandler(async (req, res) => {
    const { htmlContent, script, topic, contentId } = req.body;

    if (!htmlContent || !script || !Array.isArray(script)) {
        res.status(400);
        throw new Error('htmlContent and script array are required');
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Initialize Job
    jobs.set(jobId, {
        id: jobId,
        status: 'processing',
        progress: 0,
        step: 'Initializing pipeline...',
        listeners: new Set(),
        result: null,
        error: null
    });

    res.status(202).json({
        success: true,
        data: { jobId, message: 'Video generation started in background' }
    });

    // Run actual processing asynchronously so we don't block Express thread
    // In production, offload to BullMQ worker completely.
    processVideoJob(jobId, { htmlContent, script, topic, contentId }).catch(err => {
        console.error(`🔥 Job ${jobId} failed:`, err);
        updateJobAndEmit(jobId, { status: 'error', error: err.message });
    });
});

async function processVideoJob(jobId, { htmlContent, script, topic, contentId }) {
    const sessionDir = path.join(TEMP_DIR, jobId);
    const publicJobDir = path.join(UPLOAD_DIR, jobId); // For permanent files like thumbnails
    
    try {
        await fs.mkdir(sessionDir, { recursive: true });
        await fs.mkdir(publicJobDir, { recursive: true });

        updateJobAndEmit(jobId, { progress: 10, step: 'Capturing slides via headless browser...' });
        
        const browser = await getBrowser();
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
        await page.setContent(htmlContent, { waitUntil: ['networkidle0', 'domcontentloaded'], timeout: 30000 });
        await new Promise(r => setTimeout(r, 1500));

        const slideSelectors = ['.slide', 'section.slide', '[class*="slide"]', 'section'];
        let slides = [];
        for (const selector of slideSelectors) {
            const elements = await page.$$(selector);
            if (elements.length > 0) { slides = elements; break; }
        }
        if (slides.length === 0) slides = [await page.$('body')];
        
        const images = [];
        for (let i = 0; i < slides.length; i++) {
            const slide = slides[i];
            const imagePath = path.join(sessionDir, `slide_${i}.png`);
            await slide.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
            await new Promise(r => setTimeout(r, 300));
            const boundingBox = await slide.boundingBox();
            if (boundingBox) await slide.screenshot({ path: imagePath, type: 'png' });
            else await page.screenshot({ path: imagePath, type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
            images.push(imagePath);
            
            // Immediately copy to public directory for final thumbnails
            const publicThumbPath = path.join(publicJobDir, `slide_${i}.png`);
            await fs.copyFile(imagePath, publicThumbPath);
        }
        await page.close();

        // Generate final thumbnail URLs
        const thumbnails = images.map((_, i) => `/api/uploads/videos/${jobId}/slide_${i}.png`);

        updateJobAndEmit(jobId, { progress: 40, step: 'Generating text-to-speech audio in parallel...' });
        
        // Parallel Audio Generation!
        const audioPromises = script.map(async (slideData, i) => {
            const narrationText = slideData.narration || `Moving on.`;
            const audioPath = path.join(sessionDir, `audio_${i}.mp3`);
            
            // Generate Speech
            await generateSpeech(narrationText, audioPath);
            return audioPath;
        });
        
        const audioFiles = await Promise.all(audioPromises);

        updateJobAndEmit(jobId, { progress: 60, step: 'Encoding video chunks...' });
        
        const listFilePath = path.join(sessionDir, 'input.txt');
        let listContent = '';
        const slideVideos = [];

        // Generate a video segment per slide
        for (let i = 0; i < images.length; i++) {
            const slideVidPath = path.join(sessionDir, `slide_vid_${i}.mp4`);
            
            // Validate inputs
            try {
                await fs.access(images[i]);
                await fs.access(audioFiles[i]);
            } catch (err) {
                console.error(`Missing input files for slide ${i+1}:`, err);
                throw new Error(`Missing audio or image for slide ${i+1}`);
            }

            console.log(`🎬 Encoding chunk ${i+1}/${images.length}: ${slideVidPath}`);
            
            updateJobAndEmit(jobId, { 
                progress: 60 + Math.floor((i / images.length) * 20), 
                step: `Encoding slide ${i+1}/${images.length}...` 
            });

            await new Promise((resolve, reject) => {
                const command = ffmpeg()
                    .input(images[i])
                    .inputOptions(['-loop 1'])
                    .input(audioFiles[i])
                    .outputOptions([
                        '-c:v libx264',
                        '-preset ultrafast', // Use ultrafast for debugging/speed
                        '-tune stillimage',
                        '-c:a aac',
                        '-b:a 128k',
                        '-pix_fmt yuv420p',
                        '-shortest',
                        '-r 25' // Force 25 fps
                    ])
                    // Simplify: Just a static image for now to ensure pipeline works
                    .save(slideVidPath)
                    .on('start', (cmd) => console.log('FFmpeg started:', cmd))
                    .on('end', () => {
                        console.log(`✅ Chunk ${i+1} done.`);
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error(`❌ Chunk ${i+1} failed:`, err.message);
                        reject(err);
                    });
                
                // Set a timeout for individual chunk encoding
                setTimeout(() => reject(new Error(`Timeout encoding slide ${i+1}`)), 60000);
            });
            
            slideVideos.push(slideVidPath);
            listContent += `file '${slideVidPath.replace(/\\/g, '/')}'\n`;
        }

        updateJobAndEmit(jobId, { progress: 85, step: 'Merging chunks into final optimized MP4...' });
        
        await fs.writeFile(listFilePath, listContent);
        const finalVideoName = `${topic.replace(/[^a-zA-Z0-9]/g, '_')}_${jobId}.mp4`;
        const finalVideoPath = path.join(UPLOAD_DIR, finalVideoName);

        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(listFilePath)
                .inputOptions(['-f concat', '-safe 0'])
                // Web optimizations: faststart
                .outputOptions(['-c copy', '-movflags +faststart'])
                .save(finalVideoPath)
                .on('end', resolve)
                .on('error', reject);
        });

        const videoUrl = `/api/uploads/videos/${finalVideoName}`;

        if (contentId) {
            const content = await Content.findById(contentId);
            if (content) {
                content.videoOverviewUrl = videoUrl;
                await content.save();
            }
        }

        try {
            const files = await fs.readdir(sessionDir);
            for (const file of files) await fs.unlink(path.join(sessionDir, file));
            await fs.rmdir(sessionDir);
        } catch (e) {}

        updateJobAndEmit(jobId, { 
            status: 'done', 
            progress: 100, 
            step: 'Complete!',
            result: { videoUrl, topic, thumbnails } 
        });

    } catch (error) {
        throw error;
    }
}
