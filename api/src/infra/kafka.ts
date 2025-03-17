import { Kafka, Producer } from "kafkajs";
import winston from "winston";

const UPLOAD_PROCESSING_TOPIC = "pixelriver-new-upload";

const initializeKafka = async (kafkaBrokers: string[]): Promise<[Kafka, Producer]> => {
  try {
    const kafka = new Kafka({
      clientId: "pixelriver",
      brokers: kafkaBrokers,
    });

    const producer = kafka.producer();
    await producer.connect();

    return [kafka, producer];
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

export const getKafka = async (): Promise<[Kafka, Producer]> => {
  if (!process.env.KAFKA_BROKERS) {
    console.log("KAFKA_BROKERS is not defined");
    process.exit(1);
  }

  const kafkaBrokers = process.env.KAFKA_BROKERS.split(",");

  return await initializeKafka(kafkaBrokers);
};

export const pushToKafka = (kafka: Kafka, connectedProducer: Producer, logr: winston.Logger) => {
  const sendToTopic = (topic: string, message: string) => {
    return connectedProducer.send({ messages: [{ value: message }], topic: topic });
  };

  const inUploadProcessingTopic = (message: string) => {
    return sendToTopic(UPLOAD_PROCESSING_TOPIC, message);
  };

  return {
    inUploadProcessingTopic,
  };
};
