import crypto from "crypto";
import offlineDB from "./pouchService";

export const queueEvent = async (event) => {
  const document = {
    _id: crypto.randomUUID(),

    eventId: crypto.randomUUID(),

    ...event,

    syncStatus: "LOCAL",

    createdAt: new Date().toISOString()
  };

  await offlineDB.put(document);

  return document;
};

export const getPendingEvents = async () => {

  const docs = await offlineDB.allDocs({
    include_docs: true
  });

  return docs.rows
    .map(row => row.doc)
    .filter(doc => doc.syncStatus === "LOCAL");

};

export const markEventSynced = async (doc) => {
  await offlineDB.put({
    ...doc,
    syncStatus: "SYNCED"
  });
};

