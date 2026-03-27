import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiVideo, FiLoader, FiZap, FiDownload, FiFileText, FiCheckCircle } from 'react-icons/fi';
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
    
    // UI selections
    const [teachingStyle, setTeachingStyle] = useState('concise');

    // Progress State
    const [jobId, setJobId] = useState(null);
    const [jobStatus, setJobStatus] = useState(''); // 'processing', 'done', 'error'
    const [jobProgress, setJobProgress] = useState(0);
    const [jobStepText, setJobStepText] = useState('');
    
    const [videoUrl, setVideoUrl] = useState(null);
    const [videoTopic, setVideoTopic] = useState('');
    const [videoThumbnails, setVideoThumbnails] = useState([]);
    const videoRef = useRef(null);

    const eventSourceRef = useRef(null);

    useEffect(() => {
        if (contentId) loadContent();
        else setLoading(false);
    }, [contentId]);

    // Clean up EventSource
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

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
            setJobProgress(5);
            setJobStepText('Generating intelligent script...');
            setJobStatus('processing');

            // Step 1: Generate Script
            const scriptRes = await videoAPI.generateScript({
                contentId,
                topic: content.title,
                targetAudience: "Executive summary",
                teachingStyle,
                colorScheme: "Modern Dark Mode"
            });
            
            const { htmlContent, script, topic } = scriptRes.data;
            setVideoTopic(topic);

            // Step 2: Enqueue Video Job
            setJobProgress(10);
            setJobStepText('Starting render engine...');
            const videoRes = await videoAPI.generateVideo({
                contentId,
                htmlContent,
                script,
                topic
            });

            const newJobId = videoRes.data.jobId;
            setJobId(newJobId);
            startPollingStatus(newJobId);

        } catch (e) {
            console.error(e);
            toast.error(e.message || 'Failed to start video generation');
            setGenerating(false);
            setJobStatus('error');
        }
    };

    const startPollingStatus = (activeJobId) => {
        if (eventSourceRef.current) eventSourceRef.current.close();
        
        // Connect to SSE Endpoint
        // We need the raw absolute URL, standard base API URL
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const sseUrl = `${baseURL}/video/status/${activeJobId}`;
        
        const es = new EventSource(sseUrl, { withCredentials: true });
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setJobStatus(data.status);
            setJobProgress(data.progress);
            setJobStepText(data.step);

            if (data.status === 'done') {
                setVideoUrl(data.result.videoUrl);
                setVideoThumbnails(data.result.thumbnails || []);
                toast.success('Video rendered successfully!');
                setGenerating(false);
                es.close();
            } else if (data.status === 'error') {
                toast.error(`Error: ${data.error}`);
                setGenerating(false);
                es.close();
            }
        };

        es.onerror = (err) => {
            console.error("SSE connection error", err);
            // Don't close immediately, SSE auto-reconnects. But if it errors out completely:
        };
    };

    // Derived Stepper State based on progress
    // 0-25: Scripting, 25-50: Graphics, 50-80: Audio & Encode, 80-100: Assembly, 100+: Ready
    const getActiveStep = () => {
        if (jobStatus === 'done' || videoUrl) return 4;
        if (jobProgress < 25) return 0; // Script
        if (jobProgress < 50) return 1; // Visuals
        if (jobProgress < 85) return 2; // Audio & Encoding
        return 3; // Assembly
    };

    const activeStep = getActiveStep();
    const steps = [
        { title: 'Scripting', desc: 'Writing narrative' },
        { title: 'Visuals', desc: 'Capturing slides' },
        { title: 'Audio & Encode', desc: 'Text-to-Speech' },
        { title: 'Assembly', desc: 'Merging MP4' }
    ];

    const handleThumbnailClick = (index) => {
        if (!videoRef.current) return;
        const totalDuration = videoRef.current.duration;
        if (totalDuration) {
            // Rough estimation of timestamp based on equal slide lengths
            const seekTime = (totalDuration / videoThumbnails.length) * index;
            videoRef.current.currentTime = seekTime;
            videoRef.current.play();
        }
    };

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
                    ) : (!videoUrl && !generating) ? (
                        <div className="video-hero">
                            <div className="video-hero-icon">🎬</div>
                            <h2>Create Video Overview</h2>
                            <p>Our AI will distill your document into a dynamic video lecture.</p>
                            
                            {content && (
                                <div className="doc-chip">
                                    <FiFileText /> {content.title}
                                </div>
                            )}

                            <div className="style-selector">
                                <label>Teaching Style:</label>
                                <select value={teachingStyle} onChange={e => setTeachingStyle(e.target.value)}>
                                    <option value="concise">Concise & Direct</option>
                                    <option value="detailed">In-depth & Detailed</option>
                                    <option value="storytelling">Storytelling & Narrative</option>
                                </select>
                            </div>

                            <button className="video-generate-btn" onClick={handleGenerate}>
                                <FiZap /> Generate Video Lecture
                            </button>
                        </div>
                    ) : generating ? (
                        <div className="video-generation-process">
                            <div className="progress-stepper">
                                {steps.map((s, i) => (
                                    <div key={i} className={`step ${i < activeStep ? 'completed' : i === activeStep ? 'active' : ''}`}>
                                        <div className="step-circle">
                                            {i < activeStep ? <FiCheckCircle /> : (i + 1)}
                                        </div>
                                        <div className="step-content">
                                            <h4>{s.title}</h4>
                                            <p>{s.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="generation-status-card">
                                <FiLoader className="spinner" size={48} style={{color: 'var(--color-primary)', marginBottom: '1rem'}} />
                                <h3>Render in Progress</h3>
                                <p className="job-step-text">{jobStepText}</p>
                                
                                <div className="progress-bar-container">
                                    <div className="progress-bar-fill" style={{ width: `${jobProgress}%` }}></div>
                                </div>
                                <span className="progress-percent">{jobProgress}%</span>
                            </div>
                        </div>
                    ) : (
                        <div className="video-player-container">
                            <video 
                                ref={videoRef}
                                className="video-player" 
                                controls 
                                autoPlay 
                                src={fullVideoUrl}
                            >
                                Your browser does not support HTML5 video.
                            </video>
                            
                            {/* Filmstrip */}
                            {videoThumbnails.length > 0 && (
                                <div className="video-filmstrip-container">
                                    <h4>Slide Chapters</h4>
                                    <div className="video-filmstrip">
                                        {videoThumbnails.map((thumb, i) => {
                                            const thumbUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + thumb.replace('/api', '');
                                            return (
                                                <div 
                                                    key={i} 
                                                    className="filmstrip-item"
                                                    onClick={() => handleThumbnailClick(i)}
                                                >
                                                    <img src={thumbUrl} alt={`Slide ${i+1}`} />
                                                    <span className="slide-badge">{i+1}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="video-details">
                                <h3 className="video-topic">{videoTopic.replace(/_/g, ' ')}</h3>
                                <div className="video-actions">
                                    <a href={fullVideoUrl} download className="download-link" target="_blank" rel="noopener noreferrer">
                                        <FiDownload /> Download MP4
                                    </a>
                                    <button className="action-link" onClick={() => { setVideoUrl(null); setJobProgress(0); setVideoThumbnails([]); }}>
                                        Regenerate
                                    </button>
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
