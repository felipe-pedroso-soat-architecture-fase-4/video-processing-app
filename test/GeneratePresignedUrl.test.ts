import { GeneratePresignedUrl } from '../src/application/usecases/GeneratePresignedUrl';
import { IStorage } from '../src/domain/ports/IStorage';
import { IVideoRepository } from '../src/domain/ports/IVideoRepository';
import { Video } from '../src/domain/entities/Video';
import { randomUUID } from 'crypto';

jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));

describe('GeneratePresignedUrl', () => {
  let generatePresignedUrl: GeneratePresignedUrl;
  let mockStorage: jest.Mocked<IStorage>;
  let mockVideoRepository: jest.Mocked<IVideoRepository>;
  const mockUserId = 'user-123';
  const mockVideoId = 'video-456';

  beforeEach(() => {
    mockStorage = {
      createPresignedUrl: jest.fn(),
    } as unknown as jest.Mocked<IStorage>;

    mockVideoRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IVideoRepository>;

    (randomUUID as jest.Mock).mockReturnValue(mockVideoId);

    generatePresignedUrl = new GeneratePresignedUrl(
      mockStorage,
      mockVideoRepository
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

 
    it('should generate a presigned URL and create a video with AWAITING_UPLOAD status', async () => {
        const expectedKey = `uploads/${mockUserId}/${mockVideoId}.mp4`;
        const mockPresignedUrl = 'https://presigned.url/example';
        
        mockStorage.createPresignedUrl.mockResolvedValue(mockPresignedUrl);

        const result = await generatePresignedUrl.execute(mockUserId);

        expect(result.video).toBeInstanceOf(Video);
        expect(result.video.id).toBe(mockVideoId);
        expect(result.video.userId).toBe(mockUserId);
        expect(result.video.originalPath).toBe(expectedKey);
        expect(result.video.status).toBe('AWAITING_UPLOAD');

        expect(mockStorage.createPresignedUrl).toHaveBeenCalledWith(
        expectedKey,
        mockUserId,
        mockVideoId
        );
        expect(result.presignedUrl).toBe(mockPresignedUrl);

        // Verify repository was called
        expect(mockVideoRepository.save).toHaveBeenCalledWith(result.video);
    });

    it('should use the correct S3 key format', async () => {
        const expectedKey = `uploads/${mockUserId}/${mockVideoId}.mp4`;
        mockStorage.createPresignedUrl.mockResolvedValue('url');

        await generatePresignedUrl.execute(mockUserId);

        expect(mockStorage.createPresignedUrl).toHaveBeenCalledWith(
        expectedKey,
        mockUserId,
        mockVideoId
        );
    });

    it('should propagate storage errors', async () => {
        const mockError = new Error('Storage error');
        mockStorage.createPresignedUrl.mockRejectedValue(mockError);

        await expect(generatePresignedUrl.execute(mockUserId)).rejects.toThrow(mockError);
        expect(mockVideoRepository.save).not.toHaveBeenCalled();
    });
});