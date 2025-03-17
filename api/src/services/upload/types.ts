import { UPLOAD_STATUS } from "./constant.js";

export type CsvRow = {
  "Serial Number": string;
  "Product Name": string;
  "Input Image Urls": string;
};

export type UploadServiceResponse = {
  uploadId: string;
  status: UploadStatus;
};

export type StatusServiceResponse = {
  status: UploadStatus;
  progress: number;
  processedFileUrl?: string;
};

export type UploadStatus = (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS];
