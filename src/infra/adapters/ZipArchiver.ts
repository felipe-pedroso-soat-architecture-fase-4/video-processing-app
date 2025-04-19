import { IZipper } from "../../domain/ports/IZipper";
import archiver from 'archiver';
import fs from 'fs';

export class ZipArchiver implements IZipper {
    async createZip(folderPath: string, zipName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const outputPath = `${folderPath}${zipName}.zip`;
            const output = fs.createWriteStream(outputPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => resolve(outputPath));
            archive.on('error', (err) => reject(err));

            archive.pipe(output);
            archive.directory(folderPath, false);
            archive.finalize();
        });
    }
}