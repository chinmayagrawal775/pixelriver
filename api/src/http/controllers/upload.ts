import { Request, Response } from "express";
import { processingStatusCheckService } from "../../services/upload/upload-status.js";
import { uploadFileService } from "../../services/upload/upload.js";

// controller for the csv upload service.
// do the validations, and return the service response
export const uploadCsvFile = async (req: Request, res: Response) => {
  try {
    // check if file is present or not
    if (!req.file) {
      res.status(400).contentType("application/json").send({ success: false, error: "No Upload file found" });
    }

    const serviceRes = await uploadFileService(req.services, req.file, req.body.webhookUrl);

    const response = {
      success: true,
      data: serviceRes,
    };

    res.status(200).contentType("application/json").send(response);
  } catch (error) {
    res.status(400).contentType("application/json").send({ success: false, error: error.message });
  }
};

// controller for checking the processing status of the uploaded file.
// do the validations, and return the service response
export const checkProcessingStatus = async (req: Request, res: Response) => {
  try {
    const uploadId = req.query.uploadId;

    // check if uploadId is present or not
    if (!uploadId) {
      throw new Error("No uploadId found");
    }

    const serviceRes = await processingStatusCheckService(req.services, uploadId.toString());

    const response = {
      success: true,
      data: serviceRes,
    };

    res.status(200).contentType("application/json").send(response);
  } catch (error) {
    res.status(400).contentType("application/json").send({ success: false, error: error.message });
  }
};

export const uploadControllers = { uploadCsvFile, checkProcessingStatus };
