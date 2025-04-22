import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

import { IQueueRepository } from "../../domain/ports/IQueueRepository";

export class SqsQueueRepository implements IQueueRepository {
  private readonly client = new SQSClient({ region: process.env.AWS_REGION });

  async enqueue(videoId: string, userId: string): Promise<void> {
    const command = new SendMessageCommand({
      QueueUrl: process.env.QUEUE_URL,
      MessageBody: JSON.stringify({ videoId, userId }),
    });

    await this.client.send(command);
  }
}