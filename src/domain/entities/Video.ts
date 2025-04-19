import { IVideoProcessor } from "../ports/IVideoProcessor";
import { IZipper } from "../ports/IZipper";
import { randomUUID } from "crypto";

export class Video {
    public readonly framesPath: string;
    public zipPath: string | null = null;
    public readonly id: string;
    
    constructor(
        public readonly originalPath: string,
        private readonly processor: IVideoProcessor,
        private readonly zipper: IZipper
    ) {
        this.id = this.generateId();
        this.framesPath = `${originalPath}_frames/`;
    }

    public async extractFrames(): Promise<void> {
        await this.processor.extractFrames(this.originalPath, this.framesPath);
    }

    public async createZip(): Promise<string> {
        this.zipPath = await this.zipper.createZip(this.framesPath, this.id);
        if (!this.zipPath) {
            throw new Error("Failed to create zip file");
        }
        return this.zipPath;
    }

    private generateId(): string {
        return randomUUID();
    }
}