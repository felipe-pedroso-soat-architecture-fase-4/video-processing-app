import { IVideoRepository } from "../../domain/ports/IVideoRepository";
import { Video } from "../../domain/entities/Video";

export class FileSystemVideoRepository implements IVideoRepository {
    private videos: Map<string, Video> = new Map();

    async save(video: Video): Promise<Video> {
        this.videos.set(video.id, video);
        return video;
    }

    async findById(id: string): Promise<Video | null> {
        return this.videos.get(id) || null;
    }
}