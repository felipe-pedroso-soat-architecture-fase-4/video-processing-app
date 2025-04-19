import { IVideoProcessor } from "../../domain/ports/IVideoProcessor";
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';

export class FFmpegVideoProcessorAdapter implements IVideoProcessor {
    async extractFrames(videoPath: string, outputFolder: string, fps: number = 1): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(outputFolder)) {
                fs.mkdirSync(outputFolder, { recursive: true });
            }

            ffmpeg(videoPath)
                .setFfmpegPath(ffmpegPath || (() => { throw new Error("FFmpeg path is null"); })())
                .outputOptions(`-vf fps=${fps}`)
                .output(`${outputFolder}/frame_%04d.jpg`)
                .on('end', () => resolve(outputFolder))
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(new Error(`Failed to extract frames: ${err.message}`));
                })
                .run();
        });
    }
}