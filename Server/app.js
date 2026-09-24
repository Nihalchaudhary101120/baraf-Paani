import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import personnelRoutes from "./routes/personnelRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import medicalRoutes from "./routes/medicalRoutes.js";
import trainingRoutes from "./routes/trainingRoutes.js";
import cargoCheckpointRoutes from "./routes/cargoRoutes/cargoCheckpointRoutes.js";
import cargoManifestRoutes from "./routes/cargoRoutes/cargoMenifestRoutes.js";
import shipmentRoutes from "./routes/cargoRoutes/shipmentRoutes.js";
import syncRoutes from "./routes/syncRoutes.js";

dotenv.config();
const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
      ].filter(Boolean);

      if (allowedOrigins.includes(origin) || origin.startsWith("http://localhost:")) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Nirantra API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/personnel", personnelRoutes);
app.use("/api/medical", medicalRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cargo/manifests", cargoManifestRoutes);
app.use("/api/cargo/shipments", shipmentRoutes);
app.use("/api/cargo/checkpoints", cargoCheckpointRoutes);
app.use("/api/sync",syncRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();