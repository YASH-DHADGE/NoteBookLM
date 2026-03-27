/**
 * PodcastPlayer.jsx
 *
 * Main podcast page — generates a two-host script via n8n / Gemini and
 * plays it back with the browser's built-in Web Speech API.
 *
 * Accessibility: ARIA live regions, aria-label, aria-pressed,
 * aria-current, role="region", keyboard-navigable transcript lines.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    FiArrowLeft, FiMic, FiLoader, FiZap,
    FiPlay, FiPause, FiSquare, FiUser,
    FiVolume2, FiSliders, FiSearch,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { contentAPI } from '../services/api';
import Navbar from '../components/common/Navbar';
import './PodcastPlayer.css';

// ── Speaker metadata ─────────────────────────────────────────────────────────
const SPEAKERS = {
    Alex: { color: '#a78bfa', avatar: '🎤', role: 'Curious Host' },
    Sam:  { color: '#60a5fa', avatar: '🎧', role: 'Expert Guest' },
};

// ── localStorage persistence keys ────────────────────────────────────────────
const LS_VOL  = 'podcast_vol';
const LS_RATE = 'podcast_rate';

// ─── Component ───────────────────────────────────────────────────────────────
const PodcastPlayer = () => {
    const [searchParams] = useSearchParams();
    const contentId  = searchParams.get('contentId');
    const notebookId = searchParams.get('notebookId');

    // ── Data state
    const [content,    setContent]    = useState(null);
    const [podcast,    setPodcast]    = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [generating, setGenerating] = useState(false);

    // ── Playback state
    const [status,    setStatus]    = useState('stopped'); // 'stopped'|'playing'|'paused'
    const [activeIdx, setActiveIdx] = useState(-1);
    const [volume,    setVolume]    = useState(() => parseFloat(localStorage.getItem(LS_VOL)  ?? '1'));
    const [rate,      setRate]      = useState(() => parseFloat(localStorage.getItem(LS_RATE) ?? '1'));
    const [ttsReady,  setTtsReady]  = useState(false);
    const [ttsError,  setTtsError]  = useState('');

    // ── Search state
    const [query,       setQuery]       = useState('');
    const [matchIdxs,   setMatchIdxs]   = useState([]);
    const [matchCursor, setMatchCursor] = useState(0);

    // ── Refs
    const synth      = useRef(null);
    const stopFlag   = useRef(false);
    const pauseFlag  = useRef(false);
    const resumeIdx  = useRef(0);
    const lineRefs   = useRef([]);
    const statusRef  = useRef('stopped'); // mirror of status for closures

    // ── ARIA live announcement
    const [liveMsg, setLiveMsg] = useState('');
    const liveTimer = useRef(null);
    const announce = useCallback((msg) => {
        setLiveMsg('');
        clearTimeout(liveTimer.current);
        liveTimer.current = setTimeout(() => setLiveMsg(msg), 60);
    }, []);

    // ── Persist preferences
    useEffect(() => { localStorage.setItem(LS_VOL,  volume); }, [volume]);
    useEffect(() => { localStorage.setItem(LS_RATE, rate);   }, [rate]);

    // ── Init SpeechSynthesis
    useEffect(() => {
        if (!window.speechSynthesis) {
            setTtsError('Web Speech API is not supported in this browser.');
            return;
        }
        synth.current = window.speechSynthesis;
        const warmUp = () => setTtsReady(true);
        const voices = synth.current.getVoices();
        if (voices.length) { warmUp(); }
        else { synth.current.addEventListener('voiceschanged', warmUp, { once: true }); }
        return () => { synth.current?.cancel(); clearTimeout(liveTimer.current); };
    }, []);

    // ── Load content
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

    // ── Scroll active line into view
    useEffect(() => {
        if (activeIdx >= 0) {
            lineRefs.current[activeIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [activeIdx]);

    // ─── Generate script ──────────────────────────────────────────────────────
    const handleGenerate = async () => {
        if (!contentId) return toast.error('No content selected');
        handleStop(); // cancel any current playback
        try {
            setGenerating(true);
            const r = await contentAPI.generatePodcast(contentId);
            setPodcast(r.data.podcast);
            resumeIdx.current = 0;
            toast.success('Podcast script ready!');
        } catch (e) {
            toast.error(e.message || 'Failed to generate podcast');
        } finally {
            setGenerating(false);
        }
    };

    // ─── Core speech loop ─────────────────────────────────────────────────────
    const speakOne = useCallback((idx, script) => {
        return new Promise((resolve) => {
            if (stopFlag.current) return resolve();
            const { speaker, text } = script[idx];
            const utter = new SpeechSynthesisUtterance(text);
            utter.volume = volume;
            utter.rate   = rate;

            const voices = synth.current.getVoices();
            const voice = speaker === 'Alex'
                ? voices.find(v => /male|david|mark|george/i.test(v.name) && v.lang.startsWith('en'))
                : voices.find(v => /female|zira|samantha|victoria/i.test(v.name) && v.lang.startsWith('en'))
                  || voices.find(v => v.lang.startsWith('en'));
            if (voice) utter.voice = voice;

            utter.onend   = () => resolve();
            utter.onerror = (e) => { if (e.error !== 'interrupted' && e.error !== 'canceled') console.warn('TTS:', e.error); resolve(); };
            synth.current.speak(utter);
        });
    }, [volume, rate]);

    const runPlayback = useCallback(async (from, script) => {
        for (let i = from; i < script.length; i++) {
            if (stopFlag.current) break;
            while (pauseFlag.current && !stopFlag.current) {
                await new Promise(r => setTimeout(r, 80));
            }
            if (stopFlag.current) break;

            resumeIdx.current = i;
            setActiveIdx(i);
            announce(`${script[i].speaker}: ${script[i].text.substring(0, 60)}…`);
            await speakOne(i, script);
        }

        if (!pauseFlag.current) {
            stopFlag.current = false;
            setStatus('stopped');
            statusRef.current = 'stopped';
            setActiveIdx(-1);
            resumeIdx.current = 0;
            announce('Playback finished');
        }
    }, [speakOne, announce]);

    // ─── Controls ─────────────────────────────────────────────────────────────
    const handlePlay = useCallback(() => {
        if (!ttsReady || !podcast?.script?.length) return;

        if (statusRef.current === 'playing') return;

        if (statusRef.current === 'paused') {
            synth.current.resume();
            pauseFlag.current = false;
            setStatus('playing');
            statusRef.current = 'playing';
            announce('Resumed');
            return;
        }

        synth.current.cancel();
        stopFlag.current  = false;
        pauseFlag.current = false;
        setStatus('playing');
        statusRef.current = 'playing';
        announce('Playback started');
        runPlayback(resumeIdx.current, podcast.script);
    }, [ttsReady, podcast, runPlayback, announce]);

    const handlePause = useCallback(() => {
        if (statusRef.current !== 'playing') return;
        pauseFlag.current = true;
        synth.current.pause();
        setStatus('paused');
        statusRef.current = 'paused';
        announce('Paused');
    }, [announce]);

    const handleStop = useCallback(() => {
        stopFlag.current  = true;
        pauseFlag.current = false;
        synth.current?.cancel();
        setStatus('stopped');
        statusRef.current = 'stopped';
        setActiveIdx(-1);
        resumeIdx.current = 0;
        announce('Stopped');
    }, [announce]);

    const jumpToLine = useCallback((idx) => {
        synth.current?.cancel();
        stopFlag.current  = false;
        pauseFlag.current = false;
        resumeIdx.current = idx;
        setActiveIdx(idx);

        if (statusRef.current === 'playing' && podcast?.script) {
            announce(`Jumped to line ${idx + 1}`);
            runPlayback(idx, podcast.script);
        } else {
            setStatus('stopped');
            statusRef.current = 'stopped';
            announce(`Selected line ${idx + 1} — press Play to start here`);
        }
    }, [podcast, runPlayback, announce]);

    // ─── Search ───────────────────────────────────────────────────────────────
    const handleSearch = (e) => {
        const q = e.target.value;
        setQuery(q);
        if (!q.trim()) { setMatchIdxs([]); setMatchCursor(0); return; }
        const lower = q.toLowerCase();
        const hits = (podcast?.script || [])
            .map((t, i) => (t.text.toLowerCase().includes(lower) || t.speaker.toLowerCase().includes(lower) ? i : -1))
            .filter(i => i !== -1);
        setMatchIdxs(hits);
        setMatchCursor(0);
        if (hits.length) {
            lineRefs.current[hits[0]]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            announce(`${hits.length} result${hits.length !== 1 ? 's' : ''} found`);
        } else { announce('No results'); }
    };

    const goMatch = (dir) => {
        if (!matchIdxs.length) return;
        const next = (matchCursor + dir + matchIdxs.length) % matchIdxs.length;
        setMatchCursor(next);
        lineRefs.current[matchIdxs[next]]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    // ─── Derived ──────────────────────────────────────────────────────────────
    const isPlaying = status === 'playing';
    const isPaused  = status === 'paused';
    const isStopped = status === 'stopped';

    const statusLabel = isPlaying ? '▶ Playing' : isPaused ? '⏸ Paused' : '⏹ Stopped';
    const statusClass = isPlaying ? 'status-playing' : isPaused ? 'status-paused' : 'status-stopped';

    const canPlay  = ttsReady && !!podcast?.script?.length && !isPlaying;
    const canPause = ttsReady && isPlaying;
    const canStop  = ttsReady && !isStopped;

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="podcast-page">
            <Navbar />

            {/* ARIA live region — visually hidden, speaks status to screen readers */}
            <div role="status" aria-live="polite" aria-atomic="true" className="podcast-live-region">
                {liveMsg}
            </div>

            <main className="podcast-main" aria-label="AI Podcast Player">
                <div className="podcast-container container">

                    {/* ── Header ── */}
                    <div className="podcast-header">
                        <Link to={notebookId ? `/notebook/${notebookId}` : '/dashboard'} className="back-link" aria-label="Go back">
                            <FiArrowLeft aria-hidden="true" /> Back
                        </Link>
                        <h1 className="podcast-title">
                            <FiMic className="title-icon" aria-hidden="true" />
                            AI Podcast
                        </h1>
                        <p className="podcast-subtitle">
                            {podcast ? podcast.title : content ? `Generate for: ${content.title}` : 'Generate a NotebookLM-style audio overview'}
                        </p>
                    </div>

                    {/* ── Loading ── */}
                    {loading ? (
                        <div className="podcast-center-state">
                            <FiLoader className="spinner" size={40} aria-label="Loading" />
                            <p>Loading…</p>
                        </div>

                    ) : !contentId ? (
                        <div className="podcast-center-state">
                            <FiMic size={48} className="empty-icon" aria-hidden="true" />
                            <h3>No Document Selected</h3>
                            <p>Go back to your notebook and click "Audio Overview" on a source.</p>
                        </div>

                    ) : !podcast ? (
                        /* ── Generate view ── */
                        <div className="podcast-generate-view">
                            <div className="podcast-hero">
                                <div className="podcast-hero-icon" aria-hidden="true">🎙️</div>
                                <h2>Audio Overview</h2>
                                <p>AI generates a natural two-host conversation about your document.</p>
                                {content && (
                                    <div className="doc-chip">
                                        <FiUser aria-hidden="true" /> {content.title} · {content.wordCount} words
                                    </div>
                                )}
                                <button
                                    className="podcast-generate-btn"
                                    onClick={handleGenerate}
                                    disabled={generating}
                                    aria-label={generating ? 'Generating podcast script, please wait' : 'Generate podcast script'}
                                >
                                    {generating
                                        ? <><FiLoader className="spinner" aria-hidden="true" /> Generating Script…</>
                                        : <><FiZap aria-hidden="true" /> Generate Podcast</>}
                                </button>

                                {ttsError && (
                                    <p className="podcast-tts-warning" role="alert">
                                        ⚠ {ttsError}
                                    </p>
                                )}
                            </div>

                            <div className="podcast-hosts" aria-label="Podcast hosts">
                                {Object.entries(SPEAKERS).map(([name, info]) => (
                                    <div key={name} className="host-card" style={{ '--host-color': info.color }}>
                                        <div className="host-avatar" aria-hidden="true">{info.avatar}</div>
                                        <div className="host-name">{name}</div>
                                        <div className="host-role">{info.role}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    ) : (
                        /* ── Player view ── */
                        <div className="podcast-player-view">

                            {/* Player bar */}
                            <section
                                role="region"
                                aria-label="Playback controls"
                                className="podcast-player-bar"
                            >
                                <div className="player-info">
                                    <div className="player-title">{podcast.title}</div>
                                    <div className="player-meta">
                                        {podcast.duration_estimate} · {podcast.script?.length} exchanges
                                    </div>
                                </div>

                                {/* Status badge */}
                                <span className={`player-status-badge ${statusClass}`} aria-label={`Status: ${statusLabel}`}>
                                    {statusLabel}
                                </span>

                                {/* Transport controls */}
                                <div className="player-transport" role="group" aria-label="Transport">
                                    <button
                                        className={`transport-btn btn-play ${isPlaying ? 'active' : ''}`}
                                        onClick={handlePlay}
                                        disabled={!canPlay}
                                        aria-disabled={!canPlay}
                                        aria-label={isPaused ? 'Resume playback' : 'Play'}
                                        aria-pressed={isPlaying}
                                    >
                                        <FiPlay aria-hidden="true" />
                                    </button>
                                    <button
                                        className={`transport-btn btn-pause ${isPaused ? 'active' : ''}`}
                                        onClick={handlePause}
                                        disabled={!canPause}
                                        aria-disabled={!canPause}
                                        aria-label="Pause"
                                        aria-pressed={isPaused}
                                    >
                                        <FiPause aria-hidden="true" />
                                    </button>
                                    <button
                                        className="transport-btn btn-stop"
                                        onClick={handleStop}
                                        disabled={!canStop}
                                        aria-disabled={!canStop}
                                        aria-label="Stop and reset"
                                    >
                                        <FiSquare aria-hidden="true" />
                                    </button>
                                </div>

                                {/* Volume */}
                                <div className="player-vol-wrap" title="Volume">
                                    <FiVolume2 size={14} aria-hidden="true" />
                                    <input
                                        type="range" min="0" max="1" step="0.05"
                                        value={volume}
                                        onChange={e => setVolume(parseFloat(e.target.value))}
                                        className="player-slider"
                                        aria-label={`Volume: ${Math.round(volume * 100)}%`}
                                        aria-valuemin={0} aria-valuemax={100}
                                        aria-valuenow={Math.round(volume * 100)}
                                    />
                                </div>

                                {/* Speed */}
                                <div className="player-rate-wrap" title="Playback speed">
                                    <FiSliders size={13} aria-hidden="true" />
                                    <select
                                        value={rate}
                                        onChange={e => setRate(parseFloat(e.target.value))}
                                        className="player-rate-select"
                                        aria-label="Playback speed"
                                    >
                                        {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(r => (
                                            <option key={r} value={r}>{r}×</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Regenerate */}
                                <button
                                    className="podcast-regenerate-btn"
                                    onClick={handleGenerate}
                                    disabled={generating || isPlaying}
                                    aria-label="Regenerate podcast script"
                                >
                                    {generating ? <FiLoader className="spinner" aria-hidden="true" /> : <FiZap aria-hidden="true" />}
                                    Regenerate
                                </button>
                            </section>

                            {/* Progress info */}
                            <p className="player-progress-info" aria-live="polite" aria-atomic="true">
                                {activeIdx >= 0
                                    ? `Line ${activeIdx + 1} of ${podcast.script.length}`
                                    : `${podcast.script.length} lines — click Play to start`}
                            </p>

                            {/* Description */}
                            {podcast.description && (
                                <p className="podcast-description">{podcast.description}</p>
                            )}

                            {/* Search */}
                            <section role="search" aria-label="Search transcript" className="podcast-search">
                                <div className="podcast-search-row">
                                    <FiSearch size={15} aria-hidden="true" className="search-icon" />
                                    <input
                                        type="search"
                                        placeholder="Search transcript…"
                                        value={query}
                                        onChange={handleSearch}
                                        className="podcast-search-input"
                                        aria-label="Search transcript"
                                    />
                                    {matchIdxs.length > 0 && (
                                        <span className="search-count">{matchCursor + 1}/{matchIdxs.length}</span>
                                    )}
                                    <button onClick={() => goMatch(-1)} disabled={!matchIdxs.length} aria-label="Previous result" className="search-nav-btn">▲</button>
                                    <button onClick={() => goMatch(1)}  disabled={!matchIdxs.length} aria-label="Next result"     className="search-nav-btn">▼</button>
                                </div>
                            </section>

                            {/* Script */}
                            <article id="transcript" className="podcast-script" aria-label="Podcast transcript">
                                {podcast.script?.map((line, idx) => {
                                    const info   = SPEAKERS[line.speaker] || { color: '#a0a0a0', avatar: '💬', role: '' };
                                    const isActive = idx === activeIdx;
                                    const isMatch  = matchIdxs.includes(idx);
                                    const isCurMatch = matchIdxs[matchCursor] === idx;

                                    return (
                                        <motion.div
                                            key={idx}
                                            ref={el => (lineRefs.current[idx] = el)}
                                            className={[
                                                'script-line',
                                                isActive   ? 'active'     : '',
                                                isMatch    ? 'match'      : '',
                                                isCurMatch ? 'cur-match'  : '',
                                            ].join(' ').trim()}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.012 }}
                                            style={{ '--speaker-color': info.color }}
                                            /* Accessibility: keyboard-clickable line */
                                            role="button"
                                            tabIndex={0}
                                            aria-current={isActive ? 'true' : undefined}
                                            aria-label={`Jump to line ${idx + 1}: ${line.speaker} — ${line.text}`}
                                            onClick={() => jumpToLine(idx)}
                                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jumpToLine(idx); } }}
                                        >
                                            <div className="speaker-badge" aria-hidden="true">
                                                <span className="speaker-emoji">{info.avatar}</span>
                                                <span className="speaker-name" style={{ color: info.color }}>{line.speaker}</span>
                                            </div>
                                            <p className="line-text">{line.text}</p>
                                            {isActive && (
                                                <span className="line-wave" aria-hidden="true">
                                                    <span /><span /><span /><span />
                                                </span>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </article>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default PodcastPlayer;
