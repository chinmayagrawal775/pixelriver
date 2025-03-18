import { RedisClientType, RedisFunctions, RedisModules, RedisScripts } from "@redis/client";
import { Kafka, Producer } from "kafkajs";
import { Db } from "mongodb";
import winston from "winston";

/**
 * this type will define the infra services
 * it will be used to pass the infra services to the http server
 * it contains the mongodb, redis, kafka & logger instances
 */
export type InfraServices = {
  mongoDb: Db;
  redis: RedisClientType<RedisModules, RedisFunctions, RedisScripts>;
  kafka: Kafka;
  kafkaConnectedProducer: Producer;
  logr: winston.Logger;
};
