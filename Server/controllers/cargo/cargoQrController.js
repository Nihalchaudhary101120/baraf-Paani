import QRCode from "qrcode";
import mongoose from "mongoose";
import CargoManifest from "../../models/cargo-models/cargo-menifest.js";
import CargoCheckpoint from "../../models/cargo-models/cargo-checkpoint.js";

/**
 * Helper to get public scan base URL
 */
const getScanBaseUrl = () => {
  const envUrl = process.env.FRONTEND_URL || process.env.APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  return "http://localhost:5173";
};

/**
 * Generate unique tracking code format: NR-CRG-XXXXXX
 */
const generateTrackingCode = (itemCode) => {
  if (itemCode && itemCode.startsWith("BOX-")) {
    return `NR-${itemCode}`;
  }
  const hash = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `NR-CRG-${hash}`;
};

/**
 * 1. Bulk Generate QR codes for all items in a Cargo Manifest
 * POST /api/cargo/manifests/:manifestId/generate-qr
 */
export const generateManifestQRs = async (req, res) => {
  try {
    const { manifestId } = req.params;
    let manifest = null;

    if (mongoose.Types.ObjectId.isValid(manifestId)) {
      manifest = await CargoManifest.findById(manifestId)
        .populate("destination")
        .populate("expeditionId")
        .populate("shipmentId");
    }
    if (!manifest) {
      manifest = await CargoManifest.findOne({ manifestNumber: manifestId.toUpperCase() })
        .populate("destination")
        .populate("expeditionId")
        .populate("shipmentId");
    }

    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: "Cargo Manifest not found"
      });
    }

    if (!manifest.items || manifest.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Manifest contains no cargo items to generate QRs for"
      });
    }

    const scanBaseUrl = getScanBaseUrl();
    const generatedItems = [];

    for (let item of manifest.items) {
      if (!item.trackingCode) {
        item.trackingCode = generateTrackingCode(item.boxCode || item.itemCode);
      }

      // Stable URL pointer stored in DB
      const scanUrl = `${scanBaseUrl}/scan/cargo/${item.trackingCode}`;
      item.qrCode = scanUrl;

      // High error correction (H) SVG & DataURL for preview & printing
      const qrDataUrl = await QRCode.toDataURL(scanUrl, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 320,
        color: { dark: "#0F172A", light: "#FFFFFF" }
      });

      const qrSvg = await QRCode.toString(scanUrl, {
        type: "svg",
        errorCorrectionLevel: "H",
        margin: 2,
        color: { dark: "#0F172A", light: "#FFFFFF" }
      });

      generatedItems.push({
        _id: item._id,
        itemCode: item.itemCode,
        boxCode: item.boxCode || item.itemCode,
        skuCode: item.skuCode || "GENERAL",
        itemName: item.itemName || item.description,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        weightKg: item.weightKg,
        trackingCode: item.trackingCode,
        qrCodeUrl: scanUrl,
        qrDataUrl,
        qrSvg,
        status: item.status || manifest.status,
        destination: manifest.destination?.name || "Polar Station",
        manifestNumber: manifest.manifestNumber
      });
    }

    await manifest.save();

    return res.status(200).json({
      success: true,
      message: `QR codes generated successfully for ${generatedItems.length} items in manifest ${manifest.manifestNumber}`,
      items: generatedItems,
      manifestNumber: manifest.manifestNumber
    });
  } catch (error) {
    console.error("Bulk generate QR error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate QR codes for manifest"
    });
  }
};

/**
 * 2. Generate/Refresh QR Code for a Single Cargo Item
 * POST /api/cargo/manifests/:manifestId/items/:itemCode/qr
 */
export const generateSingleItemQR = async (req, res) => {
  try {
    const { manifestId, itemCode } = req.params;

    let manifest = null;
    if (mongoose.Types.ObjectId.isValid(manifestId)) {
      manifest = await CargoManifest.findById(manifestId)
        .populate("destination")
        .populate("expeditionId")
        .populate("shipmentId");
    }
    if (!manifest) {
      manifest = await CargoManifest.findOne({ manifestNumber: manifestId.toUpperCase() })
        .populate("destination")
        .populate("expeditionId")
        .populate("shipmentId");
    }

    if (!manifest) {
      return res.status(404).json({ success: false, message: "Cargo Manifest not found" });
    }

    const item = manifest.items.find(
      i => i.itemCode === itemCode || i._id.toString() === itemCode || i.boxCode === itemCode
    );

    if (!item) {
      return res.status(404).json({ success: false, message: "Cargo item not found in manifest" });
    }

    if (!item.trackingCode) {
      item.trackingCode = generateTrackingCode(item.boxCode || item.itemCode);
    }

    const scanBaseUrl = getScanBaseUrl();
    const scanUrl = `${scanBaseUrl}/scan/cargo/${item.trackingCode}`;
    item.qrCode = scanUrl;

    await manifest.save();

    const qrDataUrl = await QRCode.toDataURL(scanUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 320,
      color: { dark: "#0F172A", light: "#FFFFFF" }
    });

    const qrSvg = await QRCode.toString(scanUrl, {
      type: "svg",
      errorCorrectionLevel: "H",
      margin: 2,
      color: { dark: "#0F172A", light: "#FFFFFF" }
    });

    return res.status(200).json({
      success: true,
      message: `QR code generated for ${item.itemCode}`,
      item: {
        _id: item._id,
        itemCode: item.itemCode,
        boxCode: item.boxCode || item.itemCode,
        skuCode: item.skuCode,
        itemName: item.itemName,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        weightKg: item.weightKg,
        trackingCode: item.trackingCode,
        qrCodeUrl: scanUrl,
        qrDataUrl,
        qrSvg,
        status: item.status,
        destination: manifest.destination?.name || "Polar Station",
        manifestNumber: manifest.manifestNumber
      }
    });
  } catch (error) {
    console.error("Single item QR error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate QR code" });
  }
};

/**
 * 3. Scan & Lookup Cargo Item (Real-Time Source of Truth)
 * GET /api/cargo/scan/:trackingCode
 */
export const getScanCargoInfo = async (req, res) => {
  try {
    const { trackingCode } = req.params;
    if (!trackingCode) {
      return res.status(400).json({ success: false, message: "Tracking code parameter is required" });
    }

    const cleanCode = trackingCode.trim();

    // Query manifest containing matching trackingCode, _id, itemCode, or boxCode
    const filterConditions = [
      { "items.trackingCode": cleanCode },
      { "items.itemCode": cleanCode.toUpperCase() },
      { "items.boxCode": cleanCode.toUpperCase() }
    ];

    if (mongoose.Types.ObjectId.isValid(cleanCode)) {
      filterConditions.push({ "items._id": new mongoose.Types.ObjectId(cleanCode) });
    }

    const manifest = await CargoManifest.findOne({ $or: filterConditions })
      .populate("expeditionId")
      .populate("destination")
      .populate("shipmentId")
      .populate("createdBy", "name role");

    if (!manifest) {
      return res.status(404).json({
        success: false,
        message: `No active cargo box found matching scan code '${cleanCode}'`
      });
    }

    const item = manifest.items.find(
      i =>
        i.trackingCode === cleanCode ||
        i.itemCode?.toUpperCase() === cleanCode.toUpperCase() ||
        i.boxCode?.toUpperCase() === cleanCode.toUpperCase() ||
        i._id.toString() === cleanCode
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Cargo item details missing for code '${cleanCode}'`
      });
    }

    // Fetch checkpoint scans for this item
    const checkpoints = await CargoCheckpoint.find({
      $or: [
        { boxCode: item.itemCode },
        { boxCode: item.boxCode },
        { itemCode: item.itemCode }
      ]
    }).sort({ timestamp: -1 });

    const scanBaseUrl = getScanBaseUrl();
    const activeTrackingCode = item.trackingCode || item.itemCode;
    const scanUrl = `${scanBaseUrl}/scan/cargo/${activeTrackingCode}`;

    // Generate QR DataURL for visual verification
    const qrDataUrl = await QRCode.toDataURL(scanUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 300,
      color: { dark: "#0F172A", light: "#FFFFFF" }
    });

    const qrSvg = await QRCode.toString(scanUrl, {
      type: "svg",
      errorCorrectionLevel: "H",
      margin: 2,
      color: { dark: "#0F172A", light: "#FFFFFF" }
    });

    return res.status(200).json({
      success: true,
      cargo: {
        itemId: item._id,
        trackingCode: activeTrackingCode,
        itemCode: item.itemCode,
        boxCode: item.boxCode || item.itemCode,
        skuCode: item.skuCode || "GENERAL",
        skuId: item.skuId,
        itemName: item.itemName || item.description,
        description: item.description,
        category: item.category,
        make: item.make || item.manufacturer,
        model: item.model,
        serialNumber: item.serialNumber,
        serialNumbers: item.serialNumbers || [],
        quantity: item.quantity || 1,
        unit: item.unit || "PCS",
        packageCount: item.packageCount || 1,
        packageType: item.packageType || "BOX",
        weightKg: item.weightKg,
        unitWeightKg: item.unitWeightKg,
        dimensions: item.dimensions || { length: 50, width: 40, height: 30, unit: "cm" },
        unitDeclaredValue: item.unitDeclaredValue,
        declaredValueINR: item.declaredValueINR,
        specialHandling: item.specialHandling || "NORMAL",
        temperatureRequirement: item.temperatureRequirement || "AMBIENT",
        hazardous: Boolean(item.hazardous),
        notes: item.notes || "",
        status: item.status || manifest.status,

        // Parent Manifest Info
        manifestId: manifest._id,
        manifestNumber: manifest.manifestNumber,
        manifestStatus: manifest.status,
        declarationType: manifest.declarationType,

        // Shipment & Expedition Info
        shipmentId: manifest.shipmentId?._id || manifest.shipmentId,
        shipmentNumber: manifest.shipmentId?.shipmentNumber || "SHP-UNASSIGNED",
        vesselName: manifest.shipmentId?.vessel || manifest.shipmentId?.vesselName || "Antarctic Carrier",
        expeditionName: manifest.expeditionId?.name || manifest.expeditionId?.expeditionCode || "NCPOR Polar Expedition",
        origin: manifest.origin || "Goa Port",
        destination: manifest.destination?.name || "Bharati Station",

        // QR references
        qrCodeUrl: scanUrl,
        qrDataUrl,
        qrSvg
      },
      checkpoints
    });
  } catch (error) {
    console.error("Cargo scan error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve cargo scan data"
    });
  }
};
