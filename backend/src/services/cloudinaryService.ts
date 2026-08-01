import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isConfiguredEnvValue } from '../config/env.js';
import { CustomError } from '../utils/customError.js';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

let isCloudinaryConfigured = false;

if ([cloudName, apiKey, apiSecret].every(isConfiguredEnvValue)) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  isCloudinaryConfigured = true;
  logger.info('Cloudinary configured successfully');
} else {
  logger.warn('Cloudinary credentials are absent or placeholders. Media uploads are disabled in production');
}

export const uploadMedia = async (
  file: Express.Multer.File,
  folder: string = 'connect_media'
): Promise<{ url: string; publicId?: string }> => {
  try {
    if (isCloudinaryConfigured) {
      let uploadSource: string;
      if (file.path) {
        uploadSource = file.path;
      } else if (file.buffer) {
        uploadSource = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      } else {
        throw new Error('No file path or buffer available for upload');
      }

      const uploadResponse = await cloudinary.uploader.upload(uploadSource, {
        folder,
        resource_type: 'auto',
      });

      return {
        url: uploadResponse.secure_url,
        publicId: uploadResponse.public_id,
      };
    } else {
      if (process.env.NODE_ENV === 'production') {
        throw new CustomError('Media uploads are temporarily unavailable', 503);
      }
      // Fallback: File is written to local filesystem by multer.
      // Multer file object contains the generated local filepath.
      // We will generate the local web asset URL.
      // Notice: If file is uploaded via buffer multer (MemoryStorage), we need to write it to disk.
      // To keep uploads unified, we can configure Multer to use disk storage in uploadMiddleware.
      // If we use diskStorage in uploadMiddleware, file.path is available.
      // If we use memoryStorage, we write it to disk here.
      // Let's design it to use diskStorage in uploadMiddleware for ease of use.
      // We will map the path to relative web asset route.
      
      const serverUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      const relativePath = file.path.replace(/\\/g, '/'); // Windows support
      
      // Extract the filename or final segment
      const cleanPath = relativePath.includes('uploads/') 
        ? relativePath.substring(relativePath.indexOf('uploads/'))
        : `uploads/${file.filename}`;
        
      const localUrl = `${serverUrl}/${cleanPath}`;
      logger.info(`Saved local file upload to web url: ${localUrl}`);
      return {
        url: localUrl,
        publicId: file.filename,
      };
    }
  } catch (error: any) {
    logger.error(`Error uploading media: ${error.message}`);
    throw error;
  } finally {
    if (file.path && (isCloudinaryConfigured || process.env.NODE_ENV === 'production')) {
      await fs.unlink(file.path).catch((error: any) => {
        logger.warn(`Could not delete temporary file ${file.path}: ${error.message}`);
      });
    }
  }
};

export const deleteMedia = async (publicId: string): Promise<boolean> => {
  try {
    if (isCloudinaryConfigured && !publicId.startsWith('local_')) {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    }
    // Local delete would require file unlink - we can support it if needed.
    logger.info(`Mock/Local media delete executed for: ${publicId}`);
    return true;
  } catch (error: any) {
    logger.error(`Error deleting media: ${error.message}`);
    return false;
  }
};
