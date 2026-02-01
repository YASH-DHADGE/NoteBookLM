import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft,
    FiBookOpen,
    FiChevronLeft,
    FiChevronRight,
    FiLoader,
    FiRefreshCw,
    FiCheck,
    FiX,
    FiZap,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { contentAPI } from '../services/api';
import Navbar from '../components/common/Navbar';
import './FlashcardGenerator.css';

const FlashcardGenerator = () => {
    const [searchParams] = useSearchParams();
    const contentId = searchParams.get('contentId');

    const [content, setContent] = useState(null);
    const [flashcards, setFlashcards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [knownCards, setKnownCards] = useState(new Set());

    useEffect(() => {
        if (contentId) {
            loadContent();
        } else {
            setLoading(false);
        }
    }, [contentId]);

    const loadContent = async () => {
        try {
            setLoading(true);
            const response = await contentAPI.getOne(contentId);
            setContent(response.data);
            if (response.data?.flashcards?.length > 0) {
                setFlashcards(response.data.flashcards);
            }
        } catch (error) {
            console.error('Failed to load content:', error);
            toast.error('Failed to load content');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!contentId) {
            toast.error('No content selected');
            return;
        }

        try {
            setGenerating(true);
            const response = await contentAPI.generateFlashcards(contentId, {
                count: 10,
                difficulty: 'medium',
            });

            setFlashcards(response.data.flashcards);
            setCurrentIndex(0);
            setIsFlipped(false);
            setKnownCards(new Set());
            toast.success(`Generated ${response.data.count} flashcards!`);
        } catch (error) {
            console.error('Failed to generate flashcards:', error);
            toast.error(error.message || 'Failed to generate flashcards');
        } finally {
            setGenerating(false);
        }
    };

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const handleNext = () => {
        if (currentIndex < flashcards.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsFlipped(false);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setIsFlipped(false);
        }
    };

    const handleMarkKnown = () => {
        setKnownCards((prev) => new Set([...prev, currentIndex]));
        handleNext();
    };

    const handleReset = () => {
        setCurrentIndex(0);
        setIsFlipped(false);
        setKnownCards(new Set());
    };

    const progress = flashcards.length > 0
        ? Math.round((knownCards.size / flashcards.length) * 100)
        : 0;

    return (
        <div className="flashcard-page">
            <Navbar />
            <main className="flashcard-main">
                <div className="flashcard-container container">
                    <div className="flashcard-header">
                        <Link to="/content-analyzer" className="back-link">
                            <FiArrowLeft /> Back to Content Analyzer
                        </Link>
                        <h1 className="flashcard-title">
                            <FiBookOpen className="title-icon" />
                            AI Flashcard Generator
                        </h1>
                        <p className="flashcard-subtitle">
                            {content ? `Flashcards for: ${content.title}` : 'Generate flashcards from your documents'}
                        </p>
                    </div>

                    <div className="flashcard-content">
                        {/* Left Panel - Controls */}
                        <div className="flashcard-control-panel">
                            <div className="panel-header">
                                <h2>Flashcard Controls</h2>
                            </div>

                            {content && (
                                <div className="content-info">
                                    <h3>{content.title}</h3>
                                    <p>{content.wordCount} words</p>
                                    {content.summary?.executive && (
                                        <p className="content-summary">
                                            {content.summary.executive.substring(0, 150)}...
                                        </p>
                                    )}
                                </div>
                            )}

                            <button
                                className="generate-btn"
                                onClick={handleGenerate}
                                disabled={generating || !contentId}
                            >
                                {generating ? (
                                    <>
                                        <FiLoader className="spinner" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <FiZap />
                                        Generate Flashcards
                                    </>
                                )}
                            </button>

                            {flashcards.length > 0 && (
                                <>
                                    <div className="progress-section">
                                        <div className="progress-header">
                                            <span>Progress</span>
                                            <span>{knownCards.size} / {flashcards.length}</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    <button className="reset-btn" onClick={handleReset}>
                                        <FiRefreshCw /> Reset Progress
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Right Panel - Flashcard Display */}
                        <div className="flashcard-display-panel">
                            {loading ? (
                                <div className="loading-state">
                                    <FiLoader className="spinner" size={48} />
                                    <p>Loading content...</p>
                                </div>
                            ) : !contentId ? (
                                <div className="empty-state">
                                    <FiBookOpen size={48} />
                                    <h3>No Content Selected</h3>
                                    <p>Please select a document from the Content Analyzer to generate flashcards.</p>
                                    <Link to="/content-analyzer" className="action-link">
                                        Go to Content Analyzer
                                    </Link>
                                </div>
                            ) : flashcards.length === 0 ? (
                                <div className="empty-state">
                                    <FiBookOpen size={48} />
                                    <h3>No Flashcards Yet</h3>
                                    <p>Click "Generate Flashcards" to create study cards from your document.</p>
                                </div>
                            ) : (
                                <div className="flashcard-viewer">
                                    <div className="card-counter">
                                        Card {currentIndex + 1} of {flashcards.length}
                                    </div>

                                    <motion.div
                                        className={`flashcard ${isFlipped ? 'flipped' : ''} ${knownCards.has(currentIndex) ? 'known' : ''}`}
                                        onClick={handleFlip}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="flashcard-inner">
                                            <div className="flashcard-front">
                                                <div className="card-label">Question</div>
                                                <div className="card-content">
                                                    {flashcards[currentIndex]?.question}
                                                </div>
                                                <div className="card-hint">Click to reveal answer</div>
                                            </div>
                                            <div className="flashcard-back">
                                                <div className="card-label">Answer</div>
                                                <div className="card-content">
                                                    {flashcards[currentIndex]?.answer}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    <div className="flashcard-actions">
                                        <button
                                            className="nav-btn"
                                            onClick={handlePrev}
                                            disabled={currentIndex === 0}
                                        >
                                            <FiChevronLeft /> Previous
                                        </button>

                                        <div className="answer-buttons">
                                            <button
                                                className="answer-btn incorrect"
                                                onClick={handleNext}
                                                title="I don't know this"
                                            >
                                                <FiX /> Skip
                                            </button>
                                            <button
                                                className="answer-btn correct"
                                                onClick={handleMarkKnown}
                                                title="I know this"
                                            >
                                                <FiCheck /> Got it!
                                            </button>
                                        </div>

                                        <button
                                            className="nav-btn"
                                            onClick={handleNext}
                                            disabled={currentIndex === flashcards.length - 1}
                                        >
                                            Next <FiChevronRight />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default FlashcardGenerator;
