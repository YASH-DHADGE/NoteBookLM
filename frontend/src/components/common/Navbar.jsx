import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiUser, FiLogOut, FiGrid } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import Button from './Button';
import './Navbar.css';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="navbar-container container">
                <Link to="/" className="navbar-logo">
                    <span className="logo-icon">📄</span>
                    <span className="logo-text">
                        Docu<span className="text-gradient">Mind</span>
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="navbar-links">
                    {isAuthenticated ? (
                        <>
                            <Link to="/dashboard" className="navbar-link">
                                <FiGrid /> Dashboard
                            </Link>
                            <Link to="/profile" className="navbar-link">
                                <FiUser /> Profile
                            </Link>
                            <Button variant="ghost" onClick={handleLogout}>
                                <FiLogOut /> Logout
                            </Button>
                        </>
                    ) : (
                        <>
                            <Link to="/login">
                                <Button variant="ghost">Login</Button>
                            </Link>
                            <Link to="/signup">
                                <Button variant="primary">Get Started</Button>
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="navbar-mobile-toggle"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {isMenuOpen ? <FiX /> : <FiMenu />}
                </button>
            </div>

            {/* Mobile Navigation */}
            <div className={`navbar-mobile ${isMenuOpen ? 'open' : ''}`}>
                {isAuthenticated ? (
                    <>
                        <Link
                            to="/dashboard"
                            className="navbar-mobile-link"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <FiGrid /> Dashboard
                        </Link>
                        <Link
                            to="/profile"
                            className="navbar-mobile-link"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <FiUser /> Profile
                        </Link>
                        <button
                            className="navbar-mobile-link"
                            onClick={() => {
                                handleLogout();
                                setIsMenuOpen(false);
                            }}
                        >
                            <FiLogOut /> Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link
                            to="/login"
                            className="navbar-mobile-link"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Login
                        </Link>
                        <Link
                            to="/signup"
                            className="navbar-mobile-link"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Get Started
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
