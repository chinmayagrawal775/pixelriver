import { createLogger, format, transports, type Logger } from "winston";

// this function will initialize the winston logger
// will create logs in  logs/error.log & logs/combined.log files
// it also checks if console logging is enabled or not. If enabled then it will log to console as well
const initialzeWinstonLogger = async (): Promise<Logger> => {
  // create logger instance
  const logger = createLogger({
    level: "info",
    format: format.json(),
    defaultMeta: { service: "pixelriver" },
    transports: [new transports.File({ filename: "logs/error.log", level: "error" }), new transports.File({ filename: "logs/combined.log" })],
  });

  // if console logging is enabled then add console transport
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

// intialize and return the new logger instance
export const getWinstonLogger = async (): Promise<Logger> => {
  return await initialzeWinstonLogger();
};
