import express from "express";
import { uploadControllers } from "../controllers/upload.js";
import { rateLimitingMiddleware } from "../middlewares/rate-limiting-middleware.js";
import { uploadMiddleware } from "../middlewares/upload-middleware.js";

export const uploadRouter = express.Router();

uploadRouter.post("/", uploadMiddleware("csvFile"), uploadControllers.uploadCsvFile);
uploadRouter.get("/status", rateLimitingMiddleware("query", "uploadId"), uploadControllers.checkProcessingStatus);
