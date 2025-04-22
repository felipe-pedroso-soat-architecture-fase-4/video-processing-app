import { IQueueRepository } from "../../domain/ports/IQueueRepository";
import { IVideoRepository } from "../../domain/ports/IVideoRepository";
import { Video } from "../../domain/entities/Video";

export class EnqueueVideo {
  constructor(
    private readonly queueRepository: IQueueRepository,
    private readonly videoRepository: IVideoRepository
  ) {}

  async execute(videoId: string): Promise<Video> {
    const video = await this.videoRepository.findById(videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    if (video.status !== 'AWAITING_UPLOAD' && video.status !== 'QUEUED') {
      return video; 
    }

    await this.queueRepository.enqueue(video.id, video.userId);

    video.markAsQueued();
    await this.videoRepository.save(video);
    return video
  }
}