import { createLogger, format, transports, type Logger } from "winston";

const initialzeWinstonLogger = async (): Promise<Logger> => {
  const logger = createLogger({
    level: "info",
    format: format.json(),
    defaultMeta: { service: "pixelriver" },
    transports: [
      new transports.File({ filename: "logs/error.log", level: "error" }),
      new transports.File({ filename: "logs/combined.log" }),
    ],
  });

  if (process.env.CONSOLE_LOGGING === "enable") {
    logger.add(
      new transports.Console({
        format: format.simple(),
      })
    );
  }

  logger.info("Logger initialized");

  return logger;
};

export const getWinstonLogger = async (): Promise<Logger> => {
  return await initialzeWinstonLogger();
};
