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
  const logr = await getWinstonLogger();
  const mongoDb = await getMongoDB();
  const redis = await getRedis();
  const [kafka, kafkaConnectedProducer] = await getKafka();

  return {
    logr,
    mongoDb,
    redis,
    kafka,
    kafkaConnectedProducer,
  };
};
