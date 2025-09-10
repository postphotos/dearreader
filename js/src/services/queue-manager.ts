import { singleton } from 'tsyringe';
import { Logger } from '../shared/logger.js';

export interface QueueTask {
  id: string;
  url: string;
  priority: number;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

@singleton()
export class QueueManager {
  private queue: QueueTask[] = [];
  private maxSize = 1000;
  private maxConcurrent = 10;
  private activeTasks = 0;

  // Statistics
  private totalRequests = 0;
  private completedRequests = 0;
  private failedRequests = 0;

  // Keep track of all tasks for retrieval
  private allTasks = new Map<string, QueueTask>();

  constructor(private logger: Logger) {}

  async enqueue(task: Omit<QueueTask, 'id' | 'timestamp' | 'status'>): Promise<string> {
    if (this.queue.length >= this.maxSize) {
      throw new Error('Queue is full');
    }

    const queueTask: QueueTask = {
      ...task,
      id: this.generateId(),
      timestamp: Date.now(),
      status: 'pending'
    };

    this.queue.push(queueTask);
    this.totalRequests++;
    this.allTasks.set(queueTask.id, queueTask);
    this.logger.info(`Task enqueued: ${queueTask.id} for ${queueTask.url}`);

    return queueTask.id;
  }

  async dequeue(): Promise<QueueTask | null> {
    if (this.queue.length === 0 || this.activeTasks >= this.maxConcurrent) {
      return null;
    }

    // Sort by priority (higher first) then by timestamp (earlier first)
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.timestamp - b.timestamp;
    });

    const task = this.queue.shift()!;
    task.status = 'processing';
    this.activeTasks++;
    this.logger.info(`Task dequeued: ${task.id}`);

    return task;
  }

  completeTask(taskId: string, result?: any): void {
    const task = this.allTasks.get(taskId);
    if (task) {
      task.status = 'completed';
      task.result = result;
      this.activeTasks--;
      this.completedRequests++;
      this.logger.info(`Task completed: ${taskId}`);
    }
  }

  failTask(taskId: string, error: string): void {
    const task = this.allTasks.get(taskId);
    if (task) {
      task.status = 'failed';
      task.error = error;
      this.activeTasks--;
      this.failedRequests++;
      this.logger.error(`Task failed: ${taskId} - ${error}`);
    }
  }

  getTask(taskId: string): QueueTask | undefined {
    return this.allTasks.get(taskId);
  }

  getStatistics() {
    return {
      total_requests: this.totalRequests,
      active_requests: this.activeTasks,
      pending_requests: this.queue.length,
      completed_requests: this.completedRequests,
      failed_requests: this.failedRequests,
      max_concurrent: this.maxConcurrent
    };
  }

  getAllTasks(): QueueTask[] {
    return [...this.queue];
  }

  clear(): void {
    this.queue.length = 0;
    this.activeTasks = 0;
    this.logger.info('Queue cleared');
  }

  private findTask(taskId: string): QueueTask | undefined {
    return this.queue.find(task => task.id === taskId);
  }

  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
