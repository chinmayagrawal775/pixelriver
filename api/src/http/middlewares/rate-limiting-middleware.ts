import { NextFunction, RequestHandler } from "express";

type RateLimitingKeySource = "query";

// uses Fixed Window rate-limiting. Uses redis for mainting the keys
export const rateLimitingMiddleware = (keySource: RateLimitingKeySource, keyName: string): RequestHandler => {
  const RATE_LIMIT = 5; // max req allowed in a minute
  const TIME_WINDOW = 60; // in seconds

  return async (req, res, next: NextFunction) => {
    try {
      // get the key for the rate-limiting
      const rateLimitingBasisKey = req[keySource][keyName]?.toString();
      if (!rateLimitingBasisKey) {
        res.status(500).json({ error: "Rate limiting Error" });
        return;
      }

      // generate the redis key for checking if limit exceeds
      const rateLimitingRedisKey = `rl:${rateLimitingBasisKey}:${Math.floor(new Date().getMinutes() / 60000)}`; // Key changes every minute

      // start pipeline to increase the access count and update the expiry
      const pipeline = req.services.redis.multi();

      pipeline.incr(rateLimitingRedisKey); // Increase count for this second
      pipeline.expire(rateLimitingRedisKey, TIME_WINDOW); // Extend TTL to 60s

      // execute the pipline
      const [incrResult] = await pipeline.exec();

      // Convert incrResult to a number (it should be a string)
      const currentCount = parseInt(incrResult as string, 10);

      // if the count in redis exceeds the limit, then return error
      if (currentCount > RATE_LIMIT) {
        res.status(429).json({ error: "Rate limit exceeded. Try again later." });
        return;
      }

      next();
    } catch (err) {
      console.error("Redis Error:", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
  };
};
