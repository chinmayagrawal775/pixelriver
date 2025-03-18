import { RequestHandler } from "express";
import multer from "multer";

const MegaBytes = 1024 * 1024;

const MAX_ALLOWED_FILES = 1;
const MAX_ALLOWED_FILE_SIZE = 5 * MegaBytes;

export const UPLOAD_DIR = process.cwd() + "/uploads";

// get unique name for uploaded file
const getUploadedFileName = (fileName: string, fieldName: string): string => {
  return `${fieldName}_${Date.now()}_${fileName}`;
};

const MULTER_CONFIG: multer.Options = {
  limits: { files: MAX_ALLOWED_FILES, fileSize: MAX_ALLOWED_FILE_SIZE },

  // specify where to store files
  storage: multer.diskStorage({
    destination: (req, file, next) => next(null, UPLOAD_DIR),
    filename: (req, file, next) => next(null, getUploadedFileName(file.originalname, file.fieldname)),
  }),

  // restrict the files types
  fileFilter(req, file, next) {
    if (!file.originalname.endsWith(".csv")) {
      throw new Error("Please upload a CSV file");
    }

    next(null, true);
  },
};

// initialize the multer instance
const upload = multer(MULTER_CONFIG);

export const uploadMiddleware = (fieldName: string): RequestHandler => {
  // only single file upload allowed
  const uploadSingle = upload.single(fieldName);

  return (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        // if error while uploading, then return
        res.send(err.message);
        return;
      }
      // otherwise continue
      next();
    });
  };
};
