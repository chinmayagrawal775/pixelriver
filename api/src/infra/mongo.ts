import { Db, MongoClient } from "mongodb";

// this function will initialize the mongodb client and returns the db instance
const initializeMongoDb = async (dbUrl: string): Promise<Db> => {
  try {
    const client = new MongoClient(dbUrl);
    await client.connect();
    const db = client.db();

    console.log("Connected successfully to server");

    return db;
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

// this will return the connected mongodb instance
export const getMongoDB = async (): Promise<Db> => {
  if (!process.env.MONGO_DB_URI) {
    console.log("MONGO_DB_URI is not defined");
    process.exit(1);
  }

  return await initializeMongoDb(process.env.MONGO_DB_URI);
};
