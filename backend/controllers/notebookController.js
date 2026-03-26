import Notebook from '../models/Notebook.js';
import Content from '../models/Content.js';

// @desc    Get all notebooks for a user
// @route   GET /api/notebooks
// @access  Private
export const getNotebooks = async (req, res) => {
    try {
        const notebooks = await Notebook.find({ user: req.user._id }).sort({ updatedAt: -1 });
        
        // Count sources for each notebook
        const notebooksWithCounts = await Promise.all(notebooks.map(async (notebook) => {
            const sourceCount = await Content.countDocuments({ notebook: notebook._id });
            return {
                ...notebook.toObject(),
                sourceCount
            };
        }));

        res.json({
            success: true,
            data: notebooksWithCounts
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single notebook
// @route   GET /api/notebooks/:id
// @access  Private
export const getNotebook = async (req, res) => {
    try {
        const notebook = await Notebook.findOne({ _id: req.params.id, user: req.user._id });
        if (!notebook) {
            return res.status(404).json({ success: false, message: 'Notebook not found' });
        }
        res.json({ success: true, data: notebook });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new notebook
// @route   POST /api/notebooks
// @access  Private
export const createNotebook = async (req, res) => {
    try {
        const { title, description } = req.body;
        const notebook = await Notebook.create({
            user: req.user._id,
            title,
            description
        });
        res.status(201).json({ success: true, data: notebook });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete notebook
// @route   DELETE /api/notebooks/:id
// @access  Private
export const deleteNotebook = async (req, res) => {
    try {
        const notebook = await Notebook.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!notebook) {
            return res.status(404).json({ success: false, message: 'Notebook not found' });
        }
        
        // Optionally delete associated content
        await Content.deleteMany({ notebook: req.params.id });

        res.json({ success: true, message: 'Notebook and associated content deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
