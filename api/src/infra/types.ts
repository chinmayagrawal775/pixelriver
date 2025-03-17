import { RedisClientType, RedisFunctions, RedisModules, RedisScripts } from "@redis/client";
import { Kafka, Producer } from "kafkajs";
import { Db } from "mongodb";
import winston from "winston";

export type InfraServices = {
  mongoDb: Db;
  redis: RedisClientType<RedisModules, RedisFunctions, RedisScripts>;
  kafka: Kafka;
  kafkaConnectedProducer: Producer;
  logr: winston.Logger;
};
