import { GetVideoByUserId } from "../src/application/usecases/GetVideoByUserId";
import { IVideoRepository } from "../src/domain/ports/IVideoRepository";
import { Video } from "../src/domain/entities/Video";

describe('GetVideoByUserId', () => {
  let getVideoByUserId: GetVideoByUserId;
  let mockVideoRepository: jest.Mocked<IVideoRepository>;

  beforeEach(() => {
    mockVideoRepository = {
      findAllByUserId: jest.fn().mockResolvedValue([]), // Default to empty array
      save: jest.fn(),
      updateStatus: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<IVideoRepository>;

    getVideoByUserId = new GetVideoByUserId(mockVideoRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return empty array when no videos are found for the user', async () => {
      mockVideoRepository.findAllByUserId.mockResolvedValueOnce(null);

      const result = await getVideoByUserId.execute('user-123');

      expect(result).toEqual([]);
      expect(mockVideoRepository.findAllByUserId).toHaveBeenCalledWith('user-123');
    });

    it('should return an empty array when user has no videos', async () => {
      mockVideoRepository.findAllByUserId.mockResolvedValueOnce([]);

      const result = await getVideoByUserId.execute('user-123');

      expect(result).toEqual([]);
      expect(mockVideoRepository.findAllByUserId).toHaveBeenCalledWith('user-123');
    });

    it('should return mapped video data for user with videos', async () => {
      const mockVideos = [
        new Video(
          'video-1',
          'user-123',
          'COMPLETED',
          'uploads/user-123/video-1.mp4',
          ['frame1.jpg', 'frame2.jpg'],
          undefined,
          'download.zip'
        ),
        new Video(
          'video-2',
          'user-123',
          'PROCESSING',
          'uploads/user-123/video-2.mp4'
        ),
      ];

      mockVideoRepository.findAllByUserId.mockResolvedValueOnce(mockVideos);

      const result = await getVideoByUserId.execute('user-123');

      expect(result).toEqual([
        {
          videoId: 'video-1',
          status: 'COMPLETED',
          frameUrls: ['frame1.jpg', 'frame2.jpg'],
          downloadZipUrl: 'download.zip',
        },
        {
          videoId: 'video-2',
          status: 'PROCESSING',
          frameUrls: [],
          downloadZipUrl: undefined,
        },
      ]);
      expect(mockVideoRepository.findAllByUserId).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array when repository returns null', async () => {
      mockVideoRepository.findAllByUserId.mockResolvedValueOnce(null);

      const result = await getVideoByUserId.execute('user-123');

      expect(result).toEqual([]);
    });

    it('should handle repository errors', async () => {
      const mockError = new Error('Repository error');
      mockVideoRepository.findAllByUserId.mockRejectedValueOnce(mockError);

      await expect(getVideoByUserId.execute('user-123')).rejects.toThrow(mockError);
    });

    it('should return videos with all possible statuses correctly mapped', async () => {
      const allStatuses: Array<Video['status']> = [
        'AWAITING_UPLOAD',
        'QUEUED',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
      ];

      const mockVideos = allStatuses.map((status, index) => 
        new Video(
          `video-${index}`,
          'user-123',
          status,
          `uploads/user-123/video-${index}.mp4`
        )
      );

      mockVideoRepository.findAllByUserId.mockResolvedValueOnce(mockVideos);

      const result = await getVideoByUserId.execute('user-123');

      expect(result).toEqual(
        allStatuses.map((status, index) => ({
          videoId: `video-${index}`,
          status,
          frameUrls: [],
          downloadZipUrl: undefined,
        }))
      );
    });
  });
});