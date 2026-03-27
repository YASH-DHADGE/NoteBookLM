import axios from 'axios';

const API_URL = '/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const message = error.response?.data?.message || 'An error occurred';
        return Promise.reject(new Error(message));
    }
);

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    getMe: () => api.get('/auth/me'),
};

// User API
export const userAPI = {
    getProfile: () => api.get('/users/profile'),
    updateProfile: (data) => api.put('/users/profile', data),
    updatePassword: (data) => api.put('/users/password', data),
    deleteAccount: () => api.delete('/users/account'),
};

// Notebook API
export const notebookAPI = {
    getAll: () => api.get('/notebooks'),
    getOne: (id) => api.get(`/notebooks/${id}`),
    create: (data) => api.post('/notebooks', data),
    delete: (id) => api.delete(`/notebooks/${id}`),
};

// Content API
export const contentAPI = {
    // Upload
    uploadFile: (formData) => {
        return api.post('/content/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    uploadUrl: (data) => api.post('/content/upload-url', data),

    // CRUD
    getAll: (params) => api.get('/content', { params }),
    getOne: (id) => api.get(`/content/${id}`),
    delete: (id) => api.delete(`/content/${id}`),

    // AI Processing
    analyze: (id) => api.post(`/content/${id}/analyze`),
    generateFlashcards: (id, options) => api.post(`/content/${id}/flashcards`, options),
    generateQuiz: (id, options) => api.post(`/content/${id}/quiz`, options),
    generateMindMap: (id) => api.post(`/content/${id}/mindmap`),
    generatePodcast: (id) => api.post(`/content/${id}/podcast`),

    // Flashcard updates
    updateFlashcard: (contentId, flashcardId, data) =>
        api.patch(`/content/${contentId}/flashcards/${flashcardId}`, data),
};

// Video API
export const videoAPI = {
    generateScript: (data) => api.post('/video/generate-script', data),
    generateVideo: (data) => api.post('/video/generate', data),
};

export default api;
