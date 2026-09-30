import SKU from "../../models/cargo-models/sku.js";
import InventoryItem from "../../models/inventory-models/inventory-item.js";
import CargoManifest from "../../models/cargo-models/cargo-menifest.js";

/**
 * Get all SKUs with search, category and status filtering
 */
export const getSKUs = async (req, res) => {
  try {

    const { category, status, trackingType, search } = req.query;
    const filter = {};

    if (category && category !== "ALL") {
      filter.category = category.toUpperCase();
    }

    if (status && status !== "ALL") {
      filter.status = status.toUpperCase();
    }

    if (trackingType && trackingType !== "ALL") {
      filter.trackingType = trackingType.toUpperCase();
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { skuCode: new RegExp(q, "i") },
        { itemName: new RegExp(q, "i") },
        { description: new RegExp(q, "i") },
        { manufacturer: new RegExp(q, "i") },
        { model: new RegExp(q, "i") }
      ];
    }

    const skus = await SKU.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: skus.length,
      skus
    });
  } catch (error) {
    console.error("Get SKUs error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch SKUs"
    });
  }
};

/**
 * Get SKU by ID or Code
 */
export const getSKUById = async (req, res) => {
  try {
    const { id } = req.params;
    let sku = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      sku = await SKU.findById(id);
    }
    if (!sku) {
      sku = await SKU.findOne({ skuCode: id.toUpperCase() });
    }

    if (!sku) {
      return res.status(404).json({
        success: false,
        message: "SKU item not found"
      });
    }

    return res.status(200).json({
      success: true,
      sku
    });
  } catch (error) {
    console.error("Get SKU error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch SKU details"
    });
  }
};

/**
 * Create a new SKU (By Cargo Officer, Inventory Head, or Admin)
 */
export const createSKU = async (req, res) => {
  try {
    const {
      skuCode,
      itemName,
      category,
      subcategory,
      description,
      unit,
      manufacturer,
      model,
      defaultDimensions,
      defaultWeightKg,
      unitDeclaredValue,
      trackingType,
      storageType,
      temperatureRequirement,
      isHazardous,
      minStockLevel,
      reorderLevel,
      maxStockLevel,
      status
    } = req.body;

    if (!skuCode || !itemName || !category) {
      return res.status(400).json({
        success: false,
        message: "SKU Code, Item Name, and Category are required."
      });
    }

    const cleanCode = skuCode.trim().toUpperCase();

    // Check duplicate code
    const existing = await SKU.findOne({ skuCode: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `SKU with code '${cleanCode}' already exists in the catalog.`
      });
    }

    const newSKU = await SKU.create({
      skuCode: cleanCode,
      itemName: itemName.trim(),
      category: category.toUpperCase(),
      subcategory: subcategory ? subcategory.trim() : "",
      description: description ? description.trim() : "",
      unit: unit ? unit.toUpperCase() : "PCS",
      manufacturer: manufacturer ? manufacturer.trim() : "",
      model: model ? model.trim() : "",
      defaultDimensions: defaultDimensions || { length: 0, width: 0, height: 0, unit: "cm" },
      defaultWeightKg: Number(defaultWeightKg) || 0,
      unitDeclaredValue: Number(unitDeclaredValue) || 0,
      trackingType: trackingType === "SERIALIZED" ? "SERIALIZED" : "QUANTITY_BASED",
      storageType: storageType || "GENERAL",
      temperatureRequirement: temperatureRequirement || "AMBIENT",
      isHazardous: Boolean(isHazardous),
      minStockLevel: Number(minStockLevel) || 5,
      reorderLevel: Number(reorderLevel) || 10,
      maxStockLevel: Number(maxStockLevel) || 100,
      status: status || "ACTIVE",
      createdBy: req.user?.userId
    });

    return res.status(201).json({
      success: true,
      message: `SKU '${cleanCode}' created successfully.`,
      sku: newSKU
    });
  } catch (error) {
    console.error("Create SKU error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create SKU"
    });
  }
};

/**
 * Update SKU
 */
export const updateSKU = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.skuCode) {
      updates.skuCode = updates.skuCode.trim().toUpperCase();
      const existing = await SKU.findOne({ skuCode: updates.skuCode, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Another SKU already uses code '${updates.skuCode}'.`
        });
      }
    }

    const updated = await SKU.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "SKU not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "SKU updated successfully",
      sku: updated
    });
  } catch (error) {
    console.error("Update SKU error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update SKU"
    });
  }
};

/**
 * Get Comprehensive SKU Inventory Master Summary
 * Calculates Available, In Transit, Reserved, Low Stock, etc.
 */
export const getSKUInventorySummary = async (req, res) => {
  try {
    const allSKUs = await SKU.find().lean();
    const allManifests = await CargoManifest.find().lean();
    const allInventoryItems = await InventoryItem.find().lean();

    // Map in-transit quantities from active manifests
    const inTransitMap = {};
    allManifests.forEach(m => {
      if (["PACKED", "DISPATCHED", "IN_TRANSIT"].includes(m.status)) {
        (m.items || []).forEach(item => {
          const code = (item.skuCode || item.itemCode || "").toUpperCase();
          const qty = Number(item.quantity || item.packageCount || 1);
          inTransitMap[code] = (inTransitMap[code] || 0) + qty;
        });
      }
    });

    // Map inventory items
    const inventoryMap = {};
    allInventoryItems.forEach(inv => {
      const code = (inv.itemCode || "").toUpperCase();
      if (!inventoryMap[code]) {
        inventoryMap[code] = {
          currentStock: 0,
          inTransitStock: 0,
          reservedStock: 0,
          minimumStock: inv.minimumStock || 5,
          criticalStock: inv.criticalStock || 2,
          stationId: inv.stationId
        };
      }
      inventoryMap[code].currentStock += (inv.currentStock || 0);
      inventoryMap[code].inTransitStock += (inv.inTransitStock || 0);
      inventoryMap[code].reservedStock += (inv.reservedStock || 0);
    });

    // Aggregate inventory by SKU
    const inventoryTable = allSKUs.map(sku => {
      const code = sku.skuCode.toUpperCase();
      const inv = inventoryMap[code] || { currentStock: 0, inTransitStock: 0, reservedStock: 0, minimumStock: sku.minStockLevel || 5 };
      const manifestInTransit = inTransitMap[code] || 0;
      const totalInTransit = Math.max(inv.inTransitStock, manifestInTransit);
      const available = inv.currentStock;
      const reserved = inv.reservedStock;
      const reorderLevel = sku.reorderLevel || 10;
      const minStock = sku.minStockLevel || 5;

      let status = "IN_STOCK";
      if (available === 0 && totalInTransit === 0) {
        status = "OUT_OF_STOCK";
      } else if (available <= minStock) {
        status = "LOW_STOCK";
      } else if (available <= reorderLevel) {
        status = "REORDER_SOON";
      }

      return {
        _id: sku._id,
        skuCode: sku.skuCode,
        itemName: sku.itemName,
        category: sku.category,
        unit: sku.unit,
        defaultWeightKg: sku.defaultWeightKg,
        trackingType: sku.trackingType,
        available,
        inTransit: totalInTransit,
        reserved,
        reorderLevel,
        minStockLevel: minStock,
        maxStockLevel: sku.maxStockLevel || 100,
        status,
        skuStatus: sku.status,
        manufacturer: sku.manufacturer,
        model: sku.model
      };
    });

    // Category breakdown
    const categoryStats = {
      SCIENTIFIC: 0,
      MEDICAL: 0,
      ELECTRONICS: 0,
      FOOD: 0,
      SPARES: 0,
      FUEL: 0,
      EQUIPMENT: 0,
      SAFETY: 0,
      PERSONAL: 0,
      GENERAL: 0
    };

    inventoryTable.forEach(row => {
      if (categoryStats[row.category] !== undefined) {
        categoryStats[row.category] += (row.available + row.inTransit);
      } else {
        categoryStats.GENERAL += (row.available + row.inTransit);
      }
    });

    const summaryCards = {
      totalSKUs: allSKUs.length,
      totalInventoryUnits: inventoryTable.reduce((sum, r) => sum + r.available, 0),
      lowStockCount: inventoryTable.filter(r => r.status === "LOW_STOCK").length,
      outOfStockCount: inventoryTable.filter(r => r.status === "OUT_OF_STOCK").length,
      inTransitUnits: inventoryTable.reduce((sum, r) => sum + r.inTransit, 0),
      pendingReceiptsCount: allManifests.filter(m => ["DISPATCHED", "IN_TRANSIT"].includes(m.status)).length
    };

    return res.status(200).json({
      success: true,
      summary: summaryCards,
      categoryStats,
      inventoryTable
    });
  } catch (error) {
    console.error("Get SKU inventory summary error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate SKU inventory summary"
    });
  }
};
