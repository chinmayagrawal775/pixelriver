import cors from "cors";
import "dotenv/config";
import express from "express";
import path from "path";
import { InfraServices } from "../infra/types.js";
import { infraMiddleware } from "./middlewares/infra-middleware.js";
import { uploadRouter } from "./routes/upload.js";

// this will return the intialzed http server along with middlewares
const initializeHttpServer = async (infraServices: InfraServices, port: string) => {
  const app = express();

  // add the cors & json middleware
  app.use(cors());
  app.use(express.json());

  // add the infra middleware to add the infra middleware to all the routes
  app.use(infraMiddleware(infraServices));

  // add the health check route
  app.get("/health", (req, res) => {
    res.send("OK");
  });

  // these are the internal developer api docuemntation. Add only for local envs
  if (process.env.NODE_ENV !== "production") {
    infraServices.logr.warn("Mounting the internal API docs route for local env. These are never mounted for production");
    // middleware for serving static files
    app.use("/api-docs-internal", express.static(path.join(process.cwd(), "docs")));

    // mounted route for accessing API docs
    app.get("/api-docs-internal", (req, res) => {
      res.sendFile(path.join(process.cwd(), "docs", "index.html"));
    });
  }

  // mount the upload route
  app.use("/api/v1/uploads", uploadRouter);

  // spin up the server to start accepting connections
  const httpServer = app.listen(port);

  infraServices.logr.info(`Server Listening: http://127.0.0.1:${process.env.PORT}/`);

  return httpServer;
};

export const getHttpServer = async (infraServices: InfraServices) => {
  try {
    const port = process.env.PORT;
    if (!port) {
      infraServices.logr.error("PORT is not defined");
      throw new Error("PORT is not defined");
    }

    return await initializeHttpServer(infraServices, port);
  } catch (error) {
    infraServices.logr.error(error);
    console.log("Error while starting the http server", error);
    process.exit(1);
  }
};
