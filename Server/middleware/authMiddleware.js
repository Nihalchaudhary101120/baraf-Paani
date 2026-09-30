import jwt from "jsonwebtoken";
import User from "../models/master-models/user.js";
import Personnel from "../models/master-models/personnel.js";

const requireAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please sign in.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret");

    req.user = decoded;

    // Resolve assigned station from existing schema relationship:
    // 1. User.stationId
    // 2. Fallback: User -> Personnel -> expedition.assignedStation
    try {
      const userDoc = await User.findById(decoded.userId).select("stationId role isActive").lean();
      if (userDoc) {
        if (userDoc.isActive === false) {
          return res.status(403).json({
            success: false,
            message: "User account is inactive",
          });
        }
        let stId = userDoc.stationId;
        if (!stId) {
          const personnelDoc = await Personnel.findOne({ userId: decoded.userId }).select("expedition.assignedStation").lean();
          stId = personnelDoc?.expedition?.assignedStation || null;
        }
        req.user.stationId = stId;
        if (userDoc.role) {
          req.user.role = userDoc.role;
        }
      }
    } catch (dbErr) {
      console.error("[requireAuth] Error resolving user station:", dbErr);
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default requireAuth;