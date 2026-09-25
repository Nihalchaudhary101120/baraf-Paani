import FieldExcursion from "../../models/field-operation-models/fieldExcursion.js";
import ExcursionEquipment from "../../models/field-operation-models/excursionEquipment.js";

const processExcursionEnd = async (event, session) => {

  const excursion = await FieldExcursion.findById(
    event.excursionId
  ).session(session);

  if (!excursion) {
    throw new Error("Field excursion not found.");
  }

  if (excursion.status === "COMPLETED") {
    return excursion;
  }

  if (excursion.status !== "ACTIVE") {
    throw new Error("Only ACTIVE excursions can be completed.");
  }

  excursion.status = "COMPLETED";
  excursion.actualReturnTime =
    event.actualReturnTime || new Date();

  await excursion.save({ session });

  // Get issued equipment for reconciliation
  const equipmentList = await ExcursionEquipment.find({
    excursionId: excursion._id
  }).session(session);

  return {
    excursion,
    equipmentPendingReturn: equipmentList.filter(
      item => item.quantityReturned < item.quantityIssued
    )
  };
};

export default processExcursionEnd;