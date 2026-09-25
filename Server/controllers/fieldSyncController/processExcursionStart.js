import FieldExcursion from "../../models/field-operatio-models/fieldExcursion.js";

const processExcursionStart = async (event, session) => {

  // Prevent duplicate excursion creation
  const existingExcursion = await FieldExcursion.findOne({
    eventId: event.eventId
  }).session(session);

  if (existingExcursion) {
    return existingExcursion;
  }

  const excursion = await FieldExcursion.create(
    [
      {
        eventId: event.eventId,

        excursionNumber: event.excursionNumber,

        expeditionId: event.expeditionId,

        stationId: event.stationId,

        leaderId: event.leaderId,

        members: event.members || [],

        purpose: event.purpose,

        destination: event.destination,

        route: event.route || [],

        transportMode: event.transportMode,

        departureTime: event.departureTime,

        expectedReturnTime: event.expectedReturnTime,

        checkInIntervalMinutes:
          event.checkInIntervalMinutes || 60,

        weatherRisk: event.weatherRisk || "LOW",

        status: "ACTIVE"
      }
    ],
    { session }
  );

  return excursion[0];
};

export default processExcursionStart;