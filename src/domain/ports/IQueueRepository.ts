export interface IQueueRepository {
    enqueue(videoId: string, userId: string): Promise<void>;
}