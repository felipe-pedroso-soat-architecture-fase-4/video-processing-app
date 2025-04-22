import archiver from 'archiver';
import fs from 'fs';

export async function zipDirectory(sourceDir: string, outPath: string): Promise<void> {
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
        archive.directory(sourceDir, false).on('error', reject).pipe(output);
        output.on('close', resolve);
        archive.finalize();
    });
}
