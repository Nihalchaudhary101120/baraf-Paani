import ExcursionEquipment from "../../models/field-operation-models/excursionEquipment.js";
import InventoryItem from "../../models/inventory-models/inventory-item.js";
import InventoryTransaction from "../../models/inventory-models/inventory-transaction.js";

const processEquipmentReturn = async (event, session) => {

  const equipment = await ExcursionEquipment.findById(
    event.excursionEquipmentId
  ).session(session);

  if (!equipment) {
    throw new Error("Excursion equipment record not found.");
  }

  const remaining =
    equipment.quantityIssued - equipment.quantityReturned;

  if (event.quantityReturned > remaining) {
    throw new Error("Returned quantity exceeds issued quantity.");
  }

  equipment.quantityReturned += event.quantityReturned;

  if (equipment.quantityReturned === equipment.quantityIssued) {
    equipment.returnedAt = event.returnedAt || new Date();
  }

  equipment.returnCondition =
    event.returnCondition || "GOOD";

  equipment.syncStatus = "SYNCED";

  await equipment.save({ session });

  const inventoryItem = await InventoryItem.findById(
    equipment.inventoryItemId
  ).session(session);

  if (!inventoryItem) {
    throw new Error("Inventory item not found.");
  }

  inventoryItem.currentStock += event.quantityReturned;

  if (inventoryItem.currentStock <= 0) {

    inventoryItem.status = "OUT_OF_STOCK";

  } else if (
    inventoryItem.currentStock <= inventoryItem.criticalStock
  ) {

    inventoryItem.status = "CRITICAL";

  } else if (
    inventoryItem.currentStock <= inventoryItem.minimumStock
  ) {

    inventoryItem.status = "LOW_STOCK";

  } else {

    inventoryItem.status = "AVAILABLE";

  }

  await inventoryItem.save({ session });

  await InventoryTransaction.create([{

    eventId: event.eventId,

    transactionNumber: `RET-${Date.now()}`,

    inventoryItemId: inventoryItem._id,

    stationId: event.stationId,

    expeditionId: event.expeditionId,

    transactionType: "CHECKIN",

    quantity: event.quantityReturned,

    balanceAfterTransaction: inventoryItem.currentStock,

    performedBy: event.performedBy,

    deviceId: event.deviceId,

    offlineCreated: true,

    syncStatus: "SYNCED",

    remarks: event.remarks

  }], { session });

};

export default processEquipmentReturn;