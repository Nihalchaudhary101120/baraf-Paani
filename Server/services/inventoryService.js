
import InventoryItem from "../models/inventory-models/inventory-item.js";
import InventoryTransaction from "../models/inventory-models/inventory-transaction.js";

export const receiveInventory = async (data) => {

  const item = await InventoryItem.findById(data.inventoryItemId);

  if (!item) throw new Error("Inventory item not found");

  item.currentStock += data.quantity;

  if (item.currentStock <= item.criticalStock) {
    item.status = "CRITICAL";
  } else if (item.currentStock <= item.minimumStock) {
    item.status = "LOW_STOCK";
  } else {
    item.status = "AVAILABLE";
  }

  await item.save();

  const transaction = await InventoryTransaction.create({
    ...data,
    transactionType: "RECEIPT",
    balanceAfterTransaction: item.currentStock
  });

  return transaction;
};

export const consumeInventory = async (data) => {

  const item = await InventoryItem.findById(data.inventoryItemId);

  if (!item) throw new Error("Inventory item not found");

  if (item.currentStock < data.quantity) {
    throw new Error("Insufficient stock");
  }

  item.currentStock -= data.quantity;

  if (item.currentStock === 0) {
    item.status = "OUT_OF_STOCK";
  } else if (item.currentStock <= item.criticalStock) {
    item.status = "CRITICAL";
  } else if (item.currentStock <= item.minimumStock) {
    item.status = "LOW_STOCK";
  } else {
    item.status = "AVAILABLE";
  }

  await item.save();

  const transaction = await InventoryTransaction.create({
    ...data,
    transactionType: "CONSUMPTION",
    balanceAfterTransaction: item.currentStock
  });

  return transaction;
};

