import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiVideo, FiLoader, FiZap, FiDownload, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { contentAPI, videoAPI } from '../services/api';
import Navbar from '../components/common/Navbar';
import './VideoOverview.css';

const VideoOverview = () => {
    const [searchParams] = useSearchParams();
    const contentId = searchParams.get('contentId');
    const notebookId = searchParams.get('notebookId');

    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    
    // We will simulate a 2-step process in the UI for script & video assembly
    const [progressStep, setProgressStep] = useState(''); 
    const [videoUrl, setVideoUrl] = useState(null);
    const [videoTopic, setVideoTopic] = useState('');

    useEffect(() => {
        if (contentId) loadContent();
        else setLoading(false);
    }, [contentId]);

    const loadContent = async () => {
        try {
            setLoading(true);
            const r = await contentAPI.getOne(contentId);
            setContent(r.data);
            if (r.data.videoOverviewUrl) {
                setVideoUrl(r.data.videoOverviewUrl);
                setVideoTopic(r.data.title);
            }
        } catch {
            toast.error('Failed to load content');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!contentId || !content) return toast.error('No content selected');
        
        try {
            setGenerating(true);
            
            // Step 1: Generate Script & HTML via PPT n8n service
            setProgressStep('Generating presentation and script...');
            const scriptRes = await videoAPI.generateScript({
                contentId,
                topic: content.title,
                targetAudience: "Executive summary",
                keyPoints: content.summary?.executive || "Key takeaways from document.",
                colorScheme: "Modern Dark Mode" // Just a default
            });
            
            const { htmlContent, script, topic } = scriptRes.data;
            setVideoTopic(topic);

            // Step 2: Render slide screenshots and embed audio
            setProgressStep('Recording voiceover and assembling video (this takes a minute)...');
            const videoRes = await videoAPI.generateVideo({
                contentId,
                htmlContent,
                script,
                topic
            });

            setVideoUrl(videoRes.data.videoUrl);
            toast.success('Video Overview generated successfully!');
        } catch (e) {
            console.error(e);
            toast.error(e.message || 'Failed to generate video');
        } finally {
            setGenerating(false);
            setProgressStep('');
        }
    };

    // Full backend URL for video src
    const fullVideoUrl = videoUrl ? (import.meta.env.VITE_API_URL || 'http://localhost:5000') + videoUrl.replace('/api', '') : '';

    return (
        <div className="video-overview-page">
            <Navbar />
            <main className="video-main">
                <div className="video-container container">
                    {/* Header */}
                    <div className="video-header">
                        <Link to={notebookId ? `/notebook/${notebookId}` : '/dashboard'} className="back-link">
                            <FiArrowLeft /> Back
                        </Link>
                        <h1 className="video-title">
                            <FiVideo className="title-icon" /> Video Overview
                        </h1>
                        <p className="video-subtitle">
                            Watch an AI-generated animated presentation with voice narration summarizing your document.
                        </p>
                    </div>

                    {loading ? (
                        <div className="video-center-state">
                            <FiLoader className="spinner" size={40} />
                            <p>Loading…</p>
                        </div>
                    ) : !contentId ? (
                        <div className="video-center-state">
                            <FiVideo size={48} className="empty-icon" />
                            <h3>No Document Selected</h3>
                            <p>Go back to your notebook and select 'Video Overview' for a document.</p>
                        </div>
                    ) : !videoUrl && !generating ? (
                        <div className="video-hero">
                            <div className="video-hero-icon">🎬</div>
                            <h2>Create Video Overview</h2>
                            <p>Our AI will distill the key points of your document into a <strong>dynamic HTML presentation</strong> and narrate the slides using <strong>Text-to-Speech</strong>.</p>
                            
                            {content && (
                                <div className="doc-chip">
                                    <FiFileText /> {content.title}
                                </div>
                            )}

                            <button className="video-generate-btn" onClick={handleGenerate}>
                                <FiZap /> Generate Video
                            </button>
                        </div>
                    ) : generating ? (
                        <div className="video-center-state">
                            <FiLoader className="spinner" size={48} style={{color: 'var(--color-primary)', marginBottom: '1rem'}} />
                            <h3>Creating Video...</h3>
                            <p>{progressStep}</p>
                            <p style={{fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem'}}>
                                This involves opening a headless browser, taking screenshots, generating TTS audio, and compositing with FFmpeg.
                            </p>
                        </div>
                    ) : (
                        <div className="video-player-container">
                            <video 
                                className="video-player" 
                                controls 
                                autoPlay 
                                src={fullVideoUrl}
                            >
                                Your browser does not support HTML5 video.
                            </video>
                            <div className="video-details">
                                <h3 className="video-topic">{videoTopic.replace(/_/g, ' ')}</h3>
                                <div className="video-actions">
                                    <a href={fullVideoUrl} download className="download-link" target="_blank" rel="noopener noreferrer">
                                        <FiDownload /> Download MP4
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default VideoOverview;
