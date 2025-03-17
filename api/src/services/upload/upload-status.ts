import { ObjectId } from "mongodb";
import { InfraServices } from "../../infra/types.js";
import { uploadCollectionName, UploadSchema } from "../../models/upload.js";
import { StatusServiceResponse, UploadStatus } from "./types.js";

export const processingStatusCheckService = async (services: InfraServices, uploadId: string): Promise<StatusServiceResponse> => {
  const uploadInfoFromRedis = await services.redis.get(uploadId);
  // cache hit
  if (uploadInfoFromRedis) {
    const [status, progress] = uploadInfoFromRedis.split(":");

    return { status: status as UploadStatus, progress: parseInt(progress) };
  }

  // cache miss. Expected cache miss conditions:
  // 1. When uploadID is invalid
  // 2. When upload is completed(for completed uploads keys in redis are deleted)

  const collection = services.mongoDb.collection<UploadSchema>(uploadCollectionName);

  const uploadInfo = await collection.findOne({ _id: new ObjectId(uploadId) });
  if (!uploadInfo) {
    // enhancemnt scope: Add key in redis for this uploadId with status: "not found" with EX=3600. Will prevent further DB calls
    throw new Error(`Upload with id ${uploadId} not found`);
  }

  return {
    status: uploadInfo.status,
    progress: uploadInfo.progress,
    processedFileUrl: `${process.env.GCP_IMAGE_DATA_CSV_FILE_PUBLIC_URL}${uploadInfo.fileName}`,
  };
};
