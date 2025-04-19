import { IVideoProcessor } from "../../domain/ports/IVideoProcessor";
import { IVideoRepository } from "../../domain/ports/IVideoRepository";
import { IZipper } from "../../domain/ports/IZipper";
import { Video } from "../../domain/entities/Video";

export class ExtractVideoFrames {

    constructor(
        private videoRepository: IVideoRepository,
        private videoProcessor: IVideoProcessor,
        private zipper: IZipper
    ) {
    }

    async execute(file: Express.Multer.File): Promise<{
        id: string;
        zipPath: string;
    }> {
        const video = new Video(
            file.path,
            this.videoProcessor,
            this.zipper
        );
        await video.extractFrames();
        const zipPath = await video.createZip();
        await this.videoRepository.save(video);

        return {
            id: video.id,
            zipPath
        };
    }
}