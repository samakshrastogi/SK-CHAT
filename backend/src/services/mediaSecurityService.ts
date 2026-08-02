import fs from 'node:fs/promises';
import path from 'node:path';
import { CustomError } from '../utils/customError.js';

const MIME_EXTENSIONS: Record<string, Set<string>> = {
  'image/jpeg': new Set(['.jpg', '.jpeg']),
  'image/png': new Set(['.png']),
  'image/gif': new Set(['.gif']),
  'image/webp': new Set(['.webp']),
  'video/mp4': new Set(['.mp4']),
  'video/webm': new Set(['.webm']),
  'audio/mpeg': new Set(['.mp3']),
  'audio/ogg': new Set(['.ogg', '.oga']),
  'audio/wav': new Set(['.wav']),
  'application/pdf': new Set(['.pdf']),
  'text/plain': new Set(['.txt']),
  'application/msword': new Set(['.doc']),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': new Set(['.docx']),
};

export const allowedUploadMimes = new Set(Object.keys(MIME_EXTENSIONS));

const startsWith = (buffer: Buffer, signature: number[], offset = 0) =>
  signature.every((byte, index) => buffer[offset + index] === byte);

export const detectMediaMime = (buffer: Buffer): string | undefined => {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a') return 'image/gif';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') return 'video/mp4';
  if (startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3])) return 'video/webm';
  if (buffer.subarray(0, 3).toString('ascii') === 'ID3' || startsWith(buffer, [0xff, 0xfb]) || startsWith(buffer, [0xff, 0xf3]) || startsWith(buffer, [0xff, 0xf2])) return 'audio/mpeg';
  if (buffer.subarray(0, 4).toString('ascii') === 'OggS') return 'audio/ogg';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WAVE') return 'audio/wav';
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'application/msword';
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) && buffer.includes(Buffer.from('word/'))) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (!buffer.includes(0) && new TextDecoder('utf-8', { fatal: true }).decode(buffer)) return 'text/plain';
  return undefined;
};

export const inspectUpload = async (file: Express.Multer.File) => {
  const buffer = file.buffer || await fs.readFile(file.path);
  const detectedMime = detectMediaMime(buffer);
  const extension = path.extname(file.originalname).toLowerCase();
  if (!detectedMime || detectedMime !== file.mimetype) {
    throw new CustomError('File content does not match its declared type', 415);
  }
  if (['avatar', 'banner', 'coverImage'].includes(file.fieldname) && !detectedMime.startsWith('image/')) {
    throw new CustomError('Profile and community artwork must be an image', 415);
  }
  if (!MIME_EXTENSIONS[detectedMime]?.has(extension)) {
    throw new CustomError('File extension does not match its content', 415);
  }
};

export const scanUpload = async (file: Express.Multer.File) => {
  const provider = (process.env.MALWARE_SCAN_PROVIDER || 'generic').trim().toLowerCase();
  const required = process.env.MALWARE_SCAN_REQUIRED === 'true';
  const body = file.buffer || await fs.readFile(file.path);
  const controller = new AbortController();
  const timeoutMs = Math.max(5_000, Number(process.env.MALWARE_SCAN_TIMEOUT_MS || 30_000));
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (provider === 'cloudmersive') {
      const apiKey = process.env.CLOUDMERSIVE_API_KEY?.trim();
      if (!apiKey) {
        if (required) throw new CustomError('Cloudmersive malware scanner is not configured', 503);
        return;
      }
      const form = new FormData();
      form.append('inputFile', new Blob([new Uint8Array(body)], { type: file.mimetype }), file.originalname);
      const response = await fetch('https://api.cloudmersive.com/virus/scan/file', {
        method: 'POST',
        headers: { Apikey: apiKey },
        body: form,
        signal: controller.signal,
      });
      if (!response.ok) throw new CustomError('Cloudmersive file security scan failed', 503);
      const result = await response.json() as { CleanResult?: boolean; FoundViruses?: unknown[] };
      if (result.CleanResult !== true) throw new CustomError('Potentially unsafe file rejected', 422);
      return;
    }

    const scanUrl = process.env.MALWARE_SCAN_URL?.trim();
    if (!scanUrl) {
      if (required) throw new CustomError('Malware scanner is unavailable', 503);
      return;
    }
    const response = await fetch(scanUrl, {
      method: 'POST',
      headers: {
        'content-type': file.mimetype,
        'x-file-name': encodeURIComponent(file.originalname),
        ...(process.env.MALWARE_SCAN_TOKEN ? { authorization: `Bearer ${process.env.MALWARE_SCAN_TOKEN}` } : {}),
      },
      body,
      signal: controller.signal,
    });
    if (!response.ok) throw new CustomError('File security scan failed', 503);
    const result = await response.json() as { clean?: boolean };
    if (result.clean !== true) throw new CustomError('Potentially unsafe file rejected', 422);
  } catch (error) {
    if (error instanceof CustomError) throw error;
    throw new CustomError('File security scan failed', 503);
  } finally {
    clearTimeout(timeout);
  }
};
