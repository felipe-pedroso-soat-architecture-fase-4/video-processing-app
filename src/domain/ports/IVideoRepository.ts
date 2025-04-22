import { Video } from "../entities/Video";

export interface IVideoRepository {
    save(video: Video): Promise<void>;
    findAllByUserId(userId: string): Promise<Video[] | null>;
    updateStatus(id: string, status: string, error?: string | null): Promise<void>;
    findById(id: string): Promise<Video | null>;
}