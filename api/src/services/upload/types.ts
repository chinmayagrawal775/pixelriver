import { UPLOAD_STATUS } from "./constant.js";

// Uploaded CSV headers structure
export type CsvRow = {
  "Serial Number": string;
  "Product Name": string;
  "Input Image Urls": string;
};

// API response structure
export type UploadServiceResponse = {
  uploadId: string;
  status: UploadStatus;
};

// API response structure
export type StatusServiceResponse = {
  status: UploadStatus;
  progress: number;
  processedFileUrl?: string;
};

// upload status typed
export type UploadStatus = (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS];
