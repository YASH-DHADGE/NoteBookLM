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

// Ensure ffmpeg path is set
ffmpeg.setFfmpegPath(ffmpegStatic);

// Singleton browser instance
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

// Ensure directories exist
(async () => {
    try { await fs.mkdir(TEMP_DIR, { recursive: true }); } catch (e) {}
    try { await fs.mkdir(UPLOAD_DIR, { recursive: true }); } catch (e) {}
})();

/**
 * Helper to generate speech from text using gtts
 */
const generateSpeech = (text, outputPath) => {
    return new Promise((resolve, reject) => {
        const gtts = new gTTS(text, 'en');
        gtts.save(outputPath, function (err, result) {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

/**
 * Extracts pure text from Gemini/n8n responses
 */
const extractAiText = (responseData) => {
    if (!responseData) return '';
    let data = responseData;
    if (Array.isArray(data) && data.length > 0) data = data[0];
    if (data?.candidates?.[0]?.content?.parts?.[0]?.text) return data.candidates[0].content.parts[0].text;
    if (data?.content?.parts?.[0]?.text) return data.content.parts[0].text;
    if (data?.text && typeof data.text === 'string') return data.text;
    if (data?.output && typeof data.output === 'string') return data.output;
    if (data?.response && typeof data.response === 'string') return data.response;
    if (typeof data === 'string') return data;
    try { return typeof data === 'object' ? JSON.stringify(data) : String(data); } catch { return ''; }
};

/**
 * @desc    Generate script for video based on content
 * @route   POST /api/video/generate-script
 * @access  Private
 */
export const generateVideoScript = asyncHandler(async (req, res) => {
    const { contentId, topic, targetAudience, keyPoints, colorScheme } = req.body;
    
    // Check if content exists
    let extractedText = '';
    if (contentId) {
        const content = await Content.findOne({ _id: contentId, user: req.user._id });
        if (!content) {
            res.status(404);
            throw new Error('Content not found');
        }
        extractedText = content.summary?.detailedAnalysis || content.extractedText || '';
    }

    console.log(`🎬 Generating video script for topic: "${topic}"`);

    // We can use the PPT generator webhook to get the HTML structure first, then generate a script from the slides.
    // Or we can rely on a dedicated n8n webhook or just the Mistral API directly if no webhook exists.
    // We'll generate an HTML PPT presentation just like PPT generation.
    
    const pptWebhookUrl = process.env.N8N_PPT_WEBHOOK_URL;
    if (!pptWebhookUrl) throw new Error('N8N_PPT_WEBHOOK_URL not configured');

    const n8nPayload = [{
        "Topic": topic,
        "Target Audience": targetAudience || "General Audience",
        "Key Points to Cover": keyPoints || extractedText.substring(0, 1000),
        "Preferred Color Scheme": colorScheme || "Blue and White",
        "formMode": "production"
    }];

    const pptResponse = await axios.post(pptWebhookUrl, n8nPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000 
    });

    let htmlContent = '';
    // Same extraction logic as pptController.js
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

    // Now, we could call another LLM to write a script for these slides,
    // but a quicker approach for the video is to let the frontend receive the HTML 
    // and let the user trigger the video assembly, or we do it all in one go.
    // Let's generate a fast script using the same n8n podcast webhook or returning the HTML to the frontend.
    
    // For simplicity, we will analyze the HTML to count slides and generate a dummy script
    // Note: In production you would hit a Gemini/OpenAI node to "Write a narration script for this HTML presentation".
    
    // Basic slide extraction
    const slideMatches = htmlContent.match(/<section[^>]*>[\s\S]*?<\/section>|<div[^>]*class="[^"]*slide[^"]*"[^>]*>[\s\S]*?<\/div>/gi) || [];
    const slideCount = Math.max(slideMatches.length, 3);
    
    const script = [];
    for (let i = 0; i < slideCount; i++) {
        script.push({
            slideNumber: i + 1,
            narration: `Welcome to slide number ${i+1}. The topic we are discussing is ${topic}. As you can see on the screen, there are important key points to remember.`
        });
    }

    res.json({
        success: true,
        data: {
            htmlContent,
            script,
            topic
        }
    });
});

/**
 * @desc    Generate video from HTML and Script
 * @route   POST /api/video/generate
 * @access  Private
 */
export const generateVideo = asyncHandler(async (req, res) => {
    const { htmlContent, script, topic, contentId } = req.body;

    if (!htmlContent || !script || !Array.isArray(script)) {
        res.status(400);
        throw new Error('htmlContent and script array are required');
    }

    console.log(`🎥 Starting video generation for topic: "${topic}"`);
    const sessionId = Date.now();
    const sessionDir = path.join(TEMP_DIR, `video_${sessionId}`);
    
    try {
        await fs.mkdir(sessionDir, { recursive: true });

        // 1. Capture screenshots using Puppeteer
        console.log('🎨 Launching Puppeteer to capture slides...');
        const browser = await getBrowser();
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
        await page.setContent(htmlContent, { waitUntil: ['networkidle0', 'domcontentloaded'], timeout: 30000 });
        await new Promise(r => setTimeout(r, 1500)); // wait for fonts

        const slideSelectors = ['.slide', 'section.slide', '[class*="slide"]', 'section'];
        let slides = [];
        for (const selector of slideSelectors) {
            const elements = await page.$$(selector);
            if (elements.length > 0) { slides = elements; break; }
        }
        if (slides.length === 0) slides = [await page.$('body')];
        
        console.log(`📸 Found ${slides.length} slides. Capturing screenshots...`);
        
        const images = [];
        const audioFiles = [];
        const listFilePath = path.join(sessionDir, 'input.txt');
        let listContent = '';

        for (let i = 0; i < slides.length; i++) {
            const slide = slides[i];
            const imagePath = path.join(sessionDir, `slide_${i}.png`);
            
            await slide.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
            await new Promise(r => setTimeout(r, 300));
            
            const boundingBox = await slide.boundingBox();
            if (boundingBox) {
                await slide.screenshot({ path: imagePath, type: 'png' });
            } else {
                await page.screenshot({ path: imagePath, type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
            }
            images.push(imagePath);
            
            // 2. Generate audio for this slide
            const narrationText = script[i]?.narration || `And moving on to slide ${i+1}.`;
            const audioPath = path.join(sessionDir, `audio_${i}.mp3`);
            console.log(`🎙️ Generating TTS for slide ${i+1}...`);
            await generateSpeech(narrationText, audioPath);
            audioFiles.push(audioPath);
            
            // Get duration of the audio to know how long to show the slide
            // We'll use a fluent-ffmpeg ffprobe wrapper to get duration later
        }

        await page.close();

        // 3. Assemble with FFmpeg using a complex filter or concatenation
        // Since different audio lengths mean we need a slide image to hold for the duration of the audio,
        // we will create an input list for ffmpeg 'concat' demuxer or construct individual videos and merge
        
        console.log(`🎬 Assembling video from ${images.length} images and audio files...`);
        const finalVideoName = `${topic.replace(/[^a-zA-Z0-9]/g, '_')}_${sessionId}.mp4`;
        const finalVideoPath = path.join(UPLOAD_DIR, finalVideoName);

        // Quickest way: generate a short video per slide, then concat
        const slideVideos = [];
        for (let i = 0; i < images.length; i++) {
            const slideVidPath = path.join(sessionDir, `slide_vid_${i}.mp4`);
            console.log(`🎞️ Creating segment ${i+1}...`);
            await new Promise((resolve, reject) => {
                ffmpeg()
                    .input(images[i])
                    .loop() // Loop the single image
                    .input(audioFiles[i])
                    .outputOptions([
                        '-c:v libx264',
                        '-tune stillimage',
                        '-c:a aac',
                        '-b:a 128k',
                        '-pix_fmt yuv420p',
                        '-shortest' // Stop encoding when the shortest input (audio) ends
                    ])
                    .save(slideVidPath)
                    .on('end', resolve)
                    .on('error', reject);
            });
            slideVideos.push(slideVidPath);
            listContent += `file '${slideVidPath.replace(/\\/g, '/')}'\n`;
        }

        // Concat the segments
        await fs.writeFile(listFilePath, listContent);
        console.log('🔗 Concatenating segments into final video...');
        
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(listFilePath)
                .inputOptions(['-f concat', '-safe 0'])
                .outputOptions('-c copy')
                .save(finalVideoPath)
                .on('end', resolve)
                .on('error', reject);
        });

        console.log(`✅ Video generated successfully: ${finalVideoPath}`);

        // Update content model if linked
        if (contentId) {
            const content = await Content.findById(contentId);
            if (content) {
                content.videoOverviewUrl = `/uploads/videos/${finalVideoName}`;
                await content.save();
            }
        }

        // Cleanup
        try {
            const files = await fs.readdir(sessionDir);
            for (const file of files) {
                await fs.unlink(path.join(sessionDir, file));
            }
            await fs.rmdir(sessionDir);
        } catch (cleanupErr) {
            console.error('Cleanup error:', cleanupErr);
        }

        res.json({
            success: true,
            data: {
                videoUrl: `/api/uploads/videos/${finalVideoName}`, // Add an endpoint or static hosting for this
                topic,
                script
            }
        });
        
    } catch (error) {
        console.error('❌ Video generation error:', error.message);
        res.status(500);
        throw new Error(`Failed to generate video: ${error.message}`);
    }
});
