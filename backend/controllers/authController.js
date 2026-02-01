import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            res.status(400);
            throw new Error('User already exists with this email');
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
        });

        if (user) {
            // Generate token and set cookie
            const token = generateToken(res, user._id);

            res.status(201).json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    profilePicture: user.profilePicture,
                    createdAt: user.createdAt,
                },
                token,
            });
        } else {
            res.status(400);
            throw new Error('Invalid user data');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find user by email and include password
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            res.status(401);
            throw new Error('Invalid email or password');
        }

        // Check password
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            res.status(401);
            throw new Error('Invalid email or password');
        }

        // Generate token and set cookie
        const token = generateToken(res, user._id);

        res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
                createdAt: user.createdAt,
            },
            token,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0),
    });

    res.json({
        success: true,
        message: 'Logged out successfully',
    });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
    res.json({
        success: true,
        data: {
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            profilePicture: req.user.profilePicture,
            createdAt: req.user.createdAt,
            updatedAt: req.user.updatedAt,
        },
    });
};
