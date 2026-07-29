import { describe, expect, it } from 'vitest';
import { detectMediaMime } from './mediaSecurityService.js';

describe('media content inspection', () => {
  it('detects supported content from bytes rather than a supplied MIME label', () => {
    expect(detectMediaMime(Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]))).toBe('image/png');
    expect(detectMediaMime(Buffer.from('%PDF-1.7\n'))).toBe('application/pdf');
    expect(detectMediaMime(Buffer.from('plain text'))).toBe('text/plain');
  });

  it('rejects unknown binary content', () => {
    expect(detectMediaMime(Buffer.from([0, 1, 2, 3, 4, 5]))).toBeUndefined();
  });

  it('distinguishes WAV and WebP RIFF containers', () => {
    expect(detectMediaMime(Buffer.from('RIFF0000WAVE', 'ascii'))).toBe('audio/wav');
    expect(detectMediaMime(Buffer.from('RIFF0000WEBP', 'ascii'))).toBe('image/webp');
  });
});
