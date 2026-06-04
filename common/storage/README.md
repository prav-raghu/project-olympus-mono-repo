# Storage Service

Unified storage service supporting S3 and Azure Blob Storage with file upload, download, deletion, and signed URL generation.

## Features

- Multi-provider support (AWS S3, Azure Blob Storage)
- File upload with validation
- Image processing and optimization (Sharp)
- Signed URL generation
- File metadata management
- Type-safe operations

## Installation

```bash
pnpm add @project-olympus/storage
```

## Configuration

### S3 Configuration

```typescript
import { StorageService, StorageProvider } from '@project-olympus/storage';

const storageService = new StorageService({
  provider: StorageProvider.S3,
  s3: {
    region: 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    defaultBucket: 'my-bucket',
  },
});
```

### Azure Blob Configuration

```typescript
const storageService = new StorageService({
  provider: StorageProvider.AZURE_BLOB,
  azureBlob: {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    defaultContainer: 'my-container',
  },
});
```

## Usage

### Upload File

```typescript
const result = await storageService.uploadFile(buffer, {
  folder: 'uploads',
  fileName: 'document.pdf',
  contentType: 'application/pdf',
  maxSizeBytes: 10 * 1024 * 1024,
  allowedMimeTypes: ['application/pdf'],
  accessLevel: FileAccessLevel.PRIVATE,
  metadata: {
    userId: '123',
    uploadedBy: 'admin',
  },
});
```

### Upload and Process Image

```typescript
const result = await storageService.uploadImage(imageBuffer, {
  folder: 'profile-images',
  fileName: 'avatar.jpg',
  resize: { width: 300, height: 300 },
  format: 'webp',
  quality: 85,
  contentType: 'image/webp',
});
```

### Generate Signed URL

```typescript
const signedUrl = await storageService.getSignedUrl('uploads/document.pdf', undefined, {
  expiresIn: 3600,
  responseContentDisposition: 'attachment; filename="document.pdf"',
});
```

### Delete File

```typescript
await storageService.deleteFile({
  key: 'uploads/document.pdf',
});
```

## Validation

```typescript
const isValidType = storageService.validateFileType('document.pdf', ['application/pdf', 'application/msword']);

const isValidSize = storageService.validateFileSize(fileSize, 10 * 1024 * 1024);
```

## Environment Variables

### S3
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET`

### Azure Blob
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_CONTAINER`
