import csvParser from "csv-parser";
import fs from "fs";
import { uploadImageDataCsvToCloudStorage } from "../../infra/gcp.js";
import { pushToKafka } from "../../infra/kafka.js";
import { InfraServices } from "../../infra/types.js";
import { uploadCollectionName, UploadSchema } from "../../models/upload.js";
import { UPLOAD_STATUS } from "./constant.js";
import { CsvRow, UploadServiceResponse } from "./types.js";

export const uploadFileService = async (services: InfraServices, file: Express.Multer.File): Promise<UploadServiceResponse> => {
  await validateCSV(file);

  const uploadedFileUrl = await uploadImageDataCsvToCloudStorage(file.path, file.filename);

  const uploadObject: UploadSchema = {
    oFileName: file.originalname,
    fileName: file.filename,

    status: UPLOAD_STATUS.QUEUED,
    progress: 0,

    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const insertResult = await services.mongoDb.collection<UploadSchema>(uploadCollectionName).insertOne(uploadObject);

  const uniqueUploadId = insertResult.insertedId.toString();

  await pushToKafka(services.kafka, services.kafkaConnectedProducer, services.logr).inUploadProcessingTopic(uniqueUploadId);

  await services.redis.set(uniqueUploadId, `${uploadObject.status}:${uploadObject.progress}`);

  return { uploadId: uniqueUploadId, status: uploadObject.status };
};

// Input CSV Format:
// Column 1:- Serial Number
// Column 2:- Product Name:- This will be a name of product against which we will store input and output images
// Column 3:- Input Image Urls:- In this column we will have comma separated image urls
const validateCSV = async (file: Express.Multer.File) => {
  const rows = [];

  const stream = fs.createReadStream(file.path);

  for await (const row of stream.pipe(csvParser())) {
    validateCsvRow(row);
    rows.push(row);
  }

  if (!rows.length) {
    throw new Error("Atleast one row is required");
  }
};

export const validateCsvRow = (row: CsvRow): void => {
  if (!row["Serial Number"]) {
    throw new Error("Serial Number is required");
  }

  if (!row["Product Name"]) {
    throw new Error("Product Name is required");
  }

  if (!row["Input Image Urls"]) {
    throw new Error("Input Image Urls is required");
  }

  const imageUrls = row["Input Image Urls"].split(",");

  if (imageUrls.length < 1) {
    throw new Error("Input Image Urls is required");
  }

  imageUrls.forEach((imageUrl) => {
    try {
      new URL(imageUrl);
      return true;
    } catch (error) {
      throw new Error(`Invalid Image Url: ${imageUrl}`);
    }
  });

  return null;
};
