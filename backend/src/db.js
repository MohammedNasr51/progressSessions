import { MongoClient } from "mongodb";

let client;
let sessions;

export async function connectDatabase(config) {
  if (sessions) return sessions;

  client = new MongoClient(config.mongodbUri, {
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 30_000,
    serverSelectionTimeoutMS: 8_000,
  });

  await client.connect();
  const database = client.db(config.databaseName);
  sessions = database.collection("sessions");
  await sessions.createIndex({ month: 1, id: 1 }, { unique: true });
  await sessions.createIndex({ month: 1, number: 1 });
  return sessions;
}

export async function closeDatabase() {
  if (client) await client.close();
  client = undefined;
  sessions = undefined;
}
