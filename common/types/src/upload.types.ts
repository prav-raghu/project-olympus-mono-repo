export enum StorageProvider {
  S3 = 'S3',
  AZURE_BLOB = 'AZURE_BLOB',
  LOCAL = 'LOCAL',
}

export enum FileAccessLevel {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  AUTHENTICATED = 'AUTHENTICATED',
}

export interface UploadOptions {
  bucket?: string;
  folder?: string;
  fileName?: string;
  contentType?: string;
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  accessLevel?: FileAccessLevel;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  provider: StorageProvider;
  bucket?: string;
  key?: string;
  uploadedAt: Date;
  metadata?: Record<string, string>;
}

export interface SignedUrlOptions {
  expiresIn?: number;
  responseContentType?: string;
  responseContentDisposition?: string;
}

export interface SignedUrlResult {
  url: string;
  expiresAt: Date;
}

export interface FileMetadata {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy?: string;
  tags?: string[];
  customMetadata?: Record<string, string>;
}

export interface DeleteFileOptions {
  bucket?: string;
  key: string;
}

export interface ListFilesOptions {
  bucket?: string;
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export interface ListFilesResult {
  files: FileMetadata[];
  continuationToken?: string;
  isTruncated: boolean;
}
