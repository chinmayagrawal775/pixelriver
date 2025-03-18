import express from "express";
import { uploadControllers } from "../controllers/upload.js";
import { rateLimitingMiddleware } from "../middlewares/rate-limiting-middleware.js";
import { uploadMiddleware } from "../middlewares/upload-middleware.js";

export const uploadRouter = express.Router();

// route for uploading the CSV file. Use the middle for file upload.
uploadRouter.post("/", uploadMiddleware("csvFile"), uploadControllers.uploadCsvFile);

// route for checking process status. Have rate-limiting enabled
uploadRouter.get("/status", rateLimitingMiddleware("query", "uploadId"), uploadControllers.checkProcessingStatus);
