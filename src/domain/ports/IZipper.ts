export interface IZipper {
    createZip(folderPath: string, zipName: string): Promise<string>;
}