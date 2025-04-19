export interface IVideoProcessor {
    extractFrames(videoPath: string, outputFolder: string): Promise<string>;
}