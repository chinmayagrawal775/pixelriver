import { Db, MongoClient } from "mongodb";
import { type Logger } from "winston";

// this function will initialize the mongodb client and returns the db instance
const initializeMongoDb = async (logr: Logger, dbUrl: string): Promise<Db> => {
  try {
    const client = new MongoClient(dbUrl);
    await client.connect();
    const db = client.db();

    logr.info("Connected successfully to server");

    return db;
  } catch (error) {
    logr.error(error.message);
    throw error;
  }
};

// this will return the connected mongodb instance
export const getMongoDB = async (logr: Logger): Promise<Db> => {
  if (!process.env.MONGO_DB_URI) {
    logr.error("MONGO_DB_URI is not defined");
    throw new Error("MONGO_DB_URI is not defined");
  }

  return await initializeMongoDb(logr, process.env.MONGO_DB_URI);
};
