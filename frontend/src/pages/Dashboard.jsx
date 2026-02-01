import { Link } from 'react-router-dom';
import {
    FiFileText,
    FiUpload,
    FiSearch,
    FiTrendingUp,
    FiPlus,
    FiClock,
    FiFolder,
    FiStar,
    FiZap,
    FiBookOpen,
} from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Navbar from '../components/common/Navbar';
import './Dashboard.css';

const quickStats = [
    { icon: <FiFileText />, label: 'Total Documents', value: '0', color: '#6366f1' },
    { icon: <FiTrendingUp />, label: 'Analyzed Today', value: '0', color: '#10b981' },
    { icon: <FiStar />, label: 'Insights Found', value: '0', color: '#f59e0b' },
    { icon: <FiFolder />, label: 'Collections', value: '0', color: '#8b5cf6' },
];

const recentActivity = [
    { id: 1, action: 'Welcome to DocuMind!', time: 'Just now', type: 'info' },
];

const Dashboard = () => {
    const { user } = useAuth();

    return (
        <div className="dashboard">
            <Navbar />
            <main className="dashboard-main">
                <div className="dashboard-container container">
                    {/* Welcome Section */}
                    <section className="dashboard-welcome">
                        <div className="welcome-content">
                            <h1 className="welcome-title">
                                Welcome back, <span className="text-gradient">{user?.name?.split(' ')[0] || 'User'}</span>
                            </h1>
                            <p className="welcome-subtitle">
                                Here's what's happening with your documents today.
                            </p>
                        </div>
                        <div className="welcome-actions">
                            <Link to="/ppt-generator">
                                <Button variant="primary" leftIcon={<FiZap />}>
                                    PPT Creator
                                </Button>
                            </Link>
                            <Button variant="secondary" leftIcon={<FiUpload />}>
                                Upload Document
                            </Button>
                        </div>
                    </section>

                    {/* Quick Stats */}
                    <section className="dashboard-stats">
                        {quickStats.map((stat, index) => (
                            <div key={index} className="stat-card">
                                <div
                                    className="stat-icon"
                                    style={{ backgroundColor: `${stat.color}20`, color: stat.color }}
                                >
                                    {stat.icon}
                                </div>
                                <div className="stat-content">
                                    <span className="stat-value">{stat.value}</span>
                                    <span className="stat-label">{stat.label}</span>
                                </div>
                            </div>
                        ))}
                    </section>

                    {/* Main Content Grid */}
                    <div className="dashboard-grid">
                        {/* Upload Section */}
                        <section className="dashboard-card upload-card">
                            <div className="card-header">
                                <h2 className="card-title">Quick Upload</h2>
                            </div>
                            <div className="upload-zone">
                                <div className="upload-icon">
                                    <FiUpload />
                                </div>
                                <h3 className="upload-title">Drop your documents here</h3>
                                <p className="upload-description">
                                    or click to browse. Supports PDF, DOCX, TXT, and more.
                                </p>
                                <Button variant="outline" size="sm">
                                    Browse Files
                                </Button>
                            </div>
                        </section>

                        {/* Recent Activity */}
                        <section className="dashboard-card activity-card">
                            <div className="card-header">
                                <h2 className="card-title">Recent Activity</h2>
                                <Link to="/" className="card-link">View all</Link>
                            </div>
                            <div className="activity-list">
                                {recentActivity.length > 0 ? (
                                    recentActivity.map((activity) => (
                                        <div key={activity.id} className="activity-item">
                                            <div className="activity-icon">
                                                <FiClock />
                                            </div>
                                            <div className="activity-content">
                                                <p className="activity-action">{activity.action}</p>
                                                <span className="activity-time">{activity.time}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="activity-empty">
                                        <p>No recent activity</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Quick Actions */}
                        <section className="dashboard-card actions-card">
                            <div className="card-header">
                                <h2 className="card-title">Quick Actions</h2>
                            </div>
                            <div className="actions-grid">
                                <Link to="/content-analyzer" className="action-btn action-btn-featured" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                                    <FiBookOpen />
                                    <span>Content Analyzer</span>
                                </Link>
                                <Link to="/ppt-generator" className="action-btn action-btn-featured">
                                    <FiZap />
                                    <span>AI Presentation</span>
                                </Link>
                                <button className="action-btn">
                                    <FiSearch />
                                    <span>Search Documents</span>
                                </button>
                                <button className="action-btn">
                                    <FiTrendingUp />
                                    <span>View Analytics</span>
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
