import { ObjectId } from "mongodb";
import { InfraServices } from "../../infra/types.js";
import { uploadCollectionName, UploadSchema } from "../../models/upload.js";
import { StatusServiceResponse, UploadStatus } from "./types.js";

// this will be used for checking the processing status
// if processing is incomplete, then it return the status & progress. if it is complete then it also returns the processed file url
export const processingStatusCheckService = async (services: InfraServices, uploadId: string): Promise<StatusServiceResponse> => {
  if (!ObjectId.isValid(uploadId)) {
    throw new Error(`Invalid UploadID: ${uploadId}`);
  }

  const uploadInfoFromRedis = await services.redis.get(uploadId);
  // cache hit
  if (uploadInfoFromRedis) {
    // get the status & progress from redis
    const [status, progress] = uploadInfoFromRedis.split(":");

    return { status: status as UploadStatus, progress: parseInt(progress) };
  }

  // cache miss. Expected cache miss conditions:
  // 1. When uploadID is invalid
  // 2. When upload is completed(for completed uploads keys in redis are deleted)

  const collection = services.mongoDb.collection<UploadSchema>(uploadCollectionName);
  const uploadInfo = await collection.findOne({ _id: new ObjectId(uploadId) });
  if (!uploadInfo) {
    // As this is invalid uploadID. So add key in redis for this uploadId with status: "not found" with EX=3600.
    // Will prevent further DB calls if API called too frequently
    await services.redis.set(uploadId, `file not found:0`, { EX: 3600 });
    throw new Error(`Upload with id ${uploadId} not found`);
  }

  return {
    status: uploadInfo.status,
    progress: uploadInfo.progress,
    processedFileUrl: `${process.env.GCP_IMAGE_DATA_CSV_FILE_PUBLIC_URL}${uploadInfo.fileName}`, // return the processed file url
  };
};
