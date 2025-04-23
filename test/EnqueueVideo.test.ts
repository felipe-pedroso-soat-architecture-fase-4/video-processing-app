import { EnqueueVideo } from "../src/application/usecases/EnqueueVideo";
import { IQueueRepository } from "../src/domain/ports/IQueueRepository";
import { IVideoRepository } from "../src/domain/ports/IVideoRepository";
import { Video } from "../src/domain/entities/Video";

describe("EnqueueVideo", () => {
  let enqueueVideo: EnqueueVideo;
  let mockQueueRepository: jest.Mocked<IQueueRepository>;
  let mockVideoRepository: jest.Mocked<IVideoRepository>;

  beforeEach(() => {
    mockQueueRepository = {
      enqueue: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IQueueRepository>;

    mockVideoRepository = {
      findById: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IVideoRepository>;

    enqueueVideo = new EnqueueVideo(mockQueueRepository, mockVideoRepository);
  });

  it("should throw an error when video is not found", async () => {
    mockVideoRepository.findById.mockResolvedValueOnce(null);

    await expect(enqueueVideo.execute("nonexistent-id")).rejects.toThrow(
      "Video not found"
    );
  });

  it("should return the video without enqueuing when status is not AWAITING_UPLOAD or QUEUED", async () => {
    const mockVideo = new Video(
      "123",
      "user-1",
      "PROCESSING",
      "/path/to/video"
    );
    mockVideoRepository.findById.mockResolvedValueOnce(mockVideo);

    const result = await enqueueVideo.execute("123");

    expect(result).toBe(mockVideo);
    expect(mockQueueRepository.enqueue).not.toHaveBeenCalled();
    expect(mockVideoRepository.save).not.toHaveBeenCalled();
  });

  it("should enqueue the video and update status when video is AWAITING_UPLOAD", async () => {
    const mockVideo = new Video(
      "123",
      "user-1",
      "AWAITING_UPLOAD",
      "/path/to/video"
    );
    mockVideoRepository.findById.mockResolvedValueOnce(mockVideo);

    const result = await enqueueVideo.execute("123");

    expect(mockQueueRepository.enqueue).toHaveBeenCalledWith("123", "user-1");
    expect(mockVideo.status).toBe("QUEUED");
    expect(mockVideoRepository.save).toHaveBeenCalledWith(mockVideo);
    expect(result).toBe(mockVideo);
  });

  it("should enqueue the video and update status when video is QUEUED", async () => {
    const mockVideo = new Video(
      "123",
      "user-1",
      "QUEUED",
      "/path/to/video"
    );
    mockVideoRepository.findById.mockResolvedValueOnce(mockVideo);

    const result = await enqueueVideo.execute("123");

    expect(mockQueueRepository.enqueue).toHaveBeenCalledWith("123", "user-1");
    expect(mockVideo.status).toBe("QUEUED");
    expect(mockVideoRepository.save).toHaveBeenCalledWith(mockVideo);
    expect(result).toBe(mockVideo);
  });

  it("should handle repository errors during enqueue", async () => {
    const mockVideo = new Video(
      "123",
      "user-1",
      "AWAITING_UPLOAD",
      "/path/to/video"
    );
    mockVideoRepository.findById.mockResolvedValueOnce(mockVideo);
    mockQueueRepository.enqueue.mockRejectedValueOnce(
      new Error("Queue error")
    );

    await expect(enqueueVideo.execute("123")).rejects.toThrow("Queue error");
    expect(mockVideo.status).toBe("AWAITING_UPLOAD");
    expect(mockVideoRepository.save).not.toHaveBeenCalled();
  });

  it("should handle repository errors during save", async () => {
    const mockVideo = new Video(
      "123",
      "user-1",
      "AWAITING_UPLOAD",
      "/path/to/video"
    );
    mockVideoRepository.findById.mockResolvedValueOnce(mockVideo);
    mockVideoRepository.save.mockRejectedValueOnce(new Error("Save error"));

    await expect(enqueueVideo.execute("123")).rejects.toThrow("Save error");
    expect(mockQueueRepository.enqueue).toHaveBeenCalled();
  });
});