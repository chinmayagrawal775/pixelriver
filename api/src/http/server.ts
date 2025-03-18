import cors from "cors";
import "dotenv/config";
import express from "express";
import path from "path";
import { InfraServices } from "../infra/types.js";
import { infraMiddleware } from "./middlewares/infra-middleware.js";
import { uploadRouter } from "./routes/upload.js";

const initializeHttpServer = async (infraServices: InfraServices, port: string) => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use(infraMiddleware(infraServices));

  app.get("/health", (req, res) => {
    res.send("OK");
  });

  if (process.env.NODE_ENV !== "production") {
    app.use("/api-docs-internal", express.static(path.join(process.cwd(), "docs")));
    app.get("/api-docs-internal", (req, res) => {
      res.sendFile(path.join(process.cwd(), "docs", "index.html"));
    });
  }

  app.use("/api/v1/uploads", uploadRouter);

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
