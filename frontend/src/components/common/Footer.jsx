import { Link } from 'react-router-dom';
import { FiGithub, FiTwitter, FiLinkedin } from 'react-icons/fi';
import './Footer.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-container container">
                <div className="footer-main">
                    <div className="footer-brand">
                        <Link to="/" className="footer-logo">
                            <span className="logo-icon">📄</span>
                            <span className="logo-text">
                                Docu<span className="text-gradient">Mind</span>
                            </span>
                        </Link>
                        <p className="footer-description">
                            AI-powered document intelligence for modern teams. Analyze, understand, and extract insights from your documents effortlessly.
                        </p>
                    </div>

                    <div className="footer-links-group">
                        <h4 className="footer-heading">Product</h4>
                        <ul className="footer-links">
                            <li><Link to="/">Features</Link></li>
                            <li><Link to="/">Pricing</Link></li>
                            <li><Link to="/">Integrations</Link></li>
                            <li><Link to="/">API</Link></li>
                        </ul>
                    </div>

                    <div className="footer-links-group">
                        <h4 className="footer-heading">Company</h4>
                        <ul className="footer-links">
                            <li><Link to="/">About</Link></li>
                            <li><Link to="/">Blog</Link></li>
                            <li><Link to="/">Careers</Link></li>
                            <li><Link to="/">Contact</Link></li>
                        </ul>
                    </div>

                    <div className="footer-links-group">
                        <h4 className="footer-heading">Legal</h4>
                        <ul className="footer-links">
                            <li><Link to="/">Privacy</Link></li>
                            <li><Link to="/">Terms</Link></li>
                            <li><Link to="/">Security</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p className="footer-copyright">
                        © {currentYear} DocuMind. All rights reserved.
                    </p>
                    <div className="footer-social">
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer-social-link">
                            <FiGithub />
                        </a>
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="footer-social-link">
                            <FiTwitter />
                        </a>
                        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="footer-social-link">
                            <FiLinkedin />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
