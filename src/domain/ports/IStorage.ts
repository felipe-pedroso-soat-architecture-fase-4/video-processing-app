import { Readable } from "stream";

export interface IStorage {
    saveStream(key: string, stream: Readable): Promise<void>;
    createPresignedUrl(key: string, userId: string, videoId: string): Promise<string>;
    exists(key: string): Promise<boolean>;
    save(key: string, data: Buffer): Promise<void>;
    get(key: string): Promise<Buffer>;
}