import { IVideoRepository } from "../../domain/ports/IVideoRepository";

export class GetVideoByUserId {
    constructor(
        private readonly videoRepository: IVideoRepository
    ) {}

    async execute(userId: string) {
        const videos = await this.videoRepository.findAllByUserId(userId);
        return videos?.map(video => ({
            videoId: video.id,
            status: video.status,
            frameUrls: video.frameUrls,
            downloadZipUrl: video.downloadZipUrl,
        }));
    }
}