import { UploadStatus } from "../services/upload/types.js";

// name of the collection in mongoDB
export const uploadCollectionName = "uploads";

/**
 * this file contains the upload model
 * this model will be used to store the upload data in mongodb
 */
export type UploadSchema = {
  oFileName: string;
  fileName: string;

  status: UploadStatus;
  progress: number;

  createdAt: Date;
  updatedAt: Date;
};
