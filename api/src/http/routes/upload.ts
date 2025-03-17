import express from "express";
import { rateLimitingMiddleware } from "../middlewares/rate-limiting-middleware.js";
import { uploadMiddleware } from "../middlewares/upload-middleware.js";

export const uploadRouter = express.Router();

uploadRouter.post("/", uploadMiddleware("csvFile"), (req, res) => {
  res.send("OK");
});

uploadRouter.get("/status", rateLimitingMiddleware("query", "uploadId"), (req, res) => {
  res.send("OK");
});
