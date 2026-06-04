import { S3StorageService, type S3Config } from './s3-storage.service';
import { AzureBlobStorageService, type AzureBlobConfig } from './azure-blob-storage.service';
import {
  type UploadOptions,
  type UploadResult,
  type SignedUrlOptions,
  type SignedUrlResult,
  type DeleteFileOptions,
  StorageProvider,
} from '@project-olympus/types';
import { type Readable } from 'node:stream';
import { lookup } from 'mime-types';
import sharp from 'sharp';

export interface StorageServiceConfig {
  provider: StorageProvider;
  s3?: S3Config;
  azureBlob?: AzureBlobConfig;
}

export class StorageService {
  private readonly provider: StorageProvider;
  private readonly s3Service?: S3StorageService;
  private readonly azureBlobService?: AzureBlobStorageService;

  constructor(config: StorageServiceConfig) {
    this.provider = config.provider;

    if (config.provider === StorageProvider.S3 && config.s3) {
      this.s3Service = new S3StorageService(config.s3);
    } else if (config.provider === StorageProvider.AZURE_BLOB && config.azureBlob) {
      this.azureBlobService = new AzureBlobStorageService(config.azureBlob);
    } else {
      throw new Error(`Unsupported storage provider: ${config.provider}`);
    }
  }

  public async uploadFile(file: Buffer | Readable, options: UploadOptions): Promise<UploadResult> {
    if (this.provider === StorageProvider.S3 && this.s3Service) {
      return this.s3Service.uploadFile(file, options);
    } else if (this.provider === StorageProvider.AZURE_BLOB && this.azureBlobService) {
      return this.azureBlobService.uploadFile(file, options);
    }

    throw new Error(`Storage service not initialized for provider: ${this.provider}`);
  }

  public async uploadImage(
    file: Buffer,
    options: UploadOptions & {
      resize?: { width?: number; height?: number };
      format?: 'jpeg' | 'png' | 'webp';
      quality?: number;
    }
  ): Promise<UploadResult> {
    let processedImage = sharp(file);

    if (options.resize) {
      processedImage = processedImage.resize(options.resize.width, options.resize.height, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    if (options.format) {
      processedImage = processedImage.toFormat(options.format, {
        quality: options.quality || 80,
      });
    }

    const buffer = await processedImage.toBuffer();

    return this.uploadFile(buffer, {
      ...options,
      contentType: this.getMimeType(options.format || 'jpeg'),
    });
  }

  public async getSignedUrl(
    key: string,
    bucket?: string,
    options?: SignedUrlOptions
  ): Promise<SignedUrlResult> {
    if (this.provider === StorageProvider.S3 && this.s3Service) {
      return this.s3Service.getSignedUrl(key, bucket, options);
    } else if (this.provider === StorageProvider.AZURE_BLOB && this.azureBlobService) {
      return this.azureBlobService.getSignedUrl(key, bucket, options);
    }

    throw new Error(`Storage service not initialized for provider: ${this.provider}`);
  }

  public async deleteFile(options: DeleteFileOptions): Promise<void> {
    if (this.provider === StorageProvider.S3 && this.s3Service) {
      return this.s3Service.deleteFile(options);
    } else if (this.provider === StorageProvider.AZURE_BLOB && this.azureBlobService) {
      return this.azureBlobService.deleteFile(options);
    }

    throw new Error(`Storage service not initialized for provider: ${this.provider}`);
  }

  public validateFileType(fileName: string, allowedTypes: string[]): boolean {
    const mimeType = lookup(fileName);
    if (!mimeType) {
      return false;
    }
    return allowedTypes.includes(mimeType);
  }

  public validateFileSize(sizeBytes: number, maxSizeBytes: number): boolean {
    return sizeBytes <= maxSizeBytes;
  }

  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      svg: 'image/svg+xml',
    };

    return mimeTypes[format] || 'application/octet-stream';
  }
}
