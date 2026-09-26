import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import User from "../models/master-models/user.js";

dotenv.config({
    path: "../.env",
});

const createAdmin = async () => {
    try {
        await connectDB();

        const existingAdmin = await User.findOne({
            employeeId: "AEMS-ADMIN-001",
        });

        if (existingAdmin) {
            console.log("Admin already exists");
            process.exit(0);
        }

        const passwordHash = await bcrypt.hash("123456", 12);

        await User.create({
            employeeId: "AEMS-ADMIN-001",
            name: "Ayush dada",
            email: "vashisthayush099@gmail.com",
            password: passwordHash,
            designation: "System Administrator",
            organization: "NCPOR",
            role: "HQ_ADMIN",
            permissions: ["*"],
        });

        console.log("HQ Admin created successfully");

        process.exit(0);
    } catch (error) {
        console.error("Admin creation failed:", error);
        process.exit(1);
    }
};

createAdmin();