import { Request, Response } from 'express';

import { GeneratePresignedUrl } from '../../../application/usecases/GeneratePresignedUrl';
import { GetVideoByUserId } from '../../../application/usecases/GetVideoByUserId';

export class VideoController {
    constructor(
        private generatePresignedUrl: GeneratePresignedUrl,
        private getVideoByUserId: GetVideoByUserId
    ) {}

    async generateUploadUrl(req: Request, res: Response) {
        try {
            const userId = 'user-123'; 
          
            const { video, presignedUrl } = await this.generatePresignedUrl.execute(userId);
           
            return res.status(200).json({ 
                uploadUrl: presignedUrl,
                videoId: video.id,
                status: video.status
            });
           
        } catch (error) {
            console.error('Error processing video:', error);
            res.status(500).json({ error: "Failed to process video" });
        }
    }

    async listUserVideos(req: Request, res: Response) {
        try {
            const videos = await this.getVideoByUserId.execute(req.params.userId);
            res.status(200).json(
                videos?.map(video => ({
                    videoId: video.videoId,
                    status: video.status,
                    frameUrls: video.frameUrls,
                    downloadZipUrl: video.downloadZipUrl
                }))
            );
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch videos" });
        }
    }
}