import { IStorage } from '../../domain/ports/IStorage';
import { IVideoRepository } from '../../domain/ports/IVideoRepository';
import { Video } from '../../domain/entities/Video';
import { randomUUID } from 'crypto';

export class GeneratePresignedUrl {
      private readonly s3Storage: IStorage;
        private readonly videoRepository: IVideoRepository
       constructor(s3Storage: IStorage, videoRepository: IVideoRepository) {
           this.s3Storage = s3Storage;
           this.videoRepository = videoRepository;
       }

    async execute(userId: string): Promise<{ video: Video; presignedUrl: string }> {
        const videoId = randomUUID();
        const key = `uploads/${userId}/${videoId}.mp4`; 

        const video = Video.create({
            id: videoId,
            userId,
            originalPath: key,
        });

        const presignedUrl = await this.s3Storage.createPresignedUrl(key, userId, video.id);
        await this.videoRepository.save(video);
        
        return { presignedUrl, video };
    }
}