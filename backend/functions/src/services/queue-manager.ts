import { Logger } from '../shared/index.js';

export interface QueueJob {
    id: string;
    url: string;
    priority: number;
    timestamp: number;
    attempts: number;
    maxAttempts: number;
    callback?: string; // URL to post results to
    options?: any;
}

export interface QueueConfig {
    maxConcurrent: number;
    maxRetries: number;
    retryDelay: number;
    jobTimeout: number;
}

export class SimpleQueueManager {
    private jobs: Map<string, QueueJob> = new Map();
    private processing: Set<string> = new Set();
    private config: QueueConfig;

    constructor(
        private logger: Logger,
        config: Partial<QueueConfig> = {}
    ) {
        this.config = {
            maxConcurrent: config.maxConcurrent || 3,
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 5000,
            jobTimeout: config.jobTimeout || 60000,
            ...config
        };

        this.logger.info('QueueManager initialized', this.config);
    }

    /**
     * Add a job to the queue
     */
    async addJob(job: Omit<QueueJob, 'id' | 'timestamp' | 'attempts'>): Promise<string> {
        const jobId = this.generateJobId();
        const queueJob: QueueJob = {
            ...job,
            id: jobId,
            timestamp: Date.now(),
            attempts: 0,
            maxAttempts: job.maxAttempts || this.config.maxRetries
        };

        this.jobs.set(jobId, queueJob);
        this.logger.info('Job added to queue', { jobId, url: job.url });

        // Try to process immediately if we have capacity
        this.processNext();

        return jobId;
    }

    /**
     * Get job status
     */
    getJobStatus(jobId: string): { status: 'pending' | 'processing' | 'completed' | 'failed' | 'not_found', job?: QueueJob } {
        const job = this.jobs.get(jobId);
        if (!job) {
            return { status: 'not_found' };
        }

        if (this.processing.has(jobId)) {
            return { status: 'processing', job };
        }

        if (job.attempts >= job.maxAttempts) {
            return { status: 'failed', job };
        }

        return { status: 'pending', job };
    }

    /**
     * Get queue statistics
     */
    getQueueStats() {
        const pending = Array.from(this.jobs.values()).filter(job =>
            !this.processing.has(job.id) && job.attempts < job.maxAttempts
        ).length;

        return {
            total: this.jobs.size,
            pending,
            processing: this.processing.size,
            failed: Array.from(this.jobs.values()).filter(job => job.attempts >= job.maxAttempts).length,
            maxConcurrent: this.config.maxConcurrent
        };
    }

    /**
     * Process the next job in queue
     */
    private async processNext() {
        if (this.processing.size >= this.config.maxConcurrent) {
            return; // Already at max capacity
        }

        // Find next job to process (priority based)
        const nextJob = this.getNextJob();
        if (!nextJob) {
            return; // No jobs to process
        }

        this.processing.add(nextJob.id);
        nextJob.attempts++;

        this.logger.info('Processing job', { jobId: nextJob.id, url: nextJob.url, attempt: nextJob.attempts });

        try {
            // Here you would integrate with the actual crawler
            // For now, this is a placeholder
            await this.processJob(nextJob);

            // Job completed successfully
            this.jobs.delete(nextJob.id);
            this.processing.delete(nextJob.id);

            this.logger.info('Job completed successfully', { jobId: nextJob.id });

        } catch (error: any) {
            this.processing.delete(nextJob.id);

            if (nextJob.attempts >= nextJob.maxAttempts) {
                this.logger.error('Job failed permanently', {
                    jobId: nextJob.id,
                    attempts: nextJob.attempts,
                    error: error?.message || String(error)
                });
            } else {
                this.logger.warn('Job failed, will retry', {
                    jobId: nextJob.id,
                    attempts: nextJob.attempts,
                    error: error?.message || String(error)
                });

                // Schedule retry
                setTimeout(() => this.processNext(), this.config.retryDelay);
            }
        }

        // Process next job
        this.processNext();
    }

    /**
     * Get the next job to process based on priority and timestamp
     */
    private getNextJob(): QueueJob | null {
        const availableJobs = Array.from(this.jobs.values()).filter(job =>
            !this.processing.has(job.id) && job.attempts < job.maxAttempts
        );

        if (availableJobs.length === 0) {
            return null;
        }

        // Sort by priority (higher first) then by timestamp (older first)
        availableJobs.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority; // Higher priority first
            }
            return a.timestamp - b.timestamp; // Older first
        });

        return availableJobs[0];
    }

    /**
     * Process a single job - integrate this with your crawler
     */
    private async processJob(job: QueueJob): Promise<void> {
        // This is a placeholder - you would integrate this with your actual crawler
        // Example:
        // const result = await this.crawlerHost.processUrl(job.url, job.options);
        // if (job.callback) {
        //     await this.notifyCallback(job.callback, result);
        // }

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate random success/failure for demo
                if (Math.random() > 0.1) { // 90% success rate
                    resolve();
                } else {
                    reject(new Error('Simulated processing error'));
                }
            }, 2000); // Simulate 2 second processing time
        });
    }

    /**
     * Generate a unique job ID
     */
    private generateJobId(): string {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clean up old completed/failed jobs
     */
    cleanup(maxAge: number = 24 * 60 * 60 * 1000) { // 24 hours
        const cutoff = Date.now() - maxAge;
        const toDelete: string[] = [];

        for (const [jobId, job] of this.jobs.entries()) {
            if (job.timestamp < cutoff && !this.processing.has(jobId)) {
                toDelete.push(jobId);
            }
        }

        toDelete.forEach(jobId => this.jobs.delete(jobId));

        if (toDelete.length > 0) {
            this.logger.info('Cleaned up old jobs', { count: toDelete.length });
        }
    }
}

// Example Redis-based queue manager (requires redis package)
export class RedisQueueManager {
    // Implementation would use Redis for persistence and distributed processing
    // This is just a placeholder to show the interface

    constructor(private redisUrl: string, private logger: Logger) {
        this.logger.info('RedisQueueManager would be initialized here');
    }

    async addJob(job: Omit<QueueJob, 'id' | 'timestamp' | 'attempts'>): Promise<string> {
        // Redis implementation
        throw new Error('RedisQueueManager not implemented - install redis package');
    }

    getJobStatus(jobId: string) {
        // Redis implementation
        throw new Error('RedisQueueManager not implemented');
    }
}
