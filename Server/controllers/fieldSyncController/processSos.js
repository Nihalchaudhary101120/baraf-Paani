import SOS from "../../models/emergency-models/sos.js";
import FieldExcursion from "../../models/field-operation-models/fieldExcursion.js";
import IncidentEvent from "../../models/emergency-models/incidentEvent.js";

const processSOS = async (event, session) => {

  // Prevent duplicate sync
  const existingSOS = await SOS.findOne({
    eventId: event.eventId
  }).session(session);

  if (existingSOS) {
    return existingSOS;
  }

  // Validate excursion if provided
  if (event.excursionId) {

    const excursion = await FieldExcursion.findById(
      event.excursionId
    ).session(session);

    if (!excursion) {
      throw new Error("Field excursion not found.");
    }

  }

  const sos = await SOS.create(
    [{
      eventId: event.eventId,

      sosNumber: event.sosNumber,

      expeditionId: event.expeditionId,

      stationId: event.stationId,

      excursionId: event.excursionId,

      personnelId: event.personnelId,

      emergencyType: event.emergencyType,

      severity: event.severity,

      location: event.location,

      description: event.description,

      deviceId: event.deviceId,

      offlineCreated: true,

      syncStatus: "SYNCED",

      status: "OPEN"
    }],
    { session }
  );

  // Automatically start incident timeline
  await IncidentEvent.create(
    [{
      sosId: sos[0]._id,

      eventType: "SOS_RECEIVED",

      performedBy: event.personnelId,

      description: "Emergency SOS received.",

      location: event.location
    }],
    { session }
  );

  return sos[0];

};

export default processSOS;