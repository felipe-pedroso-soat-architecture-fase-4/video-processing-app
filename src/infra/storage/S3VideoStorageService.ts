import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { IStorage } from '../../domain/ports/IStorage';
import { Readable } from "stream";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class S3VideoStorageService implements IStorage {
    private readonly client: S3Client;
    private readonly bucketName: string;

    constructor() {
        this.client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
            }
        });
        this.bucketName = process.env.AWS_BUCKET_NAME!;
    }

    async save(key: string, data: Buffer): Promise<void> {
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: data
            })
        );
    }

    async get(key: string): Promise<Buffer> {
        try {
            const { Body } = await this.client.send(
                new GetObjectCommand({
                    Bucket: this.bucketName,
                    Key: key
                })
            );
    
            if (!Body) {
                throw new Error(`Empty response body for key: ${key}`);
            }
    
            return await new Promise((resolve, reject) => {
                const chunks: Uint8Array[] = [];
                (Body as Readable).on('data', (chunk) => chunks.push(chunk));
                (Body as Readable).on('error', reject);
                (Body as Readable).on('end', () => resolve(Buffer.concat(chunks)));
            });
        } catch (error: any) {
            console.error(`Error getting object ${key} from S3:`, error);
            throw new Error(`Failed to download file: ${error.message}`);
        }
    }

    async saveStream(key: string, stream: Readable): Promise<void> {
        const upload = new Upload({
            client: this.client,
            params: {
                Bucket: this.bucketName,
                Key: key,
                Body: stream
            }
        });
        await upload.done();
    }

    async createPresignedUrl(key: string, userId: string, videoId: string): Promise<string> {
       const presignedUrl = await getSignedUrl(
            this.client,
            new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                ContentType: 'video/mp4', 
                Metadata: {        
                    userId,         
                    originalName: `video-${videoId}`
                }
            }),
            { expiresIn: 3600 }
        );
        return presignedUrl;
    }

    async exists(key: string): Promise<boolean> {
        try {
            await this.client.send(
                new HeadObjectCommand({
                    Bucket: this.bucketName,
                    Key: key
                })
            );
            return true;
        } catch (error) {
            if ((error as { name: string }).name === 'NotFound') {
                return false;
            }
            throw error;
        }
    }
}