import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiPlus, 
    FiBook, 
    FiMoreVertical, 
    FiTrash2, 
    FiClock, 
    FiFileText,
    FiSearch,
    FiX,
    FiSettings,
    FiUser
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { notebookAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/common/Navbar';
import './NotebookSelection.css';

const NotebookSelection = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notebooks, setNotebooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newNotebookTitle, setNewNotebookTitle] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadNotebooks();
    }, []);

    const loadNotebooks = async () => {
        try {
            setLoading(true);
            const response = await notebookAPI.getAll();
            setNotebooks(response.data || []);
        } catch (error) {
            console.error('Failed to load notebooks:', error);
            toast.error('Failed to load notebooks');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNotebook = async (e) => {
        e.preventDefault();
        if (!newNotebookTitle.trim()) return;

        try {
            const response = await notebookAPI.create({ title: newNotebookTitle });
            toast.success('Notebook created!');
            setNotebooks([response.data, ...notebooks]);
            setShowCreateModal(false);
            setNewNotebookTitle('');
            // Navigate to the new notebook
            navigate(`/notebook/${response.data._id}`);
        } catch (error) {
            toast.error(error.message || 'Failed to create notebook');
        }
    };

    const handleDeleteNotebook = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this notebook? All content inside will be lost.')) return;

        try {
            await notebookAPI.delete(id);
            setNotebooks(notebooks.filter(n => n._id !== id));
            toast.success('Notebook deleted');
        } catch (error) {
            toast.error('Failed to delete notebook');
        }
    };

    const filteredNotebooks = notebooks.filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        }).format(date);
    };

    return (
        <div className="notebook-selection-page">
            <Navbar />
            
            <main className="selection-main container">
                <header className="selection-header">
                    <div className="header-top">
                        <h1 className="welcome-text">
                            Welcome, <span className="text-gradient">{user?.name?.split(' ')[0] || 'User'}</span>
                        </h1>
                        <div className="search-bar">
                            <FiSearch className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search notebooks..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <p className="selection-subtitle">Select a notebook to start working or create a new one.</p>
                </header>

                <div className="notebooks-grid">
                    {/* Create New Card */}
                    <motion.div 
                        className="notebook-card create-card"
                        whileHover={{ y: -5, scale: 1.02 }}
                        onClick={() => setShowCreateModal(true)}
                    >
                        <div className="create-icon-wrapper">
                            <FiPlus className="create-icon" />
                        </div>
                        <h3 className="create-label">New Notebook</h3>
                    </motion.div>

                    {/* Existing Notebooks */}
                    {loading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="notebook-card skeleton">
                                <div className="skeleton-line title"></div>
                                <div className="skeleton-line meta"></div>
                            </div>
                        ))
                    ) : (
                        filteredNotebooks.map((notebook) => (
                            <motion.div 
                                key={notebook._id}
                                className="notebook-card"
                                whileHover={{ y: -5, scale: 1.02 }}
                                onClick={() => navigate(`/notebook/${notebook._id}`)}
                            >
                                <div className="card-header">
                                    <div className="notebook-icon">
                                        <FiBook />
                                    </div>
                                    <button 
                                        className="delete-nb-btn"
                                        onClick={(e) => handleDeleteNotebook(e, notebook._id)}
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                                <div className="card-body">
                                    <h3 className="notebook-title">{notebook.title}</h3>
                                    <div className="notebook-info">
                                        <span className="info-item">
                                            <FiFileText /> {notebook.sourceCount || 0} source{notebook.sourceCount !== 1 ? 's' : ''}
                                        </span>
                                        <span className="info-item">
                                            <FiClock /> {formatDate(notebook.updatedAt)}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {!loading && filteredNotebooks.length === 0 && searchQuery && (
                    <div className="no-results">
                        <FiSearch size={48} />
                        <h3>No notebooks found</h3>
                        <p>Try a different search term or create a new notebook.</p>
                    </div>
                )}
            </main>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div 
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div 
                            className="create-notebook-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>Create New Notebook</h2>
                                <button onClick={() => setShowCreateModal(false)} className="close-btn">
                                    <FiX />
                                </button>
                            </div>
                            <form onSubmit={handleCreateNotebook}>
                                <div className="form-group">
                                    <label>Notebook Title</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Physics Midterm, Research Notes..."
                                        value={newNotebookTitle}
                                        onChange={(e) => setNewNotebookTitle(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button 
                                        type="button" 
                                        className="cancel-btn"
                                        onClick={() => setShowCreateModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="submit-btn" disabled={!newNotebookTitle.trim()}>
                                        Create Notebook
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotebookSelection;
