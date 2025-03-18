import { Kafka, Producer } from "kafkajs";
import winston from "winston";

// initialze topics here
const UPLOAD_PROCESSING_TOPIC = "pixelriver-new-upload";

// this function connect to the given kafka brokers and returns the kafka instance and the pre connected producer to push events
const initializeKafka = async (kafkaBrokers: string[]): Promise<[Kafka, Producer]> => {
  try {
    const kafka = new Kafka({
      clientId: "pixelriver",
      brokers: kafkaBrokers,
    });

    // connect to kafka producer
    const producer = kafka.producer();
    await producer.connect();

    return [kafka, producer];
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

// this function will return the kafka instance and the pre connected producer
export const getKafka = async (): Promise<[Kafka, Producer]> => {
  // if kafka is disabled return null
  if (process.env.DISABLE_KAFKA === "true") {
    return [null, null];
  }

  // validate if kafka brokers are defined
  if (!process.env.KAFKA_BROKERS) {
    console.log("KAFKA_BROKERS is not defined");
    process.exit(1);
  }

  // get list of kafka brokers
  const kafkaBrokers = process.env.KAFKA_BROKERS.split(",");

  // initialize kafka and return response
  return await initializeKafka(kafkaBrokers);
};

// this function expects the kafka & the producer and will send the message to the particular topic
// it also checks if kafka is disabled or not. If kafka is disabled in env then it will return null
export const pushToKafka = (kafka: Kafka, connectedProducer: Producer, logr: winston.Logger) => {
  // send the given message to the given topic
  const sendToTopic = (topic: string, message: string) => {
    if (process.env.DISABLE_KAFKA === "true") {
      return;
    }

    return connectedProducer.send({ messages: [{ value: message }], topic: topic });
  };

  // send the given message to the upload processing topic
  const inUploadProcessingTopic = (message: string) => {
    return sendToTopic(UPLOAD_PROCESSING_TOPIC, message);
  };

  return {
    inUploadProcessingTopic,
  };
};
