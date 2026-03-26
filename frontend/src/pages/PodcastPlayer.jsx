import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    FiArrowLeft,
    FiMic,
    FiLoader,
    FiZap,
    FiPlay,
    FiPause,
    FiSquare,
    FiUser,
    FiAlertCircle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { contentAPI } from '../services/api';
import { usePodcastTTS } from '../hooks/usePodcastTTS';
import Navbar from '../components/common/Navbar';
import './PodcastPlayer.css';

const SPEAKERS = {
    Alex: { color: '#8b5cf6', avatar: '🎤' },
    Sam:  { color: '#3b82f6', avatar: '🎧' },
};

const PodcastPlayer = () => {
    const [searchParams] = useSearchParams();
    const contentId  = searchParams.get('contentId');
    const notebookId = searchParams.get('notebookId');

    const [content,    setContent]    = useState(null);
    const [podcast,    setPodcast]    = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [generating, setGenerating] = useState(false);
    const [activeLine, setActiveLine] = useState(-1);
    const [isPlaying,  setIsPlaying]  = useState(false);

    const playingRef = useRef(false);  // ref so async loops can read current value
    const activeRef  = useRef(-1);

    const { ttsReady, ttsLoading, ttsError, initTTS, speak, stopAudio, resetStop } = usePodcastTTS();

    // ─── Load content ────────────────────────────────────────────────────────
    useEffect(() => {
        if (contentId) loadContent();
        else setLoading(false);
    }, [contentId]);

    const loadContent = async () => {
        try {
            setLoading(true);
            const r = await contentAPI.getOne(contentId);
            setContent(r.data);
        } catch {
            toast.error('Failed to load content');
        } finally {
            setLoading(false);
        }
    };

    // ─── Generate podcast script ──────────────────────────────────────────────
    const handleGenerate = async () => {
        if (!contentId) return toast.error('No content selected');
        try {
            setGenerating(true);
            const r = await contentAPI.generatePodcast(contentId);
            setPodcast(r.data.podcast);
            setActiveLine(-1);
            setIsPlaying(false);
            playingRef.current = false;
            toast.success('Podcast script ready!');
            // Pre-warm TTS engine
            initTTS();
        } catch (e) {
            toast.error(e.message || 'Failed to generate podcast');
        } finally {
            setGenerating(false);
        }
    };

    // ─── Play / Pause ─────────────────────────────────────────────────────────
    const handlePlay = useCallback(async () => {
        if (!podcast?.script?.length || !ttsReady) return;

        if (isPlaying) {
            // Pause
            playingRef.current = false;
            setIsPlaying(false);
            stopAudio();
            return;
        }

        // Start / Resume from activeLine (or beginning)
        const startIdx = activeRef.current < 0 || activeRef.current >= podcast.script.length - 1
            ? 0
            : activeRef.current;

        resetStop();              // clear the stop flag in the hook
        setIsPlaying(true);
        playingRef.current = true;

        for (let i = startIdx; i < podcast.script.length; i++) {
            if (!playingRef.current) break;

            activeRef.current = i;
            setActiveLine(i);

            const { speaker, text } = podcast.script[i];
            try {
                await speak(text, speaker);
            } catch (e) {
                // AbortError is expected on stop — ignore it. Log anything else.
                if (e?.name !== 'AbortError') console.warn('TTS error on line', i, e);
                break;  // stop the loop on any error
            }

            if (!playingRef.current) break;
        }

        playingRef.current = false;
        setIsPlaying(false);
    }, [isPlaying, podcast, ttsReady, speak, stopAudio, resetStop]);

    const handleStop = () => {
        playingRef.current = false;
        stopAudio();
        setIsPlaying(false);
        setActiveLine(-1);
        activeRef.current = -1;
    };

    const handleLineClick = (idx) => {
        handleStop();
        setActiveLine(idx);
        activeRef.current = idx;
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="podcast-page">
            <Navbar />
            <main className="podcast-main">
                <div className="podcast-container container">
                    <div className="podcast-header">
                        <Link to={notebookId ? `/notebook/${notebookId}` : '/dashboard'} className="back-link">
                            <FiArrowLeft /> Back
                        </Link>
                        <h1 className="podcast-title">
                            <FiMic className="title-icon" />
                            AI Podcast
                        </h1>
                        <p className="podcast-subtitle">
                            {podcast ? podcast.title : content ? `Generate for: ${content.title}` : 'Generate a NotebookLM-style audio overview'}
                        </p>
                    </div>

                    {loading ? (
                        <div className="podcast-center-state">
                            <FiLoader className="spinner" size={40} />
                            <p>Loading…</p>
                        </div>
                    ) : !contentId ? (
                        <div className="podcast-center-state">
                            <FiMic size={48} className="empty-icon" />
                            <h3>No Document Selected</h3>
                            <p>Go back to your notebook and click "Audio Overview" on a source.</p>
                        </div>
                    ) : !podcast ? (
                        /* ── Generate view ── */
                        <div className="podcast-generate-view">
                            <div className="podcast-hero">
                                <div className="podcast-hero-icon">🎙️</div>
                                <h2>Audio Overview</h2>
                                <p>AI generates a natural two-host conversation about your document — with real voice synthesis.</p>
                                {content && (
                                    <div className="doc-chip">
                                        <FiUser /> {content.title} · {content.wordCount} words
                                    </div>
                                )}
                                <button className="podcast-generate-btn" onClick={handleGenerate} disabled={generating}>
                                    {generating ? <><FiLoader className="spinner" /> Generating Script…</> : <><FiZap /> Generate Podcast</>}
                                </button>
                            </div>
                            <div className="podcast-hosts">
                                {Object.entries(SPEAKERS).map(([name, info]) => (
                                    <div key={name} className="host-card" style={{ '--host-color': info.color }}>
                                        <div className="host-avatar">{info.avatar}</div>
                                        <div className="host-name">{name}</div>
                                        <div className="host-role">{name === 'Alex' ? 'Curious Host' : 'Expert Guest'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* ── Player view ── */
                        <div className="podcast-player-view">
                            {/* TTS status bar */}
                            <div className={`tts-status ${ttsReady ? 'ready' : ttsError ? 'error' : 'loading'}`}>
                                {ttsLoading && <><FiLoader className="spinner" /> Loading Audio Engine…</>}
                                {ttsReady   && <>✅ Audio Engine Ready</>}
                                {ttsError   && <><FiAlertCircle /> TTS Error: {ttsError}</>}
                            </div>

                            {/* Player bar */}
                            <div className="podcast-player-bar">
                                <div className="player-info">
                                    <div className="player-title">{podcast.title}</div>
                                    <div className="player-meta">{podcast.duration_estimate} · {podcast.script?.length} exchanges</div>
                                </div>

                                <button
                                    className="play-pause-btn"
                                    onClick={handlePlay}
                                    disabled={!ttsReady || ttsLoading}
                                    title={ttsReady ? (isPlaying ? 'Pause' : 'Play') : 'Waiting for audio engine…'}
                                >
                                    {isPlaying ? <FiPause size={24} /> : <FiPlay size={24} />}
                                </button>

                                {isPlaying && (
                                    <button className="stop-btn" onClick={handleStop} title="Stop">
                                        <FiSquare size={18} />
                                    </button>
                                )}

                                <button className="podcast-regenerate-btn" onClick={handleGenerate} disabled={generating || isPlaying}>
                                    {generating ? <FiLoader className="spinner" /> : <FiZap />}
                                    Regenerate
                                </button>
                            </div>

                            {podcast.description && (
                                <p className="podcast-description">{podcast.description}</p>
                            )}

                            {/* Script */}
                            <div className="podcast-script">
                                {podcast.script?.map((line, idx) => {
                                    const info = SPEAKERS[line.speaker] || { color: '#a0a0a0', avatar: '💬' };
                                    return (
                                        <motion.div
                                            key={idx}
                                            className={`script-line ${idx === activeLine ? 'active' : ''}`}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.015 }}
                                            onClick={() => handleLineClick(idx)}
                                            style={{ '--speaker-color': info.color }}
                                        >
                                            <div className="speaker-badge">
                                                <span className="speaker-emoji">{info.avatar}</span>
                                                <span className="speaker-name">{line.speaker}</span>
                                            </div>
                                            <p className="line-text">{line.text}</p>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default PodcastPlayer;
