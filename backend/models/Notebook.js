import mongoose from 'mongoose';

const notebookSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
notebookSchema.index({ user: 1, updatedAt: -1 });

const Notebook = mongoose.model('Notebook', notebookSchema);

export default Notebook;
