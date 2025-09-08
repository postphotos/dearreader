"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const chai_1 = require("chai");
const queue_manager_js_1 = require("../queue-manager.js");
describe('QueueManager', () => {
    let queueManager;
    let mockLogger;
    beforeEach(() => {
        mockLogger = {
            info: () => { },
            error: () => { },
            warn: () => { },
            debug: () => { }
        };
        queueManager = new queue_manager_js_1.QueueManager(mockLogger);
    });
    describe('Basic Queue Operations', () => {
        it('should initialize with empty queue', () => {
            (0, chai_1.expect)(queueManager.getAllTasks()).to.be.an('array').that.is.empty;
            const stats = queueManager.getStatistics();
            (0, chai_1.expect)(stats.total_requests).to.equal(0);
            (0, chai_1.expect)(stats.active_requests).to.equal(0);
            (0, chai_1.expect)(stats.pending_requests).to.equal(0);
        });
        it('should enqueue tasks correctly', async () => {
            const taskId = await queueManager.enqueue({
                url: 'https://example.com',
                priority: 1
            });
            (0, chai_1.expect)(taskId).to.be.a('string');
            (0, chai_1.expect)(queueManager.getAllTasks()).to.have.lengthOf(1);
            const task = queueManager.getTask(taskId);
            (0, chai_1.expect)(task).to.exist;
            (0, chai_1.expect)(task.url).to.equal('https://example.com');
            (0, chai_1.expect)(task.priority).to.equal(1);
            (0, chai_1.expect)(task.status).to.equal('pending');
        });
        it('should dequeue tasks in priority order', async () => {
            // Add tasks with different priorities
            const taskId1 = await queueManager.enqueue({ url: 'https://low.com', priority: 1 });
            const taskId2 = await queueManager.enqueue({ url: 'https://high.com', priority: 5 });
            const taskId3 = await queueManager.enqueue({ url: 'https://medium.com', priority: 3 });
            const dequeuedTask = await queueManager.dequeue();
            (0, chai_1.expect)(dequeuedTask).to.exist;
            (0, chai_1.expect)(dequeuedTask.url).to.equal('https://high.com');
            (0, chai_1.expect)(dequeuedTask.status).to.equal('processing');
        });
        it('should handle task completion', async () => {
            const taskId = await queueManager.enqueue({
                url: 'https://example.com',
                priority: 1
            });
            const task = await queueManager.dequeue();
            (0, chai_1.expect)(task.status).to.equal('processing');
            queueManager.completeTask(taskId, { result: 'success' });
            const completedTask = queueManager.getTask(taskId);
            (0, chai_1.expect)(completedTask.status).to.equal('completed');
            (0, chai_1.expect)(completedTask.result).to.deep.equal({ result: 'success' });
            const stats = queueManager.getStatistics();
            (0, chai_1.expect)(stats.completed_requests).to.equal(1);
        });
        it('should handle task failure', async () => {
            const taskId = await queueManager.enqueue({
                url: 'https://example.com',
                priority: 1
            });
            const task = await queueManager.dequeue();
            (0, chai_1.expect)(task.status).to.equal('processing');
            queueManager.failTask(taskId, 'Network error');
            const failedTask = queueManager.getTask(taskId);
            (0, chai_1.expect)(failedTask.status).to.equal('failed');
            (0, chai_1.expect)(failedTask.error).to.equal('Network error');
            const stats = queueManager.getStatistics();
            (0, chai_1.expect)(stats.failed_requests).to.equal(1);
        });
    });
    describe('Queue Limits', () => {
        it('should reject tasks when queue is full', async () => {
            // Fill the queue to capacity
            const maxSize = 1000;
            for (let i = 0; i < maxSize; i++) {
                await queueManager.enqueue({
                    url: `https://example${i}.com`,
                    priority: 1
                });
            }
            try {
                await queueManager.enqueue({
                    url: 'https://overflow.com',
                    priority: 1
                });
                chai_1.expect.fail('Should have thrown an error');
            }
            catch (error) {
                (0, chai_1.expect)(error.message).to.equal('Queue is full');
            }
        });
        it('should not dequeue when at max concurrent limit', async () => {
            // Mock active tasks at max
            queueManager.activeTasks = 10;
            await queueManager.enqueue({
                url: 'https://example.com',
                priority: 1
            });
            const task = await queueManager.dequeue();
            (0, chai_1.expect)(task).to.be.null;
        });
    });
    describe('Statistics', () => {
        it('should track statistics correctly', async () => {
            // Add and complete a task
            const taskId1 = await queueManager.enqueue({
                url: 'https://example.com',
                priority: 1
            });
            let stats = queueManager.getStatistics();
            (0, chai_1.expect)(stats.total_requests).to.equal(1);
            (0, chai_1.expect)(stats.pending_requests).to.equal(1);
            const task = await queueManager.dequeue();
            queueManager.completeTask(taskId1);
            stats = queueManager.getStatistics();
            (0, chai_1.expect)(stats.completed_requests).to.equal(1);
            (0, chai_1.expect)(stats.pending_requests).to.equal(0);
        });
        it('should provide comprehensive statistics', () => {
            const stats = queueManager.getStatistics();
            (0, chai_1.expect)(stats).to.have.property('total_requests');
            (0, chai_1.expect)(stats).to.have.property('active_requests');
            (0, chai_1.expect)(stats).to.have.property('pending_requests');
            (0, chai_1.expect)(stats).to.have.property('completed_requests');
            (0, chai_1.expect)(stats).to.have.property('failed_requests');
            (0, chai_1.expect)(stats).to.have.property('max_concurrent');
        });
    });
    describe('Queue Management', () => {
        it('should clear the queue', async () => {
            await queueManager.enqueue({ url: 'https://example.com', priority: 1 });
            await queueManager.enqueue({ url: 'https://test.com', priority: 1 });
            (0, chai_1.expect)(queueManager.getAllTasks()).to.have.lengthOf(2);
            queueManager.clear();
            (0, chai_1.expect)(queueManager.getAllTasks()).to.have.lengthOf(0);
        });
        it('should retrieve tasks by ID', async () => {
            const taskId = await queueManager.enqueue({
                url: 'https://example.com',
                priority: 1
            });
            const task = queueManager.getTask(taskId);
            (0, chai_1.expect)(task).to.exist;
            (0, chai_1.expect)(task.id).to.equal(taskId);
            const nonExistentTask = queueManager.getTask('non-existent');
            (0, chai_1.expect)(nonExistentTask).to.be.undefined;
        });
    });
});
//# sourceMappingURL=queue-manager.test.js.map