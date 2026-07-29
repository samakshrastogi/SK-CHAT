import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { CustomError } from '../utils/customError.js';
import { allowedUploadMimes } from '../services/mediaSecurityService.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the local uploads folder exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Setup disk storage for local uploads (fallback/primary)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// Configure upload limits and filters
export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB maximum per file
  },
  fileFilter: (req, file, cb) => {
    if (!allowedUploadMimes.has(file.mimetype)) {
      return cb(new CustomError('Unsupported file type', 415));
    }
    cb(null, true);
  }
});
