import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";
import {
    StorageProvider,
    type DeleteFileOptions,
    type FileMetadata,
    type ListFilesOptions,
    type ListFilesResult,
    type SignedUrlOptions,
    type SignedUrlResult,
    type UploadOptions,
    type UploadResult,
} from "@project-olympus/types";
import { type Readable } from "node:stream";

const DEFAULT_MIME_TYPE = "application/octet-stream";

export interface AzureBlobConfig {
    connectionString: string;
    defaultContainer?: string;
}

export class AzureBlobStorageService {
    private readonly blobServiceClient: BlobServiceClient;
    private readonly defaultContainer: string;

    constructor(config: AzureBlobConfig) {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
        this.defaultContainer = config.defaultContainer || "";
    }

    public async uploadFile(file: Buffer | Readable, options: UploadOptions): Promise<UploadResult> {
        const containerName = options.bucket || this.defaultContainer;
        const blobName = this.generateBlobName(options.folder, options.fileName);

        this.validateFileConstraints(file, options);

        const containerClient = this.blobServiceClient.getContainerClient(containerName);
        await this.ensureContainer(containerClient);

        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const uploadOptions = this.buildUploadOptions(options);

        if (Buffer.isBuffer(file)) {
            await blockBlobClient.upload(file, file.length, uploadOptions);
        } else {
            await blockBlobClient.uploadStream(file, undefined, undefined, uploadOptions);
        }

        const url = blockBlobClient.url;

        const result: UploadResult = {
            id: blobName,
            fileName: options.fileName || blobName,
            originalName: options.fileName || blobName,
            mimeType: options.contentType || DEFAULT_MIME_TYPE,
            sizeBytes: Buffer.isBuffer(file) ? file.length : 0,
            url,
            provider: StorageProvider.AZURE_BLOB,
            bucket: containerName,
            key: blobName,
            uploadedAt: new Date(),
        };

        if (options.metadata) {
            result.metadata = options.metadata;
        }

        return result;
    }

    public async getSignedUrl(blobName: string, containerName?: string, options?: SignedUrlOptions): Promise<SignedUrlResult> {
        const targetContainer = containerName || this.defaultContainer;
        const expiresIn = options?.expiresIn || 3600;

        const containerClient = this.blobServiceClient.getContainerClient(targetContainer);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        const expiresOn = new Date(Date.now() + expiresIn * 1000);

        const { BlobSASPermissions } = await import("@azure/storage-blob");
        const permissions = BlobSASPermissions.parse("r");

        const sasUrl = await blockBlobClient.generateSasUrl({
            permissions,
            expiresOn,
        });

        return {
            url: sasUrl,
            expiresAt: expiresOn,
        };
    }

    public async deleteFile(options: DeleteFileOptions): Promise<void> {
        const containerName = options.bucket || this.defaultContainer;

        const containerClient = this.blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(options.key);

        await blockBlobClient.delete();
    }

    public async listFiles(options?: ListFilesOptions): Promise<ListFilesResult> {
        const containerName = options?.bucket || this.defaultContainer;

        const containerClient = this.blobServiceClient.getContainerClient(containerName);

        const files: FileMetadata[] = [];
        let continuationToken: string | undefined;

        const listOptions: Record<string, unknown> = {};
        if (options?.prefix) {
            listOptions.prefix = options.prefix;
        }

        const pageSettings: Record<string, unknown> = {
            maxPageSize: options?.maxKeys || 1000,
        };
        if (options?.continuationToken) {
            pageSettings.continuationToken = options.continuationToken;
        }

        const iterator = containerClient.listBlobsFlat(listOptions).byPage(pageSettings);

        const page = await iterator.next();

        if (!page.done) {
            for (const blob of page.value.segment.blobItems) {
                files.push({
                    fileName: blob.name,
                    mimeType: blob.properties.contentType || DEFAULT_MIME_TYPE,
                    sizeBytes: blob.properties.contentLength || 0,
                    ...(blob.metadata && { customMetadata: blob.metadata }),
                });
            }
            continuationToken = page.value.continuationToken;
        }

        const result: ListFilesResult = {
            files,
            isTruncated: continuationToken !== undefined,
        };

        if (continuationToken) {
            result.continuationToken = continuationToken;
        }

        return result;
    }

    public async getFileMetadata(blobName: string, containerName?: string): Promise<FileMetadata> {
        const targetContainer = containerName || this.defaultContainer;

        const containerClient = this.blobServiceClient.getContainerClient(targetContainer);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        const properties = await blockBlobClient.getProperties();

        const metadata: FileMetadata = {
            fileName: blobName,
            mimeType: properties.contentType || DEFAULT_MIME_TYPE,
            sizeBytes: properties.contentLength || 0,
        };

        if (properties.metadata) {
            metadata.customMetadata = properties.metadata;
        }

        return metadata;
    }

    private async ensureContainer(containerClient: ContainerClient): Promise<void> {
        const exists = await containerClient.exists();
        if (!exists) {
            await containerClient.create();
        }
    }

    private generateBlobName(folder?: string, fileName?: string): string {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const name = fileName || `file_${timestamp}_${randomString}`;

        return folder ? `${folder}/${name}` : name;
    }

    private validateFileConstraints(file: Buffer | Readable, options: UploadOptions): void {
        if (options.maxSizeBytes && Buffer.isBuffer(file) && file.length > options.maxSizeBytes) {
            throw new Error(`File size exceeds maximum allowed size of ${options.maxSizeBytes} bytes`);
        }

        if (options.allowedMimeTypes && options.contentType && !options.allowedMimeTypes.includes(options.contentType)) {
            throw new Error(`File type ${options.contentType} is not allowed`);
        }
    }

    private buildUploadOptions(options: UploadOptions): Record<string, unknown> {
        const uploadOptions: Record<string, unknown> = {};
        if (options.contentType) {
            uploadOptions.blobHTTPHeaders = { blobContentType: options.contentType };
        }
        if (options.metadata) {
            uploadOptions.metadata = options.metadata;
        }
        return uploadOptions;
    }
}
