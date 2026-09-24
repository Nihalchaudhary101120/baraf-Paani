import Personnel from "../models/personnel.js";

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

        const personnel = await Personnel.findOne({ userId });

        if (!personnel) {
            return res.status(404).json({
                success: false,
                message: "Personnel profile not found"
            });
        }

        personnel.dateOfBirth = dateOfBirth;
        personnel.gender = gender;
        personnel.nationality = nationality;
        personnel.maritalStatus = maritalStatus;
        personnel.profilePhoto = profilePhoto;

        if (contact) {
            personnel.contact = {
                ...personnel.contact?.toObject?.(),
                ...contact,
                residentialAddress: {
                    ...personnel.contact?.residentialAddress?.toObject?.(),
                    ...contact.residentialAddress
                }
            };
        }

        if (passport) {
            personnel.passport = {
                ...personnel.passport?.toObject?.(),
                ...passport
            };
        }

        if (emergencyContact) {
            personnel.emergencyContact = {
                ...personnel.emergencyContact?.toObject?.(),
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

        return res.status(500).json({
            success: false,
            message: "Failed to update personnel profile"
        });
    }
};