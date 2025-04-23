import { IStorage } from '../src/domain/ports/IStorage';
import { IVideoProcessor } from '../src/domain/ports/IVideoProcessor';
import { IVideoRepository } from '../src/domain/ports/IVideoRepository';
import { ProcessVideo } from '../src/application/usecases/ProcessVideo';
import { Video } from '../src/domain/entities/Video';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { zipDirectory } from '../src/utils/zipDirectory';

jest.mock('fs');
jest.mock('os');
jest.mock('path');
jest.mock('../src/utils/zipDirectory');

describe('ProcessVideo', () => {
  let processVideo: ProcessVideo;
  let mockStorage: jest.Mocked<IStorage>;
  let mockVideoRepository: jest.Mocked<IVideoRepository>;
  let mockVideoProcessor: jest.Mocked<IVideoProcessor>;
  const mockVideoId = 'video-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    mockStorage = {
      exists: jest.fn(),
      get: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<IStorage>;

    mockVideoRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<IVideoRepository>;

    mockVideoProcessor = {
      extractFrames: jest.fn(),
    } as unknown as jest.Mocked<IVideoProcessor>;

    processVideo = new ProcessVideo(
      mockStorage,
      mockVideoRepository,
      mockVideoProcessor
    );

    (os.tmpdir as jest.Mock).mockReturnValue('/tmp');
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.readdirSync as jest.Mock).mockReturnValue(['frame_0001.jpg', 'frame_0002.jpg']);
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test'));
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (fs.rmSync as jest.Mock).mockImplementation(() => {});
    (zipDirectory as jest.Mock).mockResolvedValue(undefined);

    process.env.AWS_BUCKET_NAME = 'test-bucket';
    process.env.AWS_REGION = 'us-east-1';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const mockVideo = new Video(
      mockVideoId,
      mockUserId,
      'QUEUED',
      'uploads/user-456/video-123.mp4'
    );

    it('should process video successfully', async () => {
        const mockVideo = new Video(
          mockVideoId,
          mockUserId,
          'QUEUED',
          'uploads/user-456/video-123.mp4'
        );
      
        const markAsProcessingSpy = jest.spyOn(mockVideo, 'markAsProcessing');
      
        mockVideoRepository.findById.mockResolvedValue(mockVideo);
        mockStorage.exists.mockResolvedValue(true);
        mockStorage.get.mockResolvedValue(Buffer.from('video-data'));
        mockVideoProcessor.extractFrames.mockResolvedValue(`/tmp/video_${mockVideoId}/frames`);
        mockStorage.save.mockImplementation(async () => {});
      
        await processVideo.execute(mockVideoId);
      
        expect(mockVideoRepository.findById).toHaveBeenCalledWith(mockVideoId);
      
        expect(mockStorage.exists).toHaveBeenCalledWith(mockVideo.originalPath);
      
        expect(markAsProcessingSpy).toHaveBeenCalled();
        expect(mockVideoRepository.save).toHaveBeenCalledWith(mockVideo);
      
        const expectedTempDir = `/tmp/video_${mockVideoId}`;
        expect(fs.mkdirSync).toHaveBeenCalledWith(expectedTempDir, { recursive: true });
      
        expect(mockStorage.get).toHaveBeenCalledWith(mockVideo.originalPath);
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          `${expectedTempDir}/input.mp4`, 
          Buffer.from('video-data')
        );
      
        expect(mockVideoProcessor.extractFrames).toHaveBeenCalledWith(
          `${expectedTempDir}/input.mp4`,
          `${expectedTempDir}/frames`
        );
      
        expect(fs.readdirSync).toHaveBeenCalledWith(`${expectedTempDir}/frames`);
        expect(mockStorage.save).toHaveBeenCalledTimes(3); // 2 frames + zip
      
        expect(zipDirectory).toHaveBeenCalledWith(
          `${expectedTempDir}/frames`,
          `${expectedTempDir}/frames.zip`
        );
      
        expect(mockVideo.status).toBe('COMPLETED');
        expect(mockVideo.downloadZipUrl).toBe(
          `https://test-bucket.s3.us-east-1.amazonaws.com/processed/${mockVideoId}/frames_${mockVideoId}.zip`
        );
        expect(mockVideoRepository.save).toHaveBeenCalledTimes(2);
      
        expect(fs.rmSync).toHaveBeenCalledWith(expectedTempDir, { recursive: true });
      
        markAsProcessingSpy.mockRestore();
      });

    it('should throw error when video not found', async () => {
        mockVideoRepository.findById.mockResolvedValue(null);
      
        await expect(processVideo.execute(mockVideoId)).rejects.toThrow('Video not found');
        
        expect(mockVideoRepository.updateStatus).toHaveBeenCalledWith(
          mockVideoId,
          'FAILED',
          'Video not found'
        );
    });

    it('should throw error when video file not found in storage', async () => {
      mockVideoRepository.findById.mockResolvedValue(mockVideo);
      mockStorage.exists.mockResolvedValue(false);

      await expect(processVideo.execute(mockVideoId)).rejects.toThrow(
        `Video file not found at ${mockVideo.originalPath}`
      );
      expect(mockVideoRepository.updateStatus).toHaveBeenCalledWith(
        mockVideoId,
        'FAILED',
        expect.stringContaining('Video file not found')
      );
    });

    it('should handle zip creation failure', async () => {
      mockVideoRepository.findById.mockResolvedValue(mockVideo);
      mockStorage.exists.mockResolvedValue(true);
      mockStorage.get.mockResolvedValue(Buffer.from('video-data'));
      mockVideoProcessor.extractFrames.mockResolvedValue('/tmp/video_123/frames');
      (zipDirectory as jest.Mock).mockRejectedValue(new Error('Zip failed'));

      await expect(processVideo.execute(mockVideoId)).rejects.toThrow('Zip failed');
      expect(mockVideoRepository.updateStatus).toHaveBeenCalledWith(
        mockVideoId,
        'FAILED',
        'Zip failed'
      );
    });

    it('should handle temporary directory cleanup failure', async () => {
      mockVideoRepository.findById.mockResolvedValue(mockVideo);
      mockStorage.exists.mockResolvedValue(true);
      (fs.rmSync as jest.Mock).mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      await expect(processVideo.execute(mockVideoId)).rejects.toThrow('Cleanup failed');
      expect(mockVideoRepository.updateStatus).toHaveBeenCalledWith(
        mockVideoId,
        'FAILED',
        'Cleanup failed'
      );
    });

    it('should update status to FAILED with error message when processing fails', async () => {
      const errorMessage = 'Random processing error';
      mockVideoRepository.findById.mockResolvedValue(mockVideo);
      mockStorage.exists.mockResolvedValue(true);
      mockStorage.get.mockRejectedValue(new Error(errorMessage));

      await expect(processVideo.execute(mockVideoId)).rejects.toThrow(errorMessage);
      expect(mockVideoRepository.updateStatus).toHaveBeenCalledWith(
        mockVideoId,
        'FAILED',
        errorMessage
      );
    });
  });

  describe('processFrames', () => {
    it('should process and upload frames correctly', async () => {
      const framesDir = '/tmp/frames';
      const mockFrameFiles = ['frame_0001.jpg', 'frame_0002.jpg'];
      (fs.readdirSync as jest.Mock).mockReturnValue(mockFrameFiles);
      mockStorage.save.mockImplementation(async () => {});

      const result = await processVideo['processFrames'](framesDir, mockVideoId);

      expect(result).toEqual([
        `processed/${mockVideoId}/frame_0001.jpg`,
        `processed/${mockVideoId}/frame_0002.jpg`
      ]);
      expect(mockStorage.save).toHaveBeenCalledTimes(2);
    });

    it('should filter and sort frame files correctly', async () => {
      const framesDir = '/tmp/frames';
      const mockFrameFiles = [
        'frame_0001.jpg',
        'not_a_frame.txt',
        'frame_0002.jpg',
        'thumb.png',
        'frame_0003.jpg'
      ];
      (fs.readdirSync as jest.Mock).mockReturnValue(mockFrameFiles);
      mockStorage.save.mockImplementation(async () => {});

      const result = await processVideo['processFrames'](framesDir, mockVideoId);

      expect(result).toEqual([
        `processed/${mockVideoId}/frame_0001.jpg`,
        `processed/${mockVideoId}/frame_0002.jpg`,
        `processed/${mockVideoId}/frame_0003.jpg`
      ]);
    });
  });

  describe('buildS3Url', () => {
    it('should build correct S3 URL', () => {
      const key = 'processed/video-123/frames.zip';
      const result = processVideo['buildS3Url'](key);

      expect(result).toBe(
        'https://test-bucket.s3.us-east-1.amazonaws.com/processed/video-123/frames.zip'
      );
    });
  });
});