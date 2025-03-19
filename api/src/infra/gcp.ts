import { Storage } from "@google-cloud/storage";
import fs from "fs";
import { type Logger } from "winston";

// intializing a single gcpStorage for uploading files to GCP
// this will hold storage instance once server is started
let gcpStorage: Storage = null;

// this function will intitialize the new gcp storage for the given projectID
const initializeGcpStorage = async (logr: Logger, gcpProjectId: string, gcpEndpoint: string): Promise<Storage> => {
  try {
    const storage = new Storage({
      projectId: gcpProjectId,
      apiEndpoint: gcpEndpoint,
    });

    logr.info("GCP storage initialized");

    return storage;
  } catch (error) {
    logr.error(`Error in starting GCP storage:${JSON.stringify(error)}`);
    throw error;
  }
};

export const getGcpStorage = async (logr: Logger): Promise<void> => {
  try {
    // check if ENVs are valid
    if (!process.env.GCP_IMAGE_DATA_CSV_BUCKET_NAME) {
      logr.error("GCP_IMAGE_DATA_CSV_BUCKET_NAME is not defined");
      throw new Error("GCP_IMAGE_DATA_CSV_BUCKET_NAME is not defined");
    }

    if (!process.env.GCP_IMAGE_DATA_CSV_UPLOAD_PATH) {
      logr.error("GCP_IMAGE_DATA_CSV_UPLOAD_PATH is not defined");
      throw new Error("GCP_IMAGE_DATA_CSV_UPLOAD_PATH is not defined");
    }

    // check if ENVs are valid
    if (!process.env.GCP_PROJECT_ID) {
      logr.error("GCP_PROJECT_ID is not defined");
      throw new Error("GCP_PROJECT_ID is not defined");
    }

    if (!process.env.GCP_ENDPOINT) {
      logr.error("GCP_ENDPOINT is not defined");
      throw new Error("GCP_ENDPOINT is not defined");
    }

    gcpStorage = await initializeGcpStorage(logr, process.env.GCP_PROJECT_ID, process.env.GCP_ENDPOINT);
    logr.info("GCP storage assinged");
  } catch (error) {
    logr.error(`Error in getting GCP storage:${JSON.stringify(error)}`);
    throw error;
  }
};

// this function takes the buketname & destinationPath and uploads the given file to GCP
// it returns the uploaded file url
const uploadToGCcpBucket = async (bucketName: string, destinationPath: string, sourcePath: string): Promise<string> => {
  const gcpBucket = gcpStorage.bucket(bucketName); // take gcp bucket

  const uploadRes = await gcpBucket.upload(sourcePath, { destination: destinationPath }); // upload to gcp

  return uploadRes[0].metadata.mediaLink; // return the uploded file url
};

// this function will upload the csv files to gcp storage. it returns the uploaded file url
// it expects the filePath & fileName to be uploaded. It also delete the file from source if deleteFile is not specified
export const uploadImageDataCsvToCloudStorage = async (
  logr: Logger,
  filePath: string,
  fileName: string,
  deleteFile: boolean = true
): Promise<string> => {
  // get the destination path of GCP bucket for file upload
  const destinationFilePath = `${process.env.GCP_IMAGE_DATA_CSV_UPLOAD_PATH}/${fileName}`;

  // upload the file to GCP
  const uploadedFileUrl = await uploadToGCcpBucket(process.env.GCP_IMAGE_DATA_CSV_BUCKET_NAME, destinationFilePath, filePath);

  // delete the file if: file is uploaded & deleteFile is true
  if (uploadedFileUrl && deleteFile) {
    fs.unlink(filePath, (err) => {
      if (err) {
        // do not throw error in case of file-delete
        logr.error(`File: ${fileName} is not deleted from path: ${filePath}`);
      }
    });
  }

  // return the media url
  return uploadedFileUrl;
};
