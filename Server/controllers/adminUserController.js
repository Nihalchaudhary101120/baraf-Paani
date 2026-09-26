import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/master-models/user.js";
import Personnel from "../models/master-models/personnel.js";
import { sendAccountEmail } from "../services/emailService.js";

const allowedRoles = [
    "HQ_ADMIN",
    "HQ_COMMAND",
    "LOGISTICS_OFFICER",
    "STATION_COMMANDER",
    "STATION_OPERATOR",
    "INVENTORY_MANAGER",
    "MEDICAL_OFFICER",
    "CARGO_OFFICER",
    "SHIP_OFFICER",
    "FLIGHT_OFFICER",
    "SCIENTIST"
];

export const createUserByAdmin = async (req, res) => {
    try {
        const {
            name,
            employeeId,
            email,
            password,
            role,
            phone,
            designation,
            organization,
            stationId,
            permissions
        } = req.body;

        // Validate required fields
        if (!name || !employeeId || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Name, employeeId, email, password and role are required"
            });
        }

        // Validate role
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Invalid role. Must be one of: ${allowedRoles.join(", ")}`
            });
        }

        // Check duplicate employee ID
        const existingEmployee = await User.findOne({ employeeId: employeeId.trim().toUpperCase() });

        if (existingEmployee) {
            return res.status(409).json({
                success: false,
                message: "Employee ID already exists"
            });
        }

        // Check duplicate email
        const existingEmail = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: "Email already exists"
            });
        }

        // Validate stationId — must be a valid 24-character MongoDB ObjectId or null
        const validStationId = (stationId && mongoose.Types.ObjectId.isValid(stationId)) ? stationId : null;

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create User account in Database
        const user = await User.create({
            name: name.trim(),
            employeeId: employeeId.trim().toUpperCase(),
            email: email.toLowerCase().trim(),
            password: passwordHash,
            role,
            phone: phone ? phone.trim() : undefined,
            designation: designation ? designation.trim() : undefined,
            organization: organization ? organization.trim() : undefined,
            stationId: validStationId,
            permissions: Array.isArray(permissions) ? permissions : []
        });

        // Create role-specific Personnel profile for field/station members
        const personnelRoles = ["STATION_OPERATOR", "INVENTORY_MANAGER", "SCIENTIST", "MEDICAL_OFFICER", "STATION_COMMANDER"];
        if (personnelRoles.includes(role)) {
            await Personnel.create({
                userId: user._id,
                name: user.name,
                employeeId: user.employeeId,
                email: user.email,
                role: user.role,
                designation: user.designation,
                organization: user.organization,
                assignedStation: validStationId
            }).catch(err => console.error("Personnel profile auto-create soft error:", err.message));
        }

        // Send automated welcome email with login details (email, employeeId, password, role)
        sendAccountEmail({
            name: user.name,
            email: user.email,
            employeeId: user.employeeId,
            password,
            role: user.role
        }).catch(error => {
            console.error(
                "Account email dispatch error:",
                error
            );
        });

        return res.status(201).json({
            success: true,
            message: `${role} account created successfully`,
            user: {
                _id: user._id,
                id: user._id,
                name: user.name,
                employeeId: user.employeeId,
                email: user.email,
                role: user.role,
                designation: user.designation,
                organization: user.organization,
                phone: user.phone,
                stationId: user.stationId,
                isActive: user.isActive,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error("Create user error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create user"
        });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .populate("stationId", "name code stationType")
            .select("-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error("Get users error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch users"
        });
    }
};

export const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.isActive = !user.isActive;
        await user.save();

        return res.status(200).json({
            success: true,
            message: `User account ${user.isActive ? "activated" : "deactivated"} successfully`,
            user: {
                id: user._id,
                name: user.name,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error("Toggle user status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update user status"
        });
    }
};