import { IStorage } from "../../domain/ports/IStorage";
import { IVideoProcessor } from "../../domain/ports/IVideoProcessor";
import { IVideoRepository } from "../../domain/ports/IVideoRepository";
import fs from 'fs';
import os from 'os';
import path from 'path';
import { zipDirectory } from "../../utils/zipDirectory";

export class ProcessVideo {
    constructor(
        private storage: IStorage,
        private videoRepository: IVideoRepository,
        private videoProcessor: IVideoProcessor
    ) {}

    async execute(videoId: string) {
        let tempDir = '';

        try {
            const video = await this.videoRepository.findById(videoId);
            if (!video) throw new Error('Video not found');

            const exists = await this.storage.exists(video.originalPath);
            if (!exists) {
                throw new Error(`Video file not found at ${video.originalPath}`);
            }

            video.markAsProcessing();
            await this.videoRepository.save(video);

            const tempDir = path.join(os.tmpdir(), `video_${videoId}`);
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const localVideoPath = path.join(tempDir, 'input.mp4');
            const videoBuffer = await this.storage.get(video.originalPath);

            fs.writeFileSync(localVideoPath, videoBuffer);

            const framesDir = await this.videoProcessor.extractFrames(
                localVideoPath,
                path.join(tempDir, 'frames')
            );

            video.frameUrls = await this.processFrames(framesDir, video.id);
           
            const zipPath = path.join(tempDir, 'frames.zip');
            await zipDirectory(framesDir, zipPath);

            const zipFileName = `frames_${video.id}.zip`;
            const zipData = fs.readFileSync(zipPath);
            const zipS3Path = `processed/${video.id}/${zipFileName}`;
            await this.storage.save(zipS3Path, zipData);

            video.downloadZipUrl = this.buildS3Url(zipS3Path);

            video.status = 'COMPLETED';
            console.log(`Frames processed and saved for video ${videoId}`);

            await this.videoRepository.save(video);
            fs.rmSync(tempDir, { recursive: true });

        } catch (error: any) {
            console.error('Error processing video:', error);

            if (tempDir && fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true });
            }
            
            if (videoId) {
                await this.videoRepository.updateStatus(videoId, 'FAILED', error?.message);
            }
            throw error;
        }
    }

    private async processFrames(framesDir: string, videoId: string): Promise<string[]> {
        const frameFiles = fs.readdirSync(framesDir)
            .filter(file => file.match(/frame_\d{4}\.jpg$/))
            .sort();

        return Promise.all(
            frameFiles.map(async (file) => {
                const framePath = path.join(framesDir, file);
                const frameData = fs.readFileSync(framePath);
                const storagePath = `processed/${videoId}/${file}`;
                
                await this.storage.save(storagePath, frameData);
                return storagePath;
            })
        );
    }

    private buildS3Url(key: string): string {
        const bucketName = process.env.AWS_BUCKET_NAME!;
        const region = process.env.AWS_REGION!;
        return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
    }
}