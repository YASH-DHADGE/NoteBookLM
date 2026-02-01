import { Link } from 'react-router-dom';
import {
    FiFileText,
    FiSearch,
    FiZap,
    FiShield,
    FiTrendingUp,
    FiUsers,
    FiArrowRight,
    FiCheck,
} from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import './Landing.css';

const features = [
    {
        icon: <FiFileText />,
        title: 'Smart Document Analysis',
        description: 'Advanced AI extracts key insights, summaries, and action items from any document format.',
    },
    {
        icon: <FiSearch />,
        title: 'Semantic Search',
        description: 'Find exactly what you need with context-aware search across all your documents.',
    },
    {
        icon: <FiZap />,
        title: 'Instant Processing',
        description: 'Process hundreds of documents in seconds with our high-performance engine.',
    },
    {
        icon: <FiShield />,
        title: 'Enterprise Security',
        description: 'Bank-level encryption and compliance with SOC 2, GDPR, and HIPAA standards.',
    },
    {
        icon: <FiTrendingUp />,
        title: 'Analytics Dashboard',
        description: 'Visualize trends, patterns, and insights across your entire document library.',
    },
    {
        icon: <FiUsers />,
        title: 'Team Collaboration',
        description: 'Share insights, annotate documents, and collaborate in real-time with your team.',
    },
];

const stats = [
    { value: '10M+', label: 'Documents Processed' },
    { value: '500K+', label: 'Active Users' },
    { value: '99.9%', label: 'Uptime SLA' },
    { value: '50ms', label: 'Avg Response Time' },
];

const Landing = () => {
    const { isAuthenticated } = useAuth();

    return (
        <div className="landing">
            <Navbar />

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-container container">
                    <div className="hero-badge animate-slideUp">
                        <FiZap /> Powered by Advanced AI
                    </div>
                    <h1 className="hero-title animate-slideUp">
                        Transform Your Documents Into
                        <span className="text-gradient"> Actionable Intelligence</span>
                    </h1>
                    <p className="hero-description animate-slideUp">
                        DocuMind uses cutting-edge AI to analyze, summarize, and extract insights from your documents.
                        Stop searching, start understanding.
                    </p>
                    <div className="hero-actions animate-slideUp">
                        <Link to={isAuthenticated ? '/dashboard' : '/signup'}>
                            <Button variant="primary" size="lg" rightIcon={<FiArrowRight />}>
                                {isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial'}
                            </Button>
                        </Link>
                        <Link to="/">
                            <Button variant="secondary" size="lg">
                                Watch Demo
                            </Button>
                        </Link>
                    </div>
                    <div className="hero-stats">
                        {stats.map((stat, index) => (
                            <div key={index} className="hero-stat">
                                <span className="hero-stat-value">{stat.value}</span>
                                <span className="hero-stat-label">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="hero-glow" />
            </section>

            {/* Features Section */}
            <section className="features" id="features">
                <div className="features-container container">
                    <div className="features-header">
                        <h2 className="features-title">
                            Everything You Need for
                            <span className="text-gradient"> Document Intelligence</span>
                        </h2>
                        <p className="features-description">
                            Powerful features designed to help you extract maximum value from your documents.
                        </p>
                    </div>
                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <div key={index} className="feature-card">
                                <div className="feature-icon">{feature.icon}</div>
                                <h3 className="feature-title">{feature.title}</h3>
                                <p className="feature-description">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta">
                <div className="cta-container container">
                    <div className="cta-content">
                        <h2 className="cta-title">
                            Ready to Unlock Your Document's Potential?
                        </h2>
                        <p className="cta-description">
                            Join thousands of teams already using DocuMind to transform their document workflows.
                        </p>
                        <ul className="cta-benefits">
                            <li><FiCheck /> Free 14-day trial</li>
                            <li><FiCheck /> No credit card required</li>
                            <li><FiCheck /> Cancel anytime</li>
                        </ul>
                        <Link to={isAuthenticated ? '/dashboard' : '/signup'}>
                            <Button variant="primary" size="lg" rightIcon={<FiArrowRight />}>
                                {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
                            </Button>
                        </Link>
                    </div>
                    <div className="cta-glow" />
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Landing;
