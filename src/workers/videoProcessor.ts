import { EnqueueVideo } from '../application/usecases/EnqueueVideo';
import { FFmpegVideoProcessorAdapter } from '../infra/adapters/FFmpegWasmVideoProcessor';
import { PrismaVideoRepository } from '../infra/repositories/VideoRepository';
import { ProcessVideo } from '../application/usecases/ProcessVideo';
import { S3VideoStorageService } from '../infra/storage/S3VideoStorageService';
import { SQSClient } from '@aws-sdk/client-sqs';
import { SqsQueueRepository } from '../infra/repositories/SqsQueueRepository';
import { VideoWorker } from './VideoWorker';
import prisma from '../infra/database'; // Sua instância do Prisma

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const videoRepository = new PrismaVideoRepository(prisma);
const storage = new S3VideoStorageService();

const ffmpegProcessor = new FFmpegVideoProcessorAdapter(); 
const processVideo = new ProcessVideo(storage, videoRepository, ffmpegProcessor);
const queueRepository = new SqsQueueRepository();
const enqueueVideo = new EnqueueVideo(queueRepository, videoRepository); 

const worker = new VideoWorker(
  sqsClient,
  storage,
  processVideo,
  enqueueVideo
);

worker.processJobs().catch(error => {
  console.error('Worker crashed:', error);
  process.exit(1);
});