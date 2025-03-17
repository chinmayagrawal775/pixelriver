import { Storage } from "@google-cloud/storage";
import fs from "fs";

const initializeGcpStorage = async (gcpProjectId: string, gcpEndpoint: string): Promise<Storage> => {
  try {
    const storage = new Storage({
      projectId: gcpProjectId,
      apiEndpoint: gcpEndpoint,
    });

    return storage;
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

const gcpStorage = await initializeGcpStorage(process.env.GCP_PROJECT_ID, process.env.GCP_ENDPOINT);

const uploadToGCcpBucket = async (bucketName: string, destinationPath: string, sourcePath: string): Promise<string> => {
  const gcpBucket = gcpStorage.bucket(bucketName);

  const uploadRes = await gcpBucket.upload(sourcePath, { destination: destinationPath });

  return uploadRes[0].metadata.mediaLink;
};

export const uploadImageDataCsvToCloudStorage = async (filePath: string, fileName: string, deleteFile: boolean = true): Promise<string> => {
  if (!process.env.GCP_IMAGE_DATA_CSV_BUCKET_NAME) {
    console.log("GCP_BUCKET_NAME is not defined");
    process.exit(1);
  }

  if (!process.env.GCP_IMAGE_DATA_CSV_UPLOAD_PATH) {
    console.log("IMAGE_DATA_CSV_UPLOAD_PATH is not defined");
    process.exit(1);
  }

  const destinationFilePath = `${process.env.GCP_IMAGE_DATA_CSV_UPLOAD_PATH}/${fileName}`;

  const uploadedFileUrl = await uploadToGCcpBucket(process.env.GCP_IMAGE_DATA_CSV_BUCKET_NAME, destinationFilePath, filePath);

  if (uploadedFileUrl && deleteFile) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`File: ${fileName} is not deleted from path: ${filePath}`);
      }
    });
  }

  return uploadedFileUrl;
};
