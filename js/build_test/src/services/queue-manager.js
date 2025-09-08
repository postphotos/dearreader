"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
const tsyringe_1 = require("tsyringe");
const logger_js_1 = require("../shared/logger.js");
let QueueManager = class QueueManager {
    constructor(logger) {
        this.logger = logger;
        this.queue = [];
        this.maxSize = 1000;
        this.maxConcurrent = 10;
        this.activeTasks = 0;
        // Statistics
        this.totalRequests = 0;
        this.completedRequests = 0;
        this.failedRequests = 0;
        // Keep track of all tasks for retrieval
        this.allTasks = new Map();
    }
    async enqueue(task) {
        if (this.queue.length >= this.maxSize) {
            throw new Error('Queue is full');
        }
        const queueTask = {
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
    async dequeue() {
        if (this.queue.length === 0 || this.activeTasks >= this.maxConcurrent) {
            return null;
        }
        // Sort by priority (higher first) then by timestamp (earlier first)
        this.queue.sort((a, b) => {
            if (a.priority !== b.priority)
                return b.priority - a.priority;
            return a.timestamp - b.timestamp;
        });
        const task = this.queue.shift();
        task.status = 'processing';
        this.activeTasks++;
        this.logger.info(`Task dequeued: ${task.id}`);
        return task;
    }
    completeTask(taskId, result) {
        const task = this.allTasks.get(taskId);
        if (task) {
            task.status = 'completed';
            task.result = result;
            this.activeTasks--;
            this.completedRequests++;
            this.logger.info(`Task completed: ${taskId}`);
        }
    }
    failTask(taskId, error) {
        const task = this.allTasks.get(taskId);
        if (task) {
            task.status = 'failed';
            task.error = error;
            this.activeTasks--;
            this.failedRequests++;
            this.logger.error(`Task failed: ${taskId} - ${error}`);
        }
    }
    getTask(taskId) {
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
    getAllTasks() {
        return [...this.queue];
    }
    clear() {
        this.queue.length = 0;
        this.activeTasks = 0;
        this.logger.info('Queue cleared');
    }
    findTask(taskId) {
        return this.queue.find(task => task.id === taskId);
    }
    generateId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};
exports.QueueManager = QueueManager;
exports.QueueManager = QueueManager = __decorate([
    (0, tsyringe_1.singleton)(),
    __metadata("design:paramtypes", [logger_js_1.Logger])
], QueueManager);
//# sourceMappingURL=queue-manager.js.map