import Station from "../models/master-models/station.js";

// Auto-seed initial stations if DB is empty
const defaultStations = [
  {
    code: "MAITRI",
    name: "Maitri Station (East Antarctica)",
    stationType: "INLAND",
    location: { type: "Point", coordinates: [11.7333, -70.7667], elevationMeters: 130 },
    capacity: { summer: 45, winter: 25, emergency: 60 },
    operationalStatus: "ACTIVE"
  },
  {
    code: "BHARATI",
    name: "Bharati Station (Larsemann Hills)",
    stationType: "COASTAL",
    location: { type: "Point", coordinates: [76.1911, -69.4076], elevationMeters: 35 },
    capacity: { summer: 47, winter: 30, emergency: 65 },
    operationalStatus: "ACTIVE"
  }
];

export const getStations = async (req, res) => {
  try {
    let stations = await Station.find().sort({ name: 1 });

    // Seed defaults if empty
    if (stations.length === 0) {
      stations = await Station.insertMany(defaultStations);
    }

    return res.status(200).json({
      success: true,
      count: stations.length,
      stations
    });
  } catch (error) {
    console.error("Get stations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stations"
    });
  }
};

export const createStation = async (req, res) => {
  try {
    const { code, name, stationType, capacity, location } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: "Station code and name are required"
      });
    }

    const existing = await Station.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Station with code '${code}' already exists`
      });
    }

    const station = await Station.create({
      code: code.toUpperCase().trim(),
      name: name.trim(),
      stationType: stationType || "COASTAL",
      capacity: capacity || { summer: 40, winter: 25, emergency: 50 },
      location: location || { type: "Point", coordinates: [70.0, -70.0], elevationMeters: 100 }
    });

    return res.status(201).json({
      success: true,
      message: "Station created successfully",
      station
    });
  } catch (error) {
    console.error("Create station error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create station"
    });
  }
};
