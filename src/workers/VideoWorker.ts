import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

import { EnqueueVideo } from '../application/usecases/EnqueueVideo';
import { IStorage } from '../domain/ports/IStorage';
import { ProcessVideo } from '../application/usecases/ProcessVideo ';

export class VideoWorker {
    constructor(
        private sqsClient: SQSClient,
        private storage: IStorage,
        private processVideo: ProcessVideo,
        private enqueueVideo: EnqueueVideo
    ) {}

    async processJobs() {
        while (true) {
            try {
                const { Messages } = await this.sqsClient.send(new ReceiveMessageCommand({
                    QueueUrl: process.env.QUEUE_URL,
                    MaxNumberOfMessages: 1,
                    WaitTimeSeconds: 20,
                    VisibilityTimeout: 30 
                }));

                if (!Messages || Messages.length === 0) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue;
                }

                const message = Messages[0];
                const body = JSON.parse(message.Body!);

                let videoId: string;
                if (body.Records) {
                    // Formato S3 Event Notification
                    const record = body.Records[0];
                    const key = record.s3.object.key; // "uploads/user-123/video-id.mp4"
                    videoId = key.split('/').pop()?.replace('.mp4', '') || '';
                    console.log(`Processando upload do vídeo ${videoId} (S3 Event)`);

                    const newEntityVideo = await this.enqueueVideo.execute(videoId)

                    if (newEntityVideo.status !== 'AWAITING_UPLOAD' && newEntityVideo.status !== 'QUEUED'){
                        await this.deleteMessage(message.ReceiptHandle!);
                        console.error(`Status inválido: ${newEntityVideo.status}. Removendo da fila...`);
                        continue;
                    }

                    const fileExists = await this.storage.exists(newEntityVideo.originalPath);
                    if (!fileExists) {
                        console.error(`Arquivo do vídeo ${videoId} não encontrado no S3`);
                        await this.deleteMessage(message.ReceiptHandle!);
                        continue;
                    }

                    await this.processVideo.execute(videoId);
                    await this.deleteMessage(message.ReceiptHandle!);
                }

            } catch (error) {
                console.error('Erro no worker:', error);
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
    }

    private async deleteMessage(receiptHandle: string) {
        await this.sqsClient.send(new DeleteMessageCommand({
            QueueUrl: process.env.QUEUE_URL,
            ReceiptHandle: receiptHandle
        }));
    }
}

