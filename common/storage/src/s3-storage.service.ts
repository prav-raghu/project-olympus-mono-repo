import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

export interface S3Config {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    defaultBucket?: string;
    endpoint?: string;
}

export class S3StorageService {
    private readonly client: S3Client;
    private readonly defaultBucket: string;

    constructor(config: S3Config) {
        this.client = new S3Client({
            region: config.region,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
            ...(config.endpoint && { endpoint: config.endpoint }),
        });

        this.defaultBucket = config.defaultBucket || "";
    }

    public async uploadFile(file: Buffer | Readable, options: UploadOptions): Promise<UploadResult> {
        const bucket = options.bucket || this.defaultBucket;
        const key = this.generateKey(options.folder, options.fileName);

        if (options.maxSizeBytes && Buffer.isBuffer(file) && file.length > options.maxSizeBytes) {
            throw new Error(`File size exceeds maximum allowed size of ${options.maxSizeBytes} bytes`);
        }

        if (options.allowedMimeTypes && options.contentType && !options.allowedMimeTypes.includes(options.contentType)) {
            throw new Error(`File type ${options.contentType} is not allowed`);
        }

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: file,
            ContentType: options.contentType,
            Metadata: options.metadata,
            ACL: this.mapAccessLevel(options.accessLevel),
        });

        await this.client.send(command);

        const url = `https://${bucket}.s3.amazonaws.com/${key}`;

        const result: UploadResult = {
            id: key,
            fileName: options.fileName || key,
            originalName: options.fileName || key,
            mimeType: options.contentType || DEFAULT_MIME_TYPE,
            sizeBytes: Buffer.isBuffer(file) ? file.length : 0,
            url,
            provider: StorageProvider.S3,
            bucket,
            key,
            uploadedAt: new Date(),
        };

        if (options.metadata) {
            result.metadata = options.metadata;
        }

        return result;
    }

    public async getSignedUrl(key: string, bucket?: string, options?: SignedUrlOptions): Promise<SignedUrlResult> {
        const targetBucket = bucket || this.defaultBucket;
        const expiresIn = options?.expiresIn || 3600;

        const command = new GetObjectCommand({
            Bucket: targetBucket,
            Key: key,
            ResponseContentType: options?.responseContentType,
            ResponseContentDisposition: options?.responseContentDisposition,
        });

        const url = await getSignedUrl(this.client, command, { expiresIn });

        return {
            url,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
        };
    }

    public async deleteFile(options: DeleteFileOptions): Promise<void> {
        const bucket = options.bucket || this.defaultBucket;

        const command = new DeleteObjectCommand({
            Bucket: bucket,
            Key: options.key,
        });

        await this.client.send(command);
    }

    public async listFiles(options?: ListFilesOptions): Promise<ListFilesResult> {
        const bucket = options?.bucket || this.defaultBucket;

        const command = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: options?.prefix,
            MaxKeys: options?.maxKeys || 1000,
            ContinuationToken: options?.continuationToken,
        });

        const response = await this.client.send(command);

        const files: FileMetadata[] =
            response.Contents?.map((item) => ({
                fileName: item.Key || "",
                mimeType: DEFAULT_MIME_TYPE,
                sizeBytes: item.Size || 0,
                customMetadata: {
                    lastModified: item.LastModified?.toISOString() || "",
                    etag: item.ETag || "",
                },
            })) || [];

        const result: ListFilesResult = {
            files,
            isTruncated: response.IsTruncated || false,
        };

        if (response.NextContinuationToken) {
            result.continuationToken = response.NextContinuationToken;
        }

        return result;
    }

    public async getFileMetadata(key: string, bucket?: string): Promise<FileMetadata> {
        const targetBucket = bucket || this.defaultBucket;

        const command = new HeadObjectCommand({
            Bucket: targetBucket,
            Key: key,
        });

        const response = await this.client.send(command);

        const metadata: FileMetadata = {
            fileName: key,
            mimeType: response.ContentType || DEFAULT_MIME_TYPE,
            sizeBytes: response.ContentLength || 0,
        };

        if (response.Metadata) {
            metadata.customMetadata = response.Metadata;
        }

        return metadata;
    }

    private generateKey(folder?: string, fileName?: string): string {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const key = fileName || `file_${timestamp}_${randomString}`;

        return folder ? `${folder}/${key}` : key;
    }

    private mapAccessLevel(accessLevel?: string): "public-read" | "private" | "authenticated-read" | undefined {
        switch (accessLevel) {
            case "PUBLIC":
                return "public-read";
            case "PRIVATE":
                return "private";
            case "AUTHENTICATED":
                return "authenticated-read";
            default:
                return "private";
        }
    }
}
