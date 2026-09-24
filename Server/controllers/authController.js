import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/master-models/user.js";

const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user._id,
            role: user.role,
        },
        process.env.JWT_SECRET || "default_jwt_secret",
        {
            expiresIn: "7d",
        }
    );
};

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim(),
        }).select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        if (user.isActive === false) {
            return res.status(403).json({
                success: false,
                message: "User account is inactive",
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user);

        res.cookie("token", token, cookieOptions);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                employeeId: user.employeeId,
                name: user.name,
                email: user.email,
                phone: user.phone,
                designation: user.designation,
                organization: user.organization,
                role: user.role,
                permissions: user.permissions,
                stationId: user.stationId,
            },
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error during login",
        });
    }
};

export const logout = async (req, res) => {
    try {
        res.clearCookie("token", cookieOptions);

        return res.status(200).json({
            success: true,
            message: "Logout successful",
        });
    } catch (error) {
        console.error("Logout error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error during logout",
        });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-password").populate(
            "stationId",
            "code name stationType"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                employeeId: user.employeeId,
                name: user.name,
                email: user.email,
                phone: user.phone,
                designation: user.designation,
                organization: user.organization,
                role: user.role,
                permissions: user.permissions,
                stationId: user.stationId,
            },
        });
    } catch (error) {
        console.error("Get me error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error fetching user profile",
        });
    }
};