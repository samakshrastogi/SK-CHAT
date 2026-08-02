import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectMediaMime, scanUpload } from './mediaSecurityService.js';

const originalEnvironment = { ...process.env };

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...originalEnvironment };
});

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

  it('submits uploads to Cloudmersive using its multipart API contract', async () => {
    process.env.MALWARE_SCAN_PROVIDER = 'cloudmersive';
    process.env.CLOUDMERSIVE_API_KEY = 'cloudmersive-key';
    process.env.MALWARE_SCAN_REQUIRED = 'true';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      CleanResult: true,
      FoundViruses: [],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const file = {
      buffer: Buffer.from('%PDF-1.7\n'),
      mimetype: 'application/pdf',
      originalname: 'safe.pdf',
    } as Express.Multer.File;

    await expect(scanUpload(file)).resolves.toBeUndefined();

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.cloudmersive.com/virus/scan/file');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({ Apikey: 'cloudmersive-key' });
    expect(options.body).toBeInstanceOf(FormData);
    expect((options.body as FormData).get('inputFile')).toBeInstanceOf(Blob);
  });

  it('rejects files Cloudmersive reports as infected', async () => {
    process.env.MALWARE_SCAN_PROVIDER = 'cloudmersive';
    process.env.CLOUDMERSIVE_API_KEY = 'cloudmersive-key';
    process.env.MALWARE_SCAN_REQUIRED = 'true';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      CleanResult: false,
      FoundViruses: [{ FileName: 'unsafe.pdf', VirusName: 'test-virus' }],
    }), { status: 200 })));
    const file = {
      buffer: Buffer.from('%PDF-1.7\n'),
      mimetype: 'application/pdf',
      originalname: 'unsafe.pdf',
    } as Express.Multer.File;

    await expect(scanUpload(file)).rejects.toMatchObject({ statusCode: 422 });
  });
});
