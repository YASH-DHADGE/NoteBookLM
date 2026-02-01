import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
    FiUser,
    FiMail,
    FiLock,
    FiCamera,
    FiTrash2,
    FiCalendar,
    FiSave,
} from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Navbar from '../components/common/Navbar';
import './Profile.css';

const Profile = () => {
    const { user, updateProfile, updatePassword, deleteAccount } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const {
        register: registerProfile,
        handleSubmit: handleProfileSubmit,
        formState: { errors: profileErrors },
    } = useForm({
        defaultValues: {
            name: user?.name || '',
            email: user?.email || '',
        },
    });

    const {
        register: registerPassword,
        handleSubmit: handlePasswordSubmit,
        reset: resetPassword,
        watch,
        formState: { errors: passwordErrors },
    } = useForm();

    const newPassword = watch('newPassword');

    const onProfileSubmit = async (data) => {
        setIsUpdatingProfile(true);
        await updateProfile(data);
        setIsUpdatingProfile(false);
    };

    const onPasswordSubmit = async (data) => {
        setIsUpdatingPassword(true);
        const result = await updatePassword({
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
        });
        setIsUpdatingPassword(false);
        if (result.success) {
            resetPassword();
        }
    };

    const handleDeleteAccount = async () => {
        await deleteAccount();
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="profile-page">
            <Navbar />
            <main className="profile-main">
                <div className="profile-container container">
                    {/* Profile Header */}
                    <section className="profile-header">
                        <div className="profile-avatar-section">
                            <div className="profile-avatar">
                                <img
                                    src={user?.profilePicture}
                                    alt={user?.name}
                                />
                                <button className="avatar-edit-btn">
                                    <FiCamera />
                                </button>
                            </div>
                            <div className="profile-info">
                                <h1 className="profile-name">{user?.name}</h1>
                                <p className="profile-email">{user?.email}</p>
                                <p className="profile-joined">
                                    <FiCalendar /> Joined {formatDate(user?.createdAt)}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Tabs */}
                    <div className="profile-tabs">
                        <button
                            className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
                            onClick={() => setActiveTab('profile')}
                        >
                            <FiUser /> Profile
                        </button>
                        <button
                            className={`profile-tab ${activeTab === 'security' ? 'active' : ''}`}
                            onClick={() => setActiveTab('security')}
                        >
                            <FiLock /> Security
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="profile-content">
                        {activeTab === 'profile' && (
                            <div className="profile-card">
                                <div className="card-header">
                                    <h2 className="card-title">Profile Information</h2>
                                    <p className="card-description">
                                        Update your personal information and email address.
                                    </p>
                                </div>
                                <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="profile-form">
                                    <Input
                                        label="Full Name"
                                        type="text"
                                        placeholder="Your name"
                                        icon={<FiUser />}
                                        error={profileErrors.name?.message}
                                        {...registerProfile('name', {
                                            required: 'Name is required',
                                            minLength: {
                                                value: 2,
                                                message: 'Name must be at least 2 characters',
                                            },
                                        })}
                                    />
                                    <Input
                                        label="Email Address"
                                        type="email"
                                        placeholder="your@email.com"
                                        icon={<FiMail />}
                                        error={profileErrors.email?.message}
                                        {...registerProfile('email', {
                                            required: 'Email is required',
                                            pattern: {
                                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                message: 'Invalid email address',
                                            },
                                        })}
                                    />
                                    <div className="form-actions">
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            isLoading={isUpdatingProfile}
                                            leftIcon={<FiSave />}
                                        >
                                            Save Changes
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <>
                                <div className="profile-card">
                                    <div className="card-header">
                                        <h2 className="card-title">Change Password</h2>
                                        <p className="card-description">
                                            Ensure your account is using a strong password.
                                        </p>
                                    </div>
                                    <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="profile-form">
                                        <Input
                                            label="Current Password"
                                            type="password"
                                            placeholder="Enter current password"
                                            icon={<FiLock />}
                                            error={passwordErrors.currentPassword?.message}
                                            {...registerPassword('currentPassword', {
                                                required: 'Current password is required',
                                            })}
                                        />
                                        <Input
                                            label="New Password"
                                            type="password"
                                            placeholder="Enter new password"
                                            icon={<FiLock />}
                                            error={passwordErrors.newPassword?.message}
                                            {...registerPassword('newPassword', {
                                                required: 'New password is required',
                                                minLength: {
                                                    value: 6,
                                                    message: 'Password must be at least 6 characters',
                                                },
                                            })}
                                        />
                                        <Input
                                            label="Confirm New Password"
                                            type="password"
                                            placeholder="Confirm new password"
                                            icon={<FiLock />}
                                            error={passwordErrors.confirmPassword?.message}
                                            {...registerPassword('confirmPassword', {
                                                required: 'Please confirm your password',
                                                validate: (value) =>
                                                    value === newPassword || 'Passwords do not match',
                                            })}
                                        />
                                        <div className="form-actions">
                                            <Button
                                                type="submit"
                                                variant="primary"
                                                isLoading={isUpdatingPassword}
                                                leftIcon={<FiSave />}
                                            >
                                                Update Password
                                            </Button>
                                        </div>
                                    </form>
                                </div>

                                <div className="profile-card danger-zone">
                                    <div className="card-header">
                                        <h2 className="card-title">Danger Zone</h2>
                                        <p className="card-description">
                                            Permanently delete your account and all associated data.
                                        </p>
                                    </div>
                                    <Button
                                        variant="danger"
                                        leftIcon={<FiTrash2 />}
                                        onClick={() => setShowDeleteModal(true)}
                                    >
                                        Delete Account
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3 className="modal-title">Delete Account</h3>
                        <p className="modal-description">
                            Are you sure you want to delete your account? This action cannot be undone
                            and all your data will be permanently removed.
                        </p>
                        <div className="modal-actions">
                            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={handleDeleteAccount}>
                                Delete Account
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
