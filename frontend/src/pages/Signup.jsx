import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FiUser, FiMail, FiLock, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Navbar from '../components/common/Navbar';
import './Auth.css';

const Signup = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { register: registerUser } = useAuth();
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm();

    const password = watch('password');

    const onSubmit = async (data) => {
        setIsLoading(true);
        const result = await registerUser({
            name: data.name,
            email: data.email,
            password: data.password,
        });
        setIsLoading(false);

        if (result.success) {
            navigate('/dashboard');
        }
    };

    return (
        <div className="auth-page">
            <Navbar />
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <h1 className="auth-title">Create Account</h1>
                        <p className="auth-subtitle">
                            Start your free 14-day trial today
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
                        <Input
                            label="Full Name"
                            type="text"
                            placeholder="John Doe"
                            icon={<FiUser />}
                            error={errors.name?.message}
                            {...register('name', {
                                required: 'Name is required',
                                minLength: {
                                    value: 2,
                                    message: 'Name must be at least 2 characters',
                                },
                                maxLength: {
                                    value: 50,
                                    message: 'Name cannot exceed 50 characters',
                                },
                            })}
                        />

                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="you@example.com"
                            icon={<FiMail />}
                            error={errors.email?.message}
                            {...register('email', {
                                required: 'Email is required',
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: 'Invalid email address',
                                },
                            })}
                        />

                        <Input
                            label="Password"
                            type="password"
                            placeholder="Create a password"
                            icon={<FiLock />}
                            error={errors.password?.message}
                            {...register('password', {
                                required: 'Password is required',
                                minLength: {
                                    value: 6,
                                    message: 'Password must be at least 6 characters',
                                },
                            })}
                        />

                        <Input
                            label="Confirm Password"
                            type="password"
                            placeholder="Confirm your password"
                            icon={<FiLock />}
                            error={errors.confirmPassword?.message}
                            {...register('confirmPassword', {
                                required: 'Please confirm your password',
                                validate: (value) =>
                                    value === password || 'Passwords do not match',
                            })}
                        />

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            fullWidth
                            isLoading={isLoading}
                            rightIcon={<FiArrowRight />}
                        >
                            Create Account
                        </Button>
                    </form>

                    <p className="auth-terms">
                        By creating an account, you agree to our{' '}
                        <Link to="/">Terms of Service</Link> and{' '}
                        <Link to="/">Privacy Policy</Link>
                    </p>

                    <div className="auth-divider">
                        <span>or</span>
                    </div>

                    <p className="auth-switch">
                        Already have an account?{' '}
                        <Link to="/login" className="auth-link">
                            Sign in
                        </Link>
                    </p>
                </div>

                <div className="auth-glow" />
            </div>
        </div>
    );
};

export default Signup;
