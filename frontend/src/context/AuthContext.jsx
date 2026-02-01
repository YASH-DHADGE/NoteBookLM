import { createContext, useState, useEffect } from 'react';
import { authAPI, userAPI } from '../services/api';
import toast from 'react-hot-toast';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check if user is authenticated on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await authAPI.getMe();
            if (response.success) {
                setUser(response.data);
            }
        } catch (error) {
            // User is not authenticated, that's okay
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (data) => {
        try {
            const response = await authAPI.register(data);
            if (response.success) {
                setUser(response.data);
                toast.success('Account created successfully!');
                return { success: true };
            }
        } catch (error) {
            toast.error(error.message);
            return { success: false, error: error.message };
        }
    };

    const login = async (data) => {
        try {
            const response = await authAPI.login(data);
            if (response.success) {
                setUser(response.data);
                toast.success('Welcome back!');
                return { success: true };
            }
        } catch (error) {
            toast.error(error.message);
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        try {
            await authAPI.logout();
            setUser(null);
            toast.success('Logged out successfully');
        } catch (error) {
            // Still log out on frontend even if API fails
            setUser(null);
        }
    };

    const updateProfile = async (data) => {
        try {
            const response = await userAPI.updateProfile(data);
            if (response.success) {
                setUser(response.data);
                toast.success('Profile updated successfully!');
                return { success: true };
            }
        } catch (error) {
            toast.error(error.message);
            return { success: false, error: error.message };
        }
    };

    const updatePassword = async (data) => {
        try {
            const response = await userAPI.updatePassword(data);
            if (response.success) {
                toast.success('Password updated successfully!');
                return { success: true };
            }
        } catch (error) {
            toast.error(error.message);
            return { success: false, error: error.message };
        }
    };

    const deleteAccount = async () => {
        try {
            const response = await userAPI.deleteAccount();
            if (response.success) {
                setUser(null);
                toast.success('Account deleted successfully');
                return { success: true };
            }
        } catch (error) {
            toast.error(error.message);
            return { success: false, error: error.message };
        }
    };

    const value = {
        user,
        isLoading,
        isAuthenticated: !!user,
        register,
        login,
        logout,
        updateProfile,
        updatePassword,
        deleteAccount,
        checkAuth,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
