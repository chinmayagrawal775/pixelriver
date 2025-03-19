import { getGcpStorage } from "./gcp.js";
import { getKafka } from "./kafka.js";
import { getWinstonLogger } from "./logger.js";
import { getMongoDB } from "./mongo.js";
import { getRedis } from "./redis.js";
import { InfraServices } from "./types.js";

/**
 * this function will initialize all the infra services
 * it will return the infra services object
 */
export const getInfraServices = async (): Promise<InfraServices> => {
  try {
    const logr = await getWinstonLogger();
    const mongoDb = await getMongoDB(logr);
    const redis = await getRedis(logr);
    const [kafka, kafkaConnectedProducer] = await getKafka(logr);

    await getGcpStorage(logr);

    logr.info("All Infra services initialized");

    return {
      logr,
      mongoDb,
      redis,
      kafka,
      kafkaConnectedProducer,
    };
  } catch (error) {
    console.log("Error while initializing infra services: ", error);
    process.exit(1);
  }
};
