import { Request, Response } from "express";

export const uploadCsvFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).contentType("application/json").send({ success: false, error: "No Upload file found" });
    }

    res.status(200).contentType("application/json").send({ success: true, data: "OK" });
  } catch (error) {
    res.status(400).contentType("application/json").send({ success: false, error: error.message });
  }
};

export const checkProcessingStatus = async (req: Request, res: Response) => {
  try {
    const uploadId = req.query.uploadId;

    if (!uploadId) {
      throw new Error("No uploadId found");
    }

    res.status(200).contentType("application/json").send({ success: true, data: "OK" });
  } catch (error) {
    res.status(400).contentType("application/json").send({ success: false, error: error.message });
  }
};

export const uploadControllers = { uploadCsvFile, checkProcessingStatus };
