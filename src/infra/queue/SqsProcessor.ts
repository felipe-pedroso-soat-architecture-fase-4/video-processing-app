import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

export class VideoProcessorQueue {
    private readonly client: SQSClient;

    constructor() {
        this.client = new SQSClient({ 
            region: process.env.AWS_REGION || 'us-east-1'
        });
    }

    async enqueueJob(userId: string, videoKey: string): Promise<void> {
        const command = new SendMessageCommand({
            QueueUrl: process.env.QUEUE_URL,
            MessageBody: JSON.stringify({ userId, videoKey })
        });

        try {
            await this.client.send(command);
            console.log(`Job enqueued for user ${userId}, video ${videoKey}`);
        } catch (error) {
            console.error('Error enqueuing job:', error);
            throw new Error('Failed to enqueue video processing job');
        }
    }
}