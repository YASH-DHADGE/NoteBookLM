import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Tree from 'react-d3-tree';
import { FiArrowLeft, FiLoader, FiMapPin, FiRefreshCw, FiZoomIn, FiZoomOut, FiMaximize } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { contentAPI } from '../services/api';
import './MindmapGenerator.css';

const MindmapGenerator = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const contentId = searchParams.get('contentId');
    const notebookId = searchParams.get('notebookId');

    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [zoom, setZoom] = useState(0.8);

    const loadContent = useCallback(async () => {
        if (!contentId) {
            toast.error('No content ID provided');
            navigate('/dashboard');
            return;
        }

        try {
            setLoading(true);
            const response = await contentAPI.getOne(contentId);
            setContent(response.data);

            if (!response.data?.mindmap) {
                generateMindmap();
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error('Failed to load content:', error);
            toast.error('Failed to load content');
            setLoading(false);
        }
    }, [contentId, navigate]);

    useEffect(() => {
        loadContent();
    }, [loadContent]);

    const generateMindmap = async () => {
        try {
            setGenerating(true);
            const response = await contentAPI.generateMindMap(contentId);
            setContent((prev) => ({
                ...prev,
                mindmap: response.data.mindmap,
            }));
            toast.success('Mind map generated successfully!');
        } catch (error) {
            console.error('Mind map generation failed:', error);
            toast.error(error.message || 'Failed to generate mind map');
        } finally {
            setGenerating(false);
            setLoading(false);
        }
    };

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 2));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.2));

    const renderCustomNodeElement = ({ nodeDatum, toggleNode }) => {
        const isRoot = nodeDatum.id === 'root';
        const hasChildren = nodeDatum.children && nodeDatum.children.length > 0;
        
        return (
            <g>
                <foreignObject x="-100" y="-35" width="200" height="70">
                    <div
                        className={`mindmap-node ${isRoot ? 'root-node' : ''} ${hasChildren ? 'parent-node' : 'leaf-node'}`}
                        onClick={toggleNode}
                    >
                        <span className="node-label" title={nodeDatum.name || nodeDatum.label}>
                            {nodeDatum.name || nodeDatum.label}
                        </span>
                        {hasChildren && !isRoot && (
                            <div className="node-badge" title={`${nodeDatum.children.length} subtopics`}>
                                {nodeDatum.children.length}
                            </div>
                        )}
                    </div>
                </foreignObject>
            </g>
        );
    };

    if (loading || generating) {
        return (
            <div className="mindmap-loading-container">
                <FiLoader className="spinner large" />
                <h2>{generating ? 'AI is generating your mind map...' : 'Loading...'}</h2>
                <p>This may take a minute for large documents.</p>
            </div>
        );
    }

    const treeData = content?.mindmap?.rootNode;

    return (
        <div className="mindmap-container">
            <header className="mindmap-header">
                <div className="header-left">
                    <button
                        className="back-btn"
                        onClick={() => navigate(`/notebook/${notebookId}`)}
                    >
                        <FiArrowLeft /> Back to Notebook
                    </button>
                    <h1><FiMapPin /> Mind Map: {content?.title}</h1>
                </div>
                <div className="header-right">
                    <button className="action-btn" onClick={generateMindmap} disabled={generating}>
                        <FiRefreshCw className={generating ? 'spinner' : ''} /> Regenerate
                    </button>
                </div>
            </header>

            <main className="mindmap-workspace">
                <div className="tree-controls">
                    <button onClick={handleZoomIn} title="Zoom In"><FiZoomIn /></button>
                    <button onClick={handleZoomOut} title="Zoom Out"><FiZoomOut /></button>
                </div>

                <div className="tree-wrapper">
                    {treeData ? (
                        <Tree
                            data={treeData}
                            orientation="horizontal"
                            pathFunc="diagonal"
                            translate={{ x: 200, y: window.innerHeight / 2 }}
                            nodeSize={{ x: 300, y: 100 }}
                            separation={{ siblings: 1, nonSiblings: 1.5 }}
                            renderCustomNodeElement={renderCustomNodeElement}
                            zoom={zoom}
                            scaleExtent={{ min: 0.1, max: 3 }}
                        />
                    ) : (
                        <div className="empty-state">
                            <FiMapPin className="empty-icon" />
                            <p>No mind map data available.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MindmapGenerator;
