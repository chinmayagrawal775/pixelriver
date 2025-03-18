import { Storage } from "@google-cloud/storage";
import fs from "fs";

// this function will intitialize the new gcp storage for the given projectID
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

// intializing a single gcpStorage for uploading files to GCP
const gcpStorage = await initializeGcpStorage(process.env.GCP_PROJECT_ID, process.env.GCP_ENDPOINT);

// this function takes the buketname & destinationPath and uploads the given file to GCP
// it returns the uploaded file url
const uploadToGCcpBucket = async (bucketName: string, destinationPath: string, sourcePath: string): Promise<string> => {
  const gcpBucket = gcpStorage.bucket(bucketName); // take gcp bucket

  const uploadRes = await gcpBucket.upload(sourcePath, { destination: destinationPath }); // upload to gcp

  return uploadRes[0].metadata.mediaLink; // return the uploded file url
};

// this function will upload the csv files to gcp storage. it returns the uploaded file url
// it expects the filePath & fileName to be uploaded. It also delete the file from source if deleteFile is not specified
export const uploadImageDataCsvToCloudStorage = async (filePath: string, fileName: string, deleteFile: boolean = true): Promise<string> => {
  // check if ENVs are valid
  if (!process.env.GCP_IMAGE_DATA_CSV_BUCKET_NAME) {
    console.log("GCP_BUCKET_NAME is not defined");
    process.exit(1);
  }

  if (!process.env.GCP_IMAGE_DATA_CSV_UPLOAD_PATH) {
    console.log("IMAGE_DATA_CSV_UPLOAD_PATH is not defined");
    process.exit(1);
  }

  // get the destination path of GCP bucket for file upload
  const destinationFilePath = `${process.env.GCP_IMAGE_DATA_CSV_UPLOAD_PATH}/${fileName}`;

  // upload the file to GCP
  const uploadedFileUrl = await uploadToGCcpBucket(process.env.GCP_IMAGE_DATA_CSV_BUCKET_NAME, destinationFilePath, filePath);

  // delete the file if: file is uploaded & deleteFile is true
  if (uploadedFileUrl && deleteFile) {
    fs.unlink(filePath, (err) => {
      if (err) {
        // do not throw error in case of file-delete
        console.error(`File: ${fileName} is not deleted from path: ${filePath}`);
      }
    });
  }

  // return the media url
  return uploadedFileUrl;
};
