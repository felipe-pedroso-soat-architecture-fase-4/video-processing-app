import { Video } from "../entities/Video";

export interface IVideoRepository {
    save(video: Video): Promise<Video>;
    findById(id: string): Promise<Video | null>;
}