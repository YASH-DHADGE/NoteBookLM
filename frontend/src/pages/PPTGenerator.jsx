import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import {
    FiFileText,
    FiUsers,
    FiList,
    FiDroplet,
    FiDownload,
    FiLoader,
    FiCheck,
    FiArrowLeft,
    FiZap,
    FiUploadCloud,
    FiFile,
    FiX,
    FiToggleLeft,
    FiToggleRight,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Navbar from '../components/common/Navbar';
import './PPTGenerator.css';

const PPTGenerator = () => {
    const { user } = useAuth();
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    // Template toggle state
    const [hasTemplate, setHasTemplate] = useState(false);
    const [templateFile, setTemplateFile] = useState(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm();

    // Handle file drop for template upload
    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles?.length > 0) {
            const file = acceptedFiles[0];
            setTemplateFile(file);
            toast.success('Template uploaded successfully!');
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
        },
        maxFiles: 1,
        multiple: false,
        disabled: isGenerating
    });

    // Clear template when toggle is turned off
    const handleToggleTemplate = () => {
        setHasTemplate(!hasTemplate);
        if (hasTemplate) {
            // Turning off - clear template data
            setTemplateFile(null);
        }
    };

    const removeTemplate = (e) => {
        e.stopPropagation();
        setTemplateFile(null);
    };

    const simulateProgress = () => {
        let currentProgress = 0;
        const stages = hasTemplate ? [
            { progress: 10, text: 'Uploading template...' },
            { progress: 30, text: 'Converting template to HTML...' },
            { progress: 50, text: 'AI generating content...' },
            { progress: 70, text: 'Rendering slides...' },
            { progress: 90, text: 'Creating PowerPoint file...' },
        ] : [
            { progress: 20, text: 'Generating HTML with AI...' },
            { progress: 50, text: 'Rendering slides...' },
            { progress: 80, text: 'Creating PowerPoint file...' },
            { progress: 95, text: 'Finalizing...' },
        ];

        let stageIndex = 0;

        const interval = setInterval(() => {
            if (stageIndex < stages.length) {
                currentProgress = stages[stageIndex].progress;
                setProgress(currentProgress);
                setProgressText(stages[stageIndex].text);
                stageIndex++;
            }
        }, 3000);

        return () => clearInterval(interval);
    };

    const onSubmit = async (data) => {
        // Validate template if toggle is ON
        if (hasTemplate && !templateFile) {
            toast.error('Please upload a PPTX template first');
            return;
        }

        setIsGenerating(true);
        setProgress(0);
        setProgressText('Starting generation...');
        setIsComplete(false);

        const stopProgress = simulateProgress();

        try {
            let response;

            if (hasTemplate && templateFile) {
                // Use FormData for file upload
                const formData = new FormData();
                formData.append('template', templateFile);
                formData.append('topic', data.topic);
                formData.append('targetAudience', data.targetAudience);
                formData.append('keyPoints', data.keyPoints);
                formData.append('colorScheme', data.colorScheme);

                response = await fetch('/api/ppt/generate-with-template', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData,
                });
            } else {
                // Standard JSON request without template
                response = await fetch('/api/ppt/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(data),
                });
            }

            if (!response.ok) {
                // Try to parse error message
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to generate presentation');
                } else {
                    throw new Error(`Failed to generate presentation (${response.status})`);
                }
            }

            // Get the blob from response
            const blob = await response.blob();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Get filename from Content-Disposition header or use default
            const disposition = response.headers.get('Content-Disposition');
            let filename = `${data.topic.replace(/[^a-zA-Z0-9]/g, '_')}_presentation.pptx`;
            if (disposition) {
                const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }

            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setProgress(100);
            setProgressText('Download complete!');
            setIsComplete(true);
            toast.success('Presentation downloaded successfully!');
        } catch (error) {
            console.error('Generation error:', error);
            toast.error(error.message || 'Failed to generate presentation');
            setProgress(0);
            setProgressText('');
        } finally {
            stopProgress();
            setIsGenerating(false);
        }
    };

    const handleReset = () => {
        reset();
        setIsComplete(false);
        setProgress(0);
        setProgressText('');
        setHasTemplate(false);
        setTemplateFile(null);
    };

    return (
        <div className="ppt-generator">
            <Navbar />
            <main className="ppt-main">
                <div className="ppt-container container">
                    <div className="ppt-header">
                        <Link to="/dashboard" className="back-link">
                            <FiArrowLeft /> Back to Notebooks
                        </Link>
                        <h1 className="ppt-title">
                            <FiZap className="title-icon" />
                            AI Presentation Generator
                        </h1>
                        <p className="ppt-subtitle">
                            Create stunning presentations in seconds with AI-powered content generation
                        </p>
                    </div>

                    <div className="ppt-content">
                        {/* Left Panel - Form */}
                        <div className="ppt-form-panel">
                            <div className="panel-header">
                                <h2>Presentation Details</h2>
                                <p>Fill in the details below to generate your presentation</p>
                            </div>

                            {/* Template Toggle */}
                            <div className="template-toggle-section">
                                <div className="toggle-wrapper" onClick={handleToggleTemplate}>
                                    <span className="toggle-label">Use Template</span>
                                    <div className={`toggle-switch ${hasTemplate ? 'active' : ''}`}>
                                        {hasTemplate ? (
                                            <FiToggleRight className="toggle-icon active" />
                                        ) : (
                                            <FiToggleLeft className="toggle-icon" />
                                        )}
                                    </div>
                                </div>
                                <p className="toggle-description">
                                    {hasTemplate
                                        ? 'Upload your PPTX template and we\'ll fill it with AI-generated content'
                                        : 'Generate a new presentation from scratch'}
                                </p>
                            </div>

                            {/* Template Upload Section (Conditional) */}
                            {hasTemplate && (
                                <div className="template-upload-section">
                                    <label className="form-label">
                                        <FiUploadCloud /> Template File (.pptx)
                                    </label>

                                    {!templateFile ? (
                                        <div
                                            {...getRootProps()}
                                            className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}
                                        >
                                            <input {...getInputProps()} />
                                            <div className="dropzone-content">
                                                <FiFile className="dropzone-icon" />
                                                <p>Drag & drop your template here, or click to browse</p>
                                                <span className="dropzone-hint">Only .pptx files are supported</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="file-preview">
                                            <FiFile className="file-icon" />
                                            <div className="file-info">
                                                <span className="file-name">{templateFile.name}</span>
                                                <span className="file-status">✓ Ready to upload</span>
                                            </div>
                                            <FiX
                                                className="remove-file"
                                                onClick={removeTemplate}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <form onSubmit={handleSubmit(onSubmit)} className="ppt-form">
                                <div className="form-group">
                                    <label className="form-label">
                                        <FiFileText /> Topic
                                    </label>
                                    <input
                                        type="text"
                                        className={`form-input ${errors.topic ? 'error' : ''}`}
                                        placeholder="e.g., AI in Healthcare"
                                        disabled={isGenerating}
                                        {...register('topic', {
                                            required: 'Topic is required',
                                            minLength: {
                                                value: 3,
                                                message: 'Topic must be at least 3 characters',
                                            },
                                        })}
                                    />
                                    {errors.topic && (
                                        <span className="form-error">{errors.topic.message}</span>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        <FiUsers /> Target Audience
                                    </label>
                                    <input
                                        type="text"
                                        className={`form-input ${errors.targetAudience ? 'error' : ''}`}
                                        placeholder="e.g., Doctors, Engineers, Students"
                                        disabled={isGenerating}
                                        {...register('targetAudience', {
                                            required: 'Target audience is required',
                                        })}
                                    />
                                    {errors.targetAudience && (
                                        <span className="form-error">{errors.targetAudience.message}</span>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        <FiList /> Key Points to Cover
                                    </label>
                                    <textarea
                                        className={`form-input form-textarea ${errors.keyPoints ? 'error' : ''}`}
                                        placeholder="e.g., Introduction, Current Trends, Case Studies, Future Outlook"
                                        rows={4}
                                        disabled={isGenerating}
                                        {...register('keyPoints', {
                                            required: 'Key points are required',
                                        })}
                                    />
                                    {errors.keyPoints && (
                                        <span className="form-error">{errors.keyPoints.message}</span>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        <FiDroplet /> Preferred Color Scheme
                                    </label>
                                    <input
                                        type="text"
                                        className={`form-input ${errors.colorScheme ? 'error' : ''}`}
                                        placeholder="e.g., Blue and White, Dark Theme"
                                        disabled={isGenerating}
                                        {...register('colorScheme', {
                                            required: 'Color scheme is required',
                                        })}
                                    />
                                    {errors.colorScheme && (
                                        <span className="form-error">{errors.colorScheme.message}</span>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    fullWidth
                                    isLoading={isGenerating}
                                    leftIcon={<FiDownload />}
                                    disabled={isGenerating || (hasTemplate && !templateFile)}
                                >
                                    {isGenerating ? 'Generating...' : 'Generate & Download PPTX'}
                                </Button>
                            </form>
                        </div>

                        {/* Right Panel - Status */}
                        <div className="ppt-status-panel">
                            {!isGenerating && !isComplete ? (
                                <div className="status-idle">
                                    <div className="status-icon-wrapper">
                                        <FiZap className="status-icon" />
                                    </div>
                                    <h3>How it works</h3>
                                    <ol className="how-it-works">
                                        {hasTemplate ? (
                                            <>
                                                <li>
                                                    <span className="step-number">1</span>
                                                    <span>Upload your PPTX template</span>
                                                </li>
                                                <li>
                                                    <span className="step-number">2</span>
                                                    <span>Enter topic and presentation details</span>
                                                </li>
                                                <li>
                                                    <span className="step-number">3</span>
                                                    <span>AI fills your template with custom content</span>
                                                </li>
                                                <li>
                                                    <span className="step-number">4</span>
                                                    <span>Download your branded presentation</span>
                                                </li>
                                            </>
                                        ) : (
                                            <>
                                                <li>
                                                    <span className="step-number">1</span>
                                                    <span>Enter your presentation topic and details</span>
                                                </li>
                                                <li>
                                                    <span className="step-number">2</span>
                                                    <span>Our AI generates professional HTML slides</span>
                                                </li>
                                                <li>
                                                    <span className="step-number">3</span>
                                                    <span>Slides are rendered and captured as images</span>
                                                </li>
                                                <li>
                                                    <span className="step-number">4</span>
                                                    <span>Download your ready-to-use PowerPoint file</span>
                                                </li>
                                            </>
                                        )}
                                    </ol>
                                    <div className="status-note">
                                        <strong>Note:</strong> Generation typically takes 30-60 seconds depending on complexity.
                                    </div>
                                </div>
                            ) : isGenerating ? (
                                <div className="status-loading">
                                    <div className="loading-animation">
                                        <FiLoader className="spinner" />
                                    </div>
                                    <h3>Creating Your Presentation</h3>
                                    <div className="progress-container">
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <span className="progress-text">{progress}%</span>
                                    </div>
                                    <p className="progress-status">{progressText}</p>
                                </div>
                            ) : (
                                <div className="status-complete">
                                    <div className="success-icon-wrapper">
                                        <FiCheck className="success-icon" />
                                    </div>
                                    <h3>Presentation Ready!</h3>
                                    <p>Your PowerPoint file has been downloaded successfully.</p>
                                    <Button
                                        variant="secondary"
                                        onClick={handleReset}
                                        leftIcon={<FiZap />}
                                    >
                                        Create Another Presentation
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PPTGenerator;
