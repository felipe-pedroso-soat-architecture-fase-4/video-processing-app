import { ExtractVideoFrames } from "./application/usecases/ExtractVideoFrames";
import { FFmpegVideoProcessorAdapter } from './infra/adapters/FFmpegWasmVideoProcessor';
import { FileSystemVideoRepository } from "./infra/repositories/FileSystemVideoRepository";
import { VideoController } from "./infra/server/controllers/VideoController";
import { ZipArchiver } from "./infra/adapters/ZipArchiver";
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';

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
    const videoRepository = new FileSystemVideoRepository();
    const videoProcessor = new FFmpegVideoProcessorAdapter();
    const zipper = new ZipArchiver();
    
    const extractFramesUseCase = new ExtractVideoFrames(
      videoRepository,
      videoProcessor,
      zipper
    );

    const videoController = new VideoController(extractFramesUseCase);

    const storage = multer.diskStorage({
      destination: path.join(__dirname, 'uploads'),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `${randomUUID()}-${ext}`;
        cb(null, filename);
      }
    });
    const upload = multer({ storage });

    this.app.post('/videos/upload', upload.single('file'), async (req, res, next) => {
      try {
        await videoController.uploadVideo(req, res);
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

// Start the application
new App(3000).start();