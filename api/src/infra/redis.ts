import { createClient, RedisClientType, RedisFunctions, RedisModules, RedisScripts } from "@redis/client";
import { type Logger } from "winston";

// this function will initialize the redis client and returns the redis instance
const initializeRedis = async (logr: Logger, redisUri: string): Promise<RedisClientType<RedisModules, RedisFunctions, RedisScripts>> => {
  try {
    const client = createClient({ url: redisUri });
    await client.connect();

    logr.info("Connected successfully to redis server");

    // set the dummy key in redis
    client.set("pixelriver", `service-initialized-${Date.now()}`, { EX: 600 });

    return client;
  } catch (error) {
    logr.error(error);
    throw error;
  }
};

export const getRedis = async (logr: Logger): Promise<RedisClientType<RedisModules, RedisFunctions, RedisScripts>> => {
  if (!process.env.REDIS_URI) {
    logr.error("REDIS_URI is not defined");
    throw new Error("REDIS_URI is not defined");
  }

  return await initializeRedis(logr, process.env.REDIS_URI);
};
