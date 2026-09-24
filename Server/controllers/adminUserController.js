import bcrypt from "bcryptjs";
import User from "../models/user.js";
import Personnel from "../models/personnel.js";

const allowedRoles = [
    "HQ_COMMAND",
    "LOGISTICS_OFFICER",
    "STATION_COMMANDER",
    "STATION_OPERATOR",
    "INVENTORY_MANAGER",
    "MEDICAL_OFFICER",
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
            role
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
                message: "Invalid role"
            });
        }

        // Check duplicate employee ID
        const existingEmployee = await User.findOne({ employeeId });

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

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create User account
        const user = await User.create({
            name: name.trim(),
            employeeId: employeeId.trim(),
            email: email.toLowerCase().trim(),
            passwordHash,
            role
        });

        // Create role-specific profile
        switch (role) {
            case  "STATION_OPERATOR" || "INVENTORY_MANAGER" || "SCIENTIST" || "MEDICAL_OFFICER":
                await Personnel.create({
                    userId: user._id,
                });
                break;

            default:
                break;
        }


        return res.status(201).json({
            success: true,
            message: `${role} account created successfully`,
            user: {
                id: user._id,
                name: user.name,
                employeeId: user.employeeId,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Create user error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create user"
        });
    }
};