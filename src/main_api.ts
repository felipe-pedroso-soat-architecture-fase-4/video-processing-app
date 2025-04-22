import { GeneratePresignedUrl } from "./application/usecases/GeneratePresignedUrl";
import { GetVideoByUserId } from "./application/usecases/GetVideoByUserId";
import { PrismaVideoRepository, } from "./infra/repositories/VideoRepository";
import { S3VideoStorageService } from "./infra/storage/S3VideoStorageService";
import { VideoController } from "./infra/server/controllers/VideoController";
import express from 'express';
import fs from 'fs';
import path from 'path';
import prisma from "./infra/database";

class App {
  private app: express.Application;
  private port: number;

  constructor(port: number) {
    this.app = express();
    this.port = port;

    this.configureUploads();
    this.configureRoutes();
  }

  private configureUploads() {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  private configureRoutes() {
    const s3StorageService = new S3VideoStorageService()
    const videoRepository = new PrismaVideoRepository(prisma);
    const generatePresignedUrl = new GeneratePresignedUrl(s3StorageService, videoRepository)
    const getVideoByUserId = new GetVideoByUserId(videoRepository);
    
    const videoController = new VideoController(generatePresignedUrl, getVideoByUserId); 

    this.app.post('/videos/generate-upload-url', async (req, res, next) => {
      try {
        await videoController.generateUploadUrl(req, res);
        
      } catch (error) {
        next(error);
      }
    });

    this.app.get('/videos/:userId', async (req, res, next) => {
      try {
        await videoController.listUserVideos(req, res);
      } catch (error) {
        next(error);
      }
    });
  }

  public start() {
    this.app.listen(this.port, () => {
      console.log(`Server running on http://localhost:${this.port}`);
    });
  }
}

new App(3000).start();