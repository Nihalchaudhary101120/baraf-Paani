import FieldExcursion from "../../models/field-operation-models/fieldExcursion.js";
import FieldCheckIn from "../../models/field-operation-models/fieldCheckIns.js";

const processFieldCheckIn = async (event, session) => {

  // Prevent duplicate sync
  const existingCheckIn = await FieldCheckIn.findOne({
    eventId: event.eventId
  }).session(session);

  if (existingCheckIn) {
    return existingCheckIn;
  }

  // Excursion must exist
  const excursion = await FieldExcursion.findById(
    event.excursionId
  ).session(session);

  if (!excursion) {
    throw new Error("Field excursion not found.");
  }

  // Team should still be in the field
  if (excursion.status !== "ACTIVE") {
    throw new Error("Check-in is allowed only for ACTIVE excursions.");
  }

  const checkIn = await FieldCheckIn.create(
    [{
      eventId: event.eventId,

      excursionId: event.excursionId,

      personnelId: event.personnelId,

      location: event.location,

      temperature: event.temperature,

      batteryLevel: event.batteryLevel,

      networkAvailable: event.networkAvailable,

      weatherObserved: event.weatherObserved,

      notes: event.notes,

      deviceId: event.deviceId,

      offlineCreated: true,

      syncStatus: "SYNCED"
    }],
    { session }
  );

  return checkIn[0];
};

export default processFieldCheckIn;