// this file contains the constants for the upload service

// variouse possible status for the upload
export const UPLOAD_STATUS = {
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;
