import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import NotebookSelection from './pages/NotebookSelection';
import Profile from './pages/Profile';
import PPTGenerator from './pages/PPTGenerator';
import FlashcardGenerator from './pages/FlashcardGenerator';
import QuizGenerator from './pages/QuizGenerator';
import PodcastPlayer from './pages/PodcastPlayer';
import MindmapGenerator from './pages/MindmapGenerator';
import VideoOverview from './pages/VideoOverview';

// Styles
import './styles/index.css';

function App() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#1a1a25',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '12px',
                        },
                        success: {
                            iconTheme: {
                                primary: '#10b981',
                                secondary: '#fff',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: '#fff',
                            },
                        },
                    }}
                />
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />

                    {/* Protected Routes */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <NotebookSelection />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/notebook/:notebookId"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <Profile />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/ppt-generator"
                        element={
                            <ProtectedRoute>
                                <PPTGenerator />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/flashcards"
                        element={
                            <ProtectedRoute>
                                <FlashcardGenerator />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/quiz"
                        element={
                            <ProtectedRoute>
                                <QuizGenerator />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/podcast"
                        element={
                            <ProtectedRoute>
                                <PodcastPlayer />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/mindmap"
                        element={
                            <ProtectedRoute>
                                <MindmapGenerator />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/video"
                        element={
                            <ProtectedRoute>
                                <VideoOverview />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;

