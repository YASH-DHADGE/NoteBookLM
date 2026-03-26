import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    FiArrowLeft,
    FiHelpCircle,
    FiChevronLeft,
    FiChevronRight,
    FiLoader,
    FiRefreshCw,
    FiCheck,
    FiX,
    FiZap,
    FiAward,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { contentAPI } from '../services/api';
import Navbar from '../components/common/Navbar';
import './QuizGenerator.css';

const QuizGenerator = () => {
    const [searchParams] = useSearchParams();
    const contentId = searchParams.get('contentId');
    const notebookId = searchParams.get('notebookId');

    const [content, setContent] = useState(null);
    const [quiz, setQuiz] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [showResults, setShowResults] = useState(false);
    const [answers, setAnswers] = useState([]);

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
            if (response.data?.quiz?.length > 0) {
                setQuiz(response.data.quiz);
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
            const response = await contentAPI.generateQuiz(contentId, {
                count: 10,
                difficulty: 'medium',
            });

            setQuiz(response.data.quiz);
            resetQuiz();
            toast.success(`Generated ${response.data.count} quiz questions!`);
        } catch (error) {
            console.error('Failed to generate quiz:', error);
            toast.error(error.message || 'Failed to generate quiz');
        } finally {
            setGenerating(false);
        }
    };

    const resetQuiz = () => {
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setHasAnswered(false);
        setScore(0);
        setShowResults(false);
        setAnswers([]);
    };

    const handleSelectAnswer = (index) => {
        if (hasAnswered) return;
        setSelectedAnswer(index);
    };

    const handleSubmitAnswer = () => {
        if (selectedAnswer === null) return;

        const isCorrect = selectedAnswer === quiz[currentIndex].correctAnswer;
        if (isCorrect) {
            setScore(score + 1);
        }

        setAnswers([...answers, { questionIndex: currentIndex, selected: selectedAnswer, correct: isCorrect }]);
        setHasAnswered(true);
    };

    const handleNext = () => {
        if (currentIndex < quiz.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setSelectedAnswer(null);
            setHasAnswered(false);
        } else {
            setShowResults(true);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            // Restore previous answer state
            const prevAnswer = answers.find(a => a.questionIndex === currentIndex - 1);
            if (prevAnswer) {
                setSelectedAnswer(prevAnswer.selected);
                setHasAnswered(true);
            } else {
                setSelectedAnswer(null);
                setHasAnswered(false);
            }
        }
    };

    const getScorePercentage = () => {
        return Math.round((score / quiz.length) * 100);
    };

    const getScoreMessage = () => {
        const percentage = getScorePercentage();
        if (percentage >= 90) return "Excellent! 🎉";
        if (percentage >= 70) return "Great job! 👏";
        if (percentage >= 50) return "Good effort! 💪";
        return "Keep practicing! 📚";
    };

    return (
        <div className="quiz-page">
            <Navbar />
            <main className="quiz-main">
                <div className="quiz-container container">
                    <div className="quiz-header">
                        <Link to={notebookId ? `/notebook/${notebookId}` : "/dashboard"} className="back-link">
                            <FiArrowLeft /> Back to {notebookId ? 'Notebook' : 'Dashboard'}
                        </Link>
                        <h1 className="quiz-title">
                            <FiHelpCircle className="title-icon" />
                            AI Quiz Generator
                        </h1>
                        <p className="quiz-subtitle">
                            {content ? `Quiz for: ${content.title}` : 'Generate quizzes from your documents'}
                        </p>
                    </div>

                    <div className="quiz-content">
                        {/* Left Panel - Controls */}
                        <div className="quiz-control-panel">
                            <div className="panel-header">
                                <h2>Quiz Controls</h2>
                            </div>

                            {content && (
                                <div className="content-info">
                                    <h3>{content.title}</h3>
                                    <p>{content.wordCount} words</p>
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
                                        Generate Quiz
                                    </>
                                )}
                            </button>

                            {quiz.length > 0 && !showResults && (
                                <div className="progress-section">
                                    <div className="progress-header">
                                        <span>Progress</span>
                                        <span>{currentIndex + 1} / {quiz.length}</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${((currentIndex + 1) / quiz.length) * 100}%` }}
                                        />
                                    </div>
                                    <div className="score-display">
                                        Score: {score} / {answers.length}
                                    </div>
                                </div>
                            )}

                            {quiz.length > 0 && (
                                <button className="reset-btn" onClick={resetQuiz}>
                                    <FiRefreshCw /> Start Over
                                </button>
                            )}
                        </div>

                        {/* Right Panel - Quiz Display */}
                        <div className="quiz-display-panel">
                            {loading ? (
                                <div className="loading-state">
                                    <FiLoader className="spinner" size={48} />
                                    <p>Loading content...</p>
                                </div>
                            ) : !contentId ? (
                                <div className="empty-state">
                                    <FiHelpCircle size={48} />
                                    <h3>No Content Selected</h3>
                                    <p>Please select a document from the Content Analyzer to generate a quiz.</p>
                                    <Link to={notebookId ? `/notebook/${notebookId}` : "/dashboard"} className="action-link">
                                        Go to {notebookId ? 'Notebook' : 'Dashboard'}
                                    </Link>
                                </div>
                            ) : quiz.length === 0 ? (
                                <div className="empty-state">
                                    <FiHelpCircle size={48} />
                                    <h3>No Quiz Yet</h3>
                                    <p>Click "Generate Quiz" to create questions from your document.</p>
                                </div>
                            ) : showResults ? (
                                <motion.div
                                    className="results-panel"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                >
                                    <FiAward className="results-icon" />
                                    <h2>Quiz Complete!</h2>
                                    <div className="results-score">
                                        <span className="score-number">{score}</span>
                                        <span className="score-divider">/</span>
                                        <span className="score-total">{quiz.length}</span>
                                    </div>
                                    <div className="results-percentage">{getScorePercentage()}%</div>
                                    <p className="results-message">{getScoreMessage()}</p>
                                    <button className="retry-btn" onClick={resetQuiz}>
                                        <FiRefreshCw /> Try Again
                                    </button>
                                </motion.div>
                            ) : (
                                <div className="question-viewer">
                                    <div className="question-number">
                                        Question {currentIndex + 1} of {quiz.length}
                                    </div>

                                    <div className="question-card">
                                        <div className="question-text">
                                            {quiz[currentIndex]?.question}
                                        </div>

                                        <div className="options-list">
                                            {quiz[currentIndex]?.options?.map((option, idx) => {
                                                let optionClass = 'option';
                                                if (hasAnswered) {
                                                    if (idx === quiz[currentIndex].correctAnswer) {
                                                        optionClass += ' correct';
                                                    } else if (idx === selectedAnswer) {
                                                        optionClass += ' incorrect';
                                                    }
                                                } else if (idx === selectedAnswer) {
                                                    optionClass += ' selected';
                                                }

                                                return (
                                                    <motion.div
                                                        key={idx}
                                                        className={optionClass}
                                                        onClick={() => handleSelectAnswer(idx)}
                                                        whileHover={!hasAnswered ? { scale: 1.01 } : {}}
                                                        whileTap={!hasAnswered ? { scale: 0.99 } : {}}
                                                    >
                                                        <span className="option-letter">
                                                            {String.fromCharCode(65 + idx)}
                                                        </span>
                                                        <span className="option-text">{option}</span>
                                                        {hasAnswered && idx === quiz[currentIndex].correctAnswer && (
                                                            <FiCheck className="option-icon correct" />
                                                        )}
                                                        {hasAnswered && idx === selectedAnswer && idx !== quiz[currentIndex].correctAnswer && (
                                                            <FiX className="option-icon incorrect" />
                                                        )}
                                                    </motion.div>
                                                );
                                            })}
                                        </div>

                                        {hasAnswered && quiz[currentIndex]?.explanation && (
                                            <div className="explanation">
                                                <strong>Explanation:</strong> {quiz[currentIndex].explanation}
                                            </div>
                                        )}
                                    </div>

                                    <div className="question-actions">
                                        <button
                                            className="nav-btn"
                                            onClick={handlePrev}
                                            disabled={currentIndex === 0}
                                        >
                                            <FiChevronLeft /> Previous
                                        </button>

                                        {!hasAnswered ? (
                                            <button
                                                className="submit-btn"
                                                onClick={handleSubmitAnswer}
                                                disabled={selectedAnswer === null}
                                            >
                                                Submit Answer
                                            </button>
                                        ) : (
                                            <button
                                                className="next-btn"
                                                onClick={handleNext}
                                            >
                                                {currentIndex === quiz.length - 1 ? 'See Results' : 'Next'}
                                                <FiChevronRight />
                                            </button>
                                        )}
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

export default QuizGenerator;
