import { Request, Response } from 'express';

import { ExtractVideoFrames } from "../../../application/usecases/ExtractVideoFrames";
import fs from 'fs';

export class VideoController {
    constructor(
        private extractFramesUseCase: ExtractVideoFrames
    ) {}

    async uploadVideo(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "No file uploaded" });
            }
            const { zipPath } = await this.extractFramesUseCase.execute(req.file);
            
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', 'attachment; filename="frames.zip"');
            
            fs.createReadStream(zipPath).pipe(res);
        } catch (error) {
            console.error('Error processing video:', error);
            res.status(500).json({ error: "Failed to process video" });
        }
    }
}