import { IVideoRepository } from "../../domain/ports/IVideoRepository";
import { PrismaClient } from '@prisma/client';
import { Video } from '../../domain/entities/Video';

export class PrismaVideoRepository implements IVideoRepository {

    constructor(private readonly prisma: PrismaClient) {}

    async save(video: Video): Promise<void> {
        await this.prisma.videoJob.upsert({
          where: { id: video.id },
          update: {
            status: video.status,
            frameUrls: video.frameUrls,
            error: video.error,
            downloadZipUrl: video.downloadZipUrl,
          },
          create: {
            id: video.id,
            userId: video.userId,
            originalPath: video.originalPath,
            status: video.status,
            frameUrls: video.frameUrls,
            downloadZipUrl: video.downloadZipUrl,
          },
        });
      }

    async findAllByUserId(userId: string): Promise<Video[]> {
      const records = await this.prisma.videoJob.findMany({
          where: { userId },  // Filtra por userId
          orderBy: { createdAt: 'desc' }  // Opcional: ordena por data
      }) as Video[];
  
      return records?.map(record => 
          new Video(
              record.id,
              record.userId,
              record.status as any,
              record.originalPath,
              record.frameUrls,
              record.error || undefined,
              record.downloadZipUrl || undefined
          )
      );
    }

    async findById(id: string): Promise<Video | null> {
      const record = await this.prisma.videoJob.findUnique({
        where: { id },
      });
  
      if (!record) return null;
  
      return new Video(
        record.id,
        record.userId,
        record.status as any,
        record.originalPath,
        record.frameUrls,
        record.error || undefined
      );
    }

    async updateStatus(id: string, status: string,  error?: string | null): Promise<void> {
      await this.prisma.videoJob.update({
        where: { id },
        data: { 
          status,
          ...(error !== undefined && { error }),
         },
      });
    }
  }