import { UPLOAD_STATUS } from "./constant.js";


export type UploadStatus = (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS];
