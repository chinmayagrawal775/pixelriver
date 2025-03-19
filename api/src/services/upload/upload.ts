import csvParser from "csv-parser";
import fs from "fs";
import { uploadImageDataCsvToCloudStorage } from "../../infra/gcp.js";
import { pushToKafka } from "../../infra/kafka.js";
import { InfraServices } from "../../infra/types.js";
import { uploadCollectionName, UploadSchema } from "../../models/upload.js";
import { UPLOAD_STATUS } from "./constant.js";
import { CsvRow, UploadServiceResponse } from "./types.js";

// this service will be used to upload the csv file and process it
export const uploadFileService = async (services: InfraServices, file: Express.Multer.File): Promise<UploadServiceResponse> => {
  // validate the csv file
  await validateCSV(file);

  // upload the file to GCP
  const uploadedFileUrl = await uploadImageDataCsvToCloudStorage(services.logr, file.path, file.filename);

  // prepare the bson object to insert in mongoDB
  const uploadObject: UploadSchema = {
    oFileName: file.originalname,
    fileName: file.filename,

    status: UPLOAD_STATUS.QUEUED,
    progress: 0,

    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // insert the object in mongoDB
  const insertResult = await services.mongoDb.collection<UploadSchema>(uploadCollectionName).insertOne(uploadObject);

  // get the unique uploadID. This will be used for further status check by user
  const uniqueUploadId = insertResult.insertedId.toString();

  // push to kafka queue for further processing
  await pushToKafka(services.kafka, services.kafkaConnectedProducer, services.logr).inUploadProcessingTopic(uniqueUploadId);

  // set the intial status in redis. set both status and progress
  await services.redis.set(uniqueUploadId, `${uploadObject.status}:${uploadObject.progress}`);

  services.logr.info("Upload with id: " + uniqueUploadId + " queued");

  // return the uploadID and the status
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

  // rows with empty image URLs not allowed
  if (imageUrls.length < 1) {
    throw new Error("Input Image Urls is required");
  }

  // validate each URL should be valid
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
