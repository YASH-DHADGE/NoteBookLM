import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiUploadCloud,
    FiFile,
    FiFileText,
    FiMusic,
    FiVideo,
    FiLink,
    FiX,
    FiCheck,
    FiLoader,
    FiZap,
    FiBookOpen,
    FiTrash2,
    FiChevronRight,
    FiChevronLeft,
    FiPlus,
    FiSearch,
    FiMic,
    FiGrid,
    FiCopy,
    FiThumbsUp,
    FiThumbsDown,
    FiBookmark,
    FiSend,
    FiEdit,
    FiMapPin,
    FiBarChart,
    FiLayers,
    FiDatabase,
    FiPlay,
    FiHelpCircle,
    FiArrowLeft,
    FiBook,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { contentAPI, notebookAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Dashboard.css';


const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { notebookId } = useParams();
    const [notebook, setNotebook] = useState(null);
    const [contents, setContents] = useState([]);
    const [selectedContent, setSelectedContent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [uploadQueue, setUploadQueue] = useState([]);
    const [urlInput, setUrlInput] = useState('');

    // Modal states
    const [showFlashcards, setShowFlashcards] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);
    const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
    const [generatingQuiz, setGeneratingQuiz] = useState(false);

    // Quiz state
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [quizScore, setQuizScore] = useState(0);

    // Load notebook and contents on mount
    useEffect(() => {
        if (notebookId) {
            loadNotebook();
            loadContents();
        }
    }, [notebookId]);

    const loadNotebook = async () => {
        try {
            const response = await notebookAPI.getOne(notebookId);
            setNotebook(response.data);
        } catch (error) {
            console.error('Failed to load notebook:', error);
            toast.error('Notebook not found');
            navigate('/dashboard');
        }
    };

    const loadContents = async () => {
        try {
            setLoading(true);
            const response = await contentAPI.getAll({ notebookId });
            setContents(response.data || []);
            if (response.data?.length > 0 && !selectedContent) {
                setSelectedContent(response.data[0]);
            }
        } catch (error) {
            console.error('Failed to load contents:', error);
        } finally {
            setLoading(false);
        }
    };

    const cleanAiText = (text) => {
        if (!text || typeof text !== 'string') return text;

        // Check if it's potentially a JSON string
        if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
            try {
                const parsed = JSON.parse(text);

                // Handle Gemini full structure
                if (parsed?.candidates?.[0]?.content?.parts?.[0]?.text) {
                    return parsed.candidates[0].content.parts[0].text;
                }

                // Handle Gemini candidate structure (what the user reported)
                if (parsed?.content?.parts?.[0]?.text) {
                    return parsed.content.parts[0].text;
                }

                // Handle other common JSON fields
                if (parsed?.text) return parsed.text;
                if (parsed?.output) return parsed.output;
                if (parsed?.response) return parsed.response;
            } catch (e) {
                // Not valid JSON or parsing failed, return original
                return text;
            }
        }
        return text;
    };

    const getFileIcon = (type) => {
        switch (type) {
            case 'audio': return <FiMusic />;
            case 'video': return <FiVideo />;
            case 'url': case 'youtube': return <FiLink />;
            default: return <FiFileText />;
        }
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        for (const file of acceptedFiles) {
            const queueItem = { file, status: 'uploading', progress: 0 };
            setUploadQueue((prev) => [...prev, queueItem]);

            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('notebookId', notebookId);

                const response = await contentAPI.uploadFile(formData);

                setUploadQueue((prev) =>
                    prev.map((item) =>
                        item.file === file ? { ...item, status: 'complete' } : item
                    )
                );

                // Reload contents and select the new one
                await loadContents();
                if (response.data) {
                    setSelectedContent(response.data);
                }

                toast.success(`${file.name} uploaded successfully`);
            } catch (error) {
                setUploadQueue((prev) =>
                    prev.map((item) =>
                        item.file === file ? { ...item, status: 'error' } : item
                    )
                );
                toast.error(error.message || 'Upload failed');
            }
        }

        // Clear queue after delay
        setTimeout(() => setUploadQueue([]), 3000);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt'],
        },
    });

    const handleAnalyze = async () => {
        if (!selectedContent) return;

        try {
            setAnalyzing(true);
            console.log('🔍 Analyzing content:', selectedContent);

            const response = await contentAPI.analyze(selectedContent._id);

            // Update selected content with new summary
            setSelectedContent(response.data);

            // Update in list
            setContents((prev) =>
                prev.map((c) => (c._id === response.data._id ? response.data : c))
            );

            toast.success('Analysis complete!');
        } catch (error) {
            console.error('Analysis error:', error);
            toast.error(error.message || 'Analysis failed');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleGenerateFlashcards = async () => {
        if (!selectedContent) return;

        try {
            setGeneratingFlashcards(true);
            const response = await contentAPI.generateFlashcards(selectedContent._id, {
                count: 10,
                difficulty: 'medium',
            });

            setSelectedContent((prev) => ({
                ...prev,
                flashcards: response.data.flashcards,
            }));

            setCurrentFlashcardIndex(0);
            setIsFlipped(false);
            setShowFlashcards(true);
            toast.success(`Generated ${response.data.count} flashcards!`);
        } catch (error) {
            toast.error(error.message || 'Failed to generate flashcards');
        } finally {
            setGeneratingFlashcards(false);
        }
    };

    const handleGenerateQuiz = async () => {
        if (!selectedContent) return;

        try {
            setGeneratingQuiz(true);
            const response = await contentAPI.generateQuiz(selectedContent._id, {
                count: 10,
                difficulty: 'medium',
            });

            setSelectedContent((prev) => ({
                ...prev,
                quiz: response.data.quiz,
            }));

            setCurrentQuestionIndex(0);
            setSelectedAnswer(null);
            setShowResult(false);
            setQuizScore(0);
            setShowQuiz(true);
            toast.success(`Generated ${response.data.count} quiz questions!`);
        } catch (error) {
            toast.error(error.message || 'Failed to generate quiz');
        } finally {
            setGeneratingQuiz(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await contentAPI.delete(id);
            setContents((prev) => prev.filter((c) => c._id !== id));
            if (selectedContent?._id === id) {
                setSelectedContent(contents.find((c) => c._id !== id) || null);
            }
            toast.success('Content deleted');
        } catch (error) {
            toast.error(error.message || 'Delete failed');
        }
    };

    const handleCopy = () => {
        if (!selectedContent?.summary?.detailedAnalysis) return;
        const textToCopy = cleanAiText(selectedContent.summary.detailedAnalysis);
        navigator.clipboard.writeText(textToCopy)
            .then(() => toast.success('Summary copied to clipboard!'))
            .catch(() => toast.error('Failed to copy to clipboard'));
    };

    // Studio action cards
    const studioActions = [
        { 
            icon: <FiMic />, 
            label: 'Audio Overview', 
            iconClass: 'audio', 
            action: () => selectedContent ? navigate(`/podcast?contentId=${selectedContent._id}&notebookId=${notebookId}`) : toast.error('Select a document first') 
        },
        { icon: <FiVideo />, label: 'Video Overview', iconClass: 'video', action: () => toast('Coming soon!') },
        { 
            icon: <FiMapPin />, 
            label: 'Mind Map', 
            iconClass: 'mindmap', 
            action: () => selectedContent ? navigate(`/mindmap?contentId=${selectedContent._id}&notebookId=${notebookId}`) : toast.error('Select a document first') 
        },
        { icon: <FiBarChart />, label: 'Reports', iconClass: 'reports', action: () => toast('Coming soon!') },
        {
            icon: <FiBookOpen />,
            label: 'Flashcards',
            iconClass: 'flashcards',
            action: () => selectedContent ? navigate(`/flashcards?contentId=${selectedContent._id}&notebookId=${notebookId}`) : toast.error('Select a document first')
        },
        {
            icon: <FiHelpCircle />,
            label: 'Quiz',
            iconClass: 'quiz',
            action: () => selectedContent ? navigate(`/quiz?contentId=${selectedContent._id}&notebookId=${notebookId}`) : toast.error('Select a document first')
        },
        { icon: <FiLayers />, label: 'Infographic', iconClass: 'infographic', action: () => toast('Coming soon!') },
        { icon: <FiGrid />, label: 'Slide deck', iconClass: 'slides', action: () => navigate('/ppt-generator') },
        { icon: <FiDatabase />, label: 'Data table', iconClass: 'data', action: () => toast('Coming soon!') },
    ];

    return (
        <div className="notebook-container">
            {/* Sources Panel (Left) */}
            <aside className="sources-panel">
                <div className="panel-header">
                    <span className="panel-title">Sources</span>
                </div>

                <div {...getRootProps()} className="add-source-btn">
                    <input {...getInputProps()} />
                    <FiPlus />
                    <span>Add sources</span>
                </div>

                <div className="sources-list">
                    {loading && (
                        <div className="empty-state">
                            <FiLoader className="spinner" />
                        </div>
                    )}

                    {!loading && contents.length === 0 && (
                        <div className="empty-state">
                            <FiFile className="empty-icon" />
                            <p>No sources yet. Add a document to get started.</p>
                        </div>
                    )}

                    {contents.map((content) => (
                        <div
                            key={content._id}
                            className={`source-item ${selectedContent?._id === content._id ? 'active' : ''}`}
                            onClick={() => setSelectedContent(content)}
                        >
                            <div className="source-icon">
                                {getFileIcon(content.type)}
                            </div>
                            <div className="source-info">
                                <div className="source-name">{content.title}</div>
                                <div className="source-meta">
                                    {content.wordCount} words • {content.status}
                                </div>
                            </div>
                            <button
                                className="action-btn-icon"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(content._id);
                                }}
                            >
                                <FiTrash2 size={14} />
                            </button>
                        </div>
                    ))}

                    {/* Upload Queue */}
                    {uploadQueue.map((item, idx) => (
                        <div key={idx} className="source-item">
                            <div className="source-icon">
                                {item.status === 'uploading' ? (
                                    <FiLoader className="spinner" />
                                ) : item.status === 'complete' ? (
                                    <FiCheck style={{ color: '#10b981' }} />
                                ) : (
                                    <FiX style={{ color: '#ef4444' }} />
                                )}
                            </div>
                            <div className="source-info">
                                <div className="source-name">{item.file.name}</div>
                                <div className="source-meta">
                                    {item.status === 'uploading' ? 'Uploading...' :
                                        item.status === 'complete' ? 'Complete' : 'Failed'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Chat Panel (Center) */}
            <main className="chat-panel">
                <div className="chat-header">
                    <div className="notebook-info-header">
                        <Link to="/dashboard" className="back-to-nb-btn" title="Back to all notebooks">
                            <FiArrowLeft />
                        </Link>
                        <FiBook className="nb-icon" />
                        <span className="nb-title">{notebook?.title || 'Loading Notebook...'}</span>
                    </div>
                    <span className="user-welcome">
                        Welcome, <span className="text-gradient">{user?.name?.split(' ')[0] || 'User'}</span>
                    </span>
                </div>

                <div className="chat-content">
                    {selectedContent ? (
                        <div className="document-display">
                            <div className="doc-icon-large">
                                {getFileIcon(selectedContent.type)}
                            </div>

                            <h1 className="doc-title">{selectedContent.title}</h1>
                            <p className="doc-source-count">1 source</p>

                            {selectedContent.summary?.detailedAnalysis ? (
                                <>
                                    <div className="doc-summary markdown-body">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {cleanAiText(selectedContent.summary.detailedAnalysis).replace(/\\n/g, '\n')}
                                        </ReactMarkdown>
                                    </div>

                                    <div className="summary-actions">
                                        <button className="save-note-btn">
                                            <FiBookmark /> Save to note
                                        </button>
                                        <button className="action-btn-icon" onClick={handleCopy} title="Copy to clipboard">
                                            <FiCopy />
                                        </button>
                                        <button className="action-btn-icon"><FiThumbsUp /></button>
                                        <button className="action-btn-icon"><FiThumbsDown /></button>
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', marginTop: '40px' }}>
                                    <p style={{ color: '#707070', marginBottom: '16px' }}>
                                        This document hasn't been analyzed yet.
                                    </p>
                                    <button
                                        className="analyze-btn"
                                        onClick={handleAnalyze}
                                        disabled={analyzing}
                                    >
                                        {analyzing ? (
                                            <>
                                                <FiLoader className="spinner" />
                                                Analyzing...
                                            </>
                                        ) : (
                                            <>
                                                <FiZap />
                                                Analyze with AI
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <FiBookOpen className="empty-icon" />
                            <h3>Select a source</h3>
                            <p>Choose a document from the sources panel to view its analysis.</p>
                        </div>
                    )}
                </div>

                <div className="chat-input-area">
                    <div className="chat-input-wrapper">
                        <input
                            type="text"
                            className="chat-input"
                            placeholder="Start typing..."
                        />
                        <span className="source-count-badge">{contents.length} source{contents.length !== 1 ? 's' : ''}</span>
                        <button className="chat-send-btn">
                            <FiSend size={14} />
                        </button>
                    </div>
                </div>
            </main>

            {/* Studio Panel (Right) */}
            <aside className="studio-panel">
                <div className="studio-header">
                    <span className="studio-title">Studio</span>
                </div>

                <div className="studio-content">
                    <div className="studio-section">
                        <div className="studio-grid">
                            {studioActions.map((action, idx) => (
                                <div
                                    key={idx}
                                    className="studio-card"
                                    onClick={action.action}
                                >
                                    <div className={`studio-card-icon ${action.iconClass}`}>
                                        {action.loading ? <FiLoader className="spinner" /> : action.icon}
                                    </div>
                                    <span className="studio-card-label">{action.label}</span>
                                    <span className="studio-card-action"><FiEdit size={12} /></span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent notes section */}
                    <div className="studio-section">
                        <div className="studio-section-title">Notes</div>
                        <button className="add-source-btn" style={{ margin: 0, width: '100%' }}>
                            <FiPlus /> Add note
                        </button>
                    </div>
                </div>
            </aside>

            {/* Flashcard Modal */}
            <AnimatePresence>
                {showFlashcards && selectedContent?.flashcards?.length > 0 && (
                    <motion.div
                        className="flashcard-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowFlashcards(false)}
                    >
                        <motion.div
                            className="flashcard-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flashcard-modal-header">
                                <h2>Flashcards</h2>
                                <button className="close-modal-btn" onClick={() => setShowFlashcards(false)}>
                                    <FiX />
                                </button>
                            </div>

                            <div className="flashcard-viewer">
                                <div
                                    className={`flashcard ${isFlipped ? 'flipped' : ''}`}
                                    onClick={() => setIsFlipped(!isFlipped)}
                                >
                                    <div className="flashcard-inner">
                                        <div className="flashcard-front">
                                            <div className="flashcard-label">Question</div>
                                            <div className="flashcard-content">
                                                {selectedContent.flashcards[currentFlashcardIndex]?.question}
                                            </div>
                                        </div>
                                        <div className="flashcard-back">
                                            <div className="flashcard-label">Answer</div>
                                            <div className="flashcard-content">
                                                {selectedContent.flashcards[currentFlashcardIndex]?.answer}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flashcard-nav">
                                    <button
                                        className="flashcard-nav-btn"
                                        onClick={() => {
                                            setCurrentFlashcardIndex((prev) => prev - 1);
                                            setIsFlipped(false);
                                        }}
                                        disabled={currentFlashcardIndex === 0}
                                    >
                                        <FiChevronLeft />
                                    </button>
                                    <span className="flashcard-progress">
                                        {currentFlashcardIndex + 1} / {selectedContent.flashcards.length}
                                    </span>
                                    <button
                                        className="flashcard-nav-btn"
                                        onClick={() => {
                                            setCurrentFlashcardIndex((prev) => prev + 1);
                                            setIsFlipped(false);
                                        }}
                                        disabled={currentFlashcardIndex === selectedContent.flashcards.length - 1}
                                    >
                                        <FiChevronRight />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quiz Modal */}
            <AnimatePresence>
                {showQuiz && selectedContent?.quiz?.length > 0 && (
                    <motion.div
                        className="flashcard-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowQuiz(false)}
                    >
                        <motion.div
                            className="flashcard-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flashcard-modal-header">
                                <h2>Quiz</h2>
                                <button className="close-modal-btn" onClick={() => setShowQuiz(false)}>
                                    <FiX />
                                </button>
                            </div>

                            <div className="quiz-viewer">
                                {!showResult ? (
                                    <div className="quiz-question">
                                        <div className="quiz-question-text">
                                            {currentQuestionIndex + 1}. {selectedContent.quiz[currentQuestionIndex]?.question}
                                        </div>
                                        <div className="quiz-options">
                                            {selectedContent.quiz[currentQuestionIndex]?.options?.map((option, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`quiz-option ${selectedAnswer === idx ? 'selected' : ''}`}
                                                    onClick={() => setSelectedAnswer(idx)}
                                                >
                                                    <span className="quiz-option-letter">
                                                        {String.fromCharCode(65 + idx)}
                                                    </span>
                                                    <span className="quiz-option-text">{option}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flashcard-nav" style={{ marginTop: '24px' }}>
                                            <button
                                                className="flashcard-nav-btn"
                                                onClick={() => {
                                                    if (currentQuestionIndex > 0) {
                                                        setCurrentQuestionIndex((prev) => prev - 1);
                                                        setSelectedAnswer(null);
                                                    }
                                                }}
                                                disabled={currentQuestionIndex === 0}
                                            >
                                                <FiChevronLeft />
                                            </button>
                                            <span className="flashcard-progress">
                                                {currentQuestionIndex + 1} / {selectedContent.quiz.length}
                                            </span>
                                            <button
                                                className="flashcard-nav-btn"
                                                onClick={() => {
                                                    // Check answer
                                                    const correct = selectedContent.quiz[currentQuestionIndex]?.correctAnswer;
                                                    if (selectedAnswer === correct) {
                                                        setQuizScore((prev) => prev + 1);
                                                    }

                                                    if (currentQuestionIndex < selectedContent.quiz.length - 1) {
                                                        setCurrentQuestionIndex((prev) => prev + 1);
                                                        setSelectedAnswer(null);
                                                    } else {
                                                        setShowResult(true);
                                                    }
                                                }}
                                                disabled={selectedAnswer === null}
                                            >
                                                <FiChevronRight />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="quiz-result">
                                        <h3 style={{ color: '#e0e0e0', marginBottom: '16px' }}>Quiz Complete!</h3>
                                        <div className="quiz-score">
                                            {quizScore} / {selectedContent.quiz.length}
                                        </div>
                                        <p style={{ color: '#707070', marginTop: '8px' }}>
                                            {Math.round((quizScore / selectedContent.quiz.length) * 100)}% correct
                                        </p>
                                        <button
                                            className="analyze-btn"
                                            style={{ marginTop: '24px' }}
                                            onClick={() => {
                                                setCurrentQuestionIndex(0);
                                                setSelectedAnswer(null);
                                                setShowResult(false);
                                                setQuizScore(0);
                                            }}
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
