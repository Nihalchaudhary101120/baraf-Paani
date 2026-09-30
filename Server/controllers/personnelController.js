import Personnel from "../models/master-models/personnel.js";
import User from "../models/master-models/user.js";

export const getMyProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const personnel = await Personnel.findOne({ userId });

        if (!personnel) {
            return res.status(404).json({
                success: false,
                message: "Personnel profile not found"
            });
        }

        return res.status(200).json({ success: true, personnel });
    } catch (error) {
        console.error("Get personnel profile error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch personnel profile" });
    }
};

export const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            dateOfBirth,
            gender,
            nationality,
            maritalStatus,
            profilePhoto,
            contact,
            passport,
            emergencyContact
        } = req.body;

        let personnel = await Personnel.findOne({ userId });

        if (!personnel) {
            personnel = new Personnel({ userId });
        }

        if (dateOfBirth) {
            personnel.dateOfBirth = new Date(dateOfBirth);
        } else if (dateOfBirth === "") {
            personnel.dateOfBirth = undefined;
        }

        if (gender) personnel.gender = gender;
        if (nationality) personnel.nationality = nationality;
        if (maritalStatus) personnel.maritalStatus = maritalStatus;
        if (profilePhoto) personnel.profilePhoto = profilePhoto;

        if (contact) {
            personnel.contact = {
                ...(personnel.contact?.toObject?.() || {}),
                ...contact,
                residentialAddress: {
                    ...(personnel.contact?.residentialAddress?.toObject?.() || {}),
                    ...(contact.residentialAddress || {})
                }
            };
        }

        if (passport) {
            const cleanPassport = { ...passport };
            if (!cleanPassport.passportNumber || !cleanPassport.passportNumber.trim()) {
                cleanPassport.passportNumber = undefined;
            } else {
                cleanPassport.passportNumber = cleanPassport.passportNumber.trim().toUpperCase();
            }
            if (!cleanPassport.issueDate) cleanPassport.issueDate = undefined;
            if (!cleanPassport.expiryDate) cleanPassport.expiryDate = undefined;

            personnel.passport = {
                ...(personnel.passport?.toObject?.() || {}),
                ...cleanPassport
            };
            if (!cleanPassport.passportNumber) {
                personnel.passport.passportNumber = undefined;
            }
        }

        if (emergencyContact) {
            personnel.emergencyContact = {
                ...(personnel.emergencyContact?.toObject?.() || {}),
                ...emergencyContact
            };
        }

        personnel.profileStatus = "COMPLETED";

        await personnel.save();

        return res.status(200).json({
            success: true,
            message: "Personnel profile updated successfully",
            personnel
        });

    } catch (error) {
        console.error("Update personnel profile error:", error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "A personnel record with this passport number already exists. Please verify your passport details."
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update personnel profile"
        });
    }
};

export const getAllPersonnel = async (req, res) => {
    try {
        const { stationId } = req.query;
        let targetStationId = stationId;

        // If caller is Station Operator / Commander, scope to their assigned station
        if (!["HQ_ADMIN", "HQ_COMMAND"].includes(req.user?.role)) {
            let userStationId = req.user?.stationId;
            if (!userStationId) {
                const u = await User.findById(req.user?.userId).select("stationId");
                userStationId = u?.stationId;
                if (!userStationId) {
                    const p = await Personnel.findOne({ userId: req.user?.userId }).select("expedition.assignedStation");
                    userStationId = p?.expedition?.assignedStation;
                }
            }
            if (userStationId) {
                targetStationId = userStationId;
            }
        }

        let query = {};

        if (targetStationId) {
            const usersWithStation = await User.find({ stationId: targetStationId }).select("_id");
            const userIds = usersWithStation.map(u => u._id);
            query = {
                $or: [
                    { "expedition.assignedStation": targetStationId },
                    { userId: { $in: userIds } }
                ]
            };
        }

        const personnel = await Personnel.find(query)
            .populate("userId", "name employeeId email role designation stationId")
            .populate("expedition.assignedStation", "name code")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: personnel.length,
            personnel
        });
    } catch (error) {
        console.error("Get all personnel error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch personnel list"
        });
    }
};