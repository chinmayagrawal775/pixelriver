import cors from "cors";
import "dotenv/config";
import express from "express";
import { InfraServices } from "../infra/types.js";
import { infraMiddleware } from "./middlewares/infra-middleware.js";

const initializeHttpServer = async (infraServices: InfraServices, port: string) => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use(infraMiddleware(infraServices));

  app.get("/health", (req, res) => {
    res.send("OK");
  });

  const httpServer = app.listen(port, () => console.log(`Server Listening @ http://localhost:${port}`));

  console.log("server is serving");

  return httpServer;
};

export const getHttpServer = async (infraServices: InfraServices) => {
  const port = process.env.PORT;
  if (!port) {
    console.log("PORT is not defined");
    process.exit(1);
  }

  return await initializeHttpServer(infraServices, port);
};
