import { UploadStatus } from "../services/upload/types.js";

export const uploadCollectionName = "uploads";

export type UploadSchema = {
  oFileName: string;
  fileName: string;

  status: UploadStatus;
  progress: number;

  createdAt: Date;
  updatedAt: Date;
};
