
export class Video {
    constructor(
      public readonly id: string,
      public readonly userId: string,
      public status: 'AWAITING_UPLOAD' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
      public readonly originalPath: string,
      public frameUrls: string[] = [],
      public error?: string,
      public downloadZipUrl?: string,
    ) {}
  
    static create(input: {
      id: string;
      userId: string;
      originalPath: string;
    }): Video {

      if (!input.id || !input.userId || !input.originalPath) {
        throw new Error('Invalid input data for creating a Video entity');
      }
      return new Video(
        input.id,
        input.userId,
        'AWAITING_UPLOAD',
        input.originalPath
      );
    }

    markAsQueued(): void {
      this.status = 'QUEUED';
    }
    
    markAsProcessing(): void {
      this.status = 'PROCESSING';
    }
}