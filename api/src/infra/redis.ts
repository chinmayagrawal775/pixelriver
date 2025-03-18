import { createClient, RedisClientType, RedisFunctions, RedisModules, RedisScripts } from "@redis/client";

// this function will initialize the redis client and returns the redis instance
const initializeRedis = async (redisUri: string): Promise<RedisClientType<RedisModules, RedisFunctions, RedisScripts>> => {
  try {
    const client = createClient({ url: redisUri });
    await client.connect();

    // set the dummy key in redis
    client.set("pixelriver", `service-initialized-${Date.now()}`, { EX: 600 });

    return client;
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

export const getRedis = async (): Promise<RedisClientType<RedisModules, RedisFunctions, RedisScripts>> => {
  if (!process.env.REDIS_URI) {
    console.log("REDIS_URI is not defined");
    process.exit(1);
  }

  return await initializeRedis(process.env.REDIS_URI);
};
