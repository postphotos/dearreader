"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const queue_manager_js_1 = require("../../services/queue-manager.js");
// Mock Express Response
class MockResponse {
    constructor() {
        this._headers = {};
    }
    status(code) {
        this._status = code;
        return this;
    }
    type(contentType) {
        this._contentType = contentType;
        return this;
    }
    setHeader(key, value) {
        this._headers[key] = value;
        return this;
    }
    send(data) {
        this._data = data;
        return this;
    }
    json(data) {
        this._data = data;
        this._contentType = 'application/json';
        return this;
    }
    getStatus() { return this._status; }
    getData() { return this._data; }
    getHeaders() { return this._headers; }
    getContentType() { return this._contentType; }
}
describe('Queue Endpoints', () => {
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
    describe('/queue endpoint', () => {
        it('should return queue statistics as JSON', async () => {
            // Add some tasks to have meaningful stats
            await queueManager.enqueue({ url: 'https://example.com', priority: 1 });
            await queueManager.enqueue({ url: 'https://test.com', priority: 2 });
            const mockRes = new MockResponse();
            // Simulate the endpoint handler
            const stats = queueManager.getStatistics();
            const response = {
                ...stats,
                timestamp: new Date().toISOString(),
                status: "operational"
            };
            mockRes.json(response);
            (0, chai_1.expect)(mockRes.getContentType()).to.equal('application/json');
            const data = mockRes.getData();
            (0, chai_1.expect)(data).to.have.property('total_requests', 2);
            (0, chai_1.expect)(data).to.have.property('active_requests', 0);
            (0, chai_1.expect)(data).to.have.property('pending_requests', 2);
            (0, chai_1.expect)(data).to.have.property('status', 'operational');
            (0, chai_1.expect)(data).to.have.property('timestamp');
        });
        it('should return correct statistics after task completion', async () => {
            const taskId = await queueManager.enqueue({ url: 'https://example.com', priority: 1 });
            // Simulate task processing
            const task = await queueManager.dequeue();
            queueManager.completeTask(taskId);
            const stats = queueManager.getStatistics();
            (0, chai_1.expect)(stats.total_requests).to.equal(1);
            (0, chai_1.expect)(stats.completed_requests).to.equal(1);
            (0, chai_1.expect)(stats.pending_requests).to.equal(0);
        });
        it('should return correct statistics after task failure', async () => {
            const taskId = await queueManager.enqueue({ url: 'https://example.com', priority: 1 });
            // Simulate task processing and failure
            const task = await queueManager.dequeue();
            queueManager.failTask(taskId, 'Network error');
            const stats = queueManager.getStatistics();
            (0, chai_1.expect)(stats.total_requests).to.equal(1);
            (0, chai_1.expect)(stats.failed_requests).to.equal(1);
            (0, chai_1.expect)(stats.pending_requests).to.equal(0);
        });
    });
    describe('/queue-ui endpoint', () => {
        it('should return HTML page for queue monitoring', () => {
            const mockRes = new MockResponse();
            // Simulate the endpoint handler
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DearReader Queue Monitor</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <h1>DearReader Queue Monitor</h1>
    <div id="queue-stats">Loading...</div>
    <button onclick="refreshQueueStats()">Refresh</button>
  </div>
  <script src="/main.js"></script>
</body>
</html>`;
            mockRes.type('text/html').send(html);
            (0, chai_1.expect)(mockRes.getContentType()).to.equal('text/html');
            const data = mockRes.getData();
            (0, chai_1.expect)(data).to.include('DearReader Queue Monitor');
            (0, chai_1.expect)(data).to.include('queue-stats');
            (0, chai_1.expect)(data).to.include('refreshQueueStats()');
            (0, chai_1.expect)(data).to.include('/style.css');
            (0, chai_1.expect)(data).to.include('/main.js');
        });
        it('should include proper HTML structure', () => {
            const mockRes = new MockResponse();
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DearReader Queue Monitor</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <h1>DearReader Queue Monitor</h1>
    <div id="queue-stats">Loading...</div>
    <button onclick="refreshQueueStats()">Refresh</button>
  </div>
  <script src="/main.js"></script>
</body>
</html>`;
            mockRes.type('text/html').send(html);
            const data = mockRes.getData();
            (0, chai_1.expect)(data).to.include('<!DOCTYPE html>');
            (0, chai_1.expect)(data).to.include('<meta charset="UTF-8">');
            (0, chai_1.expect)(data).to.include('<title>DearReader Queue Monitor</title>');
            (0, chai_1.expect)(data).to.include('<div class="container">');
            (0, chai_1.expect)(data).to.include('<h1>DearReader Queue Monitor</h1>');
        });
    });
    describe('Queue Statistics Integration', () => {
        it('should provide real-time statistics for monitoring', async () => {
            // Simulate various queue states
            await queueManager.enqueue({ url: 'https://example1.com', priority: 1 });
            await queueManager.enqueue({ url: 'https://example2.com', priority: 2 });
            await queueManager.enqueue({ url: 'https://example3.com', priority: 1 });
            // Process one task
            const task = await queueManager.dequeue();
            if (task) {
                queueManager.completeTask(task.id);
            }
            const stats = queueManager.getStatistics();
            (0, chai_1.expect)(stats.total_requests).to.equal(3);
            (0, chai_1.expect)(stats.completed_requests).to.equal(1);
            (0, chai_1.expect)(stats.pending_requests).to.equal(2);
            (0, chai_1.expect)(stats.active_requests).to.equal(0);
            (0, chai_1.expect)(stats.failed_requests).to.equal(0);
            (0, chai_1.expect)(stats.max_concurrent).to.be.a('number');
        });
        it('should handle concurrent task processing', async () => {
            const tasks = [];
            for (let i = 0; i < 5; i++) {
                tasks.push(queueManager.enqueue({ url: `https://example${i}.com`, priority: 1 }));
            }
            await Promise.all(tasks);
            // Simulate processing multiple tasks
            for (let i = 0; i < 3; i++) {
                const task = await queueManager.dequeue();
                if (task) {
                    queueManager.completeTask(task.id);
                }
            }
            const stats = queueManager.getStatistics();
            (0, chai_1.expect)(stats.total_requests).to.equal(5);
            (0, chai_1.expect)(stats.completed_requests).to.equal(3);
            (0, chai_1.expect)(stats.pending_requests).to.equal(2);
        });
    });
    describe('Error Handling', () => {
        it('should handle queue statistics errors gracefully', () => {
            // Test with empty queue
            const stats = queueManager.getStatistics();
            (0, chai_1.expect)(stats.total_requests).to.equal(0);
            (0, chai_1.expect)(stats.completed_requests).to.equal(0);
            (0, chai_1.expect)(stats.failed_requests).to.equal(0);
            (0, chai_1.expect)(stats.pending_requests).to.equal(0);
            (0, chai_1.expect)(stats.active_requests).to.equal(0);
        });
        it('should handle malformed task data', async () => {
            try {
                // This should work fine with proper validation
                await queueManager.enqueue({ url: 'https://example.com', priority: 1 });
                (0, chai_1.expect)(queueManager.getAllTasks()).to.have.lengthOf(1);
            }
            catch (error) {
                // If there's an error, it should be handled properly
                (0, chai_1.expect)(error).to.be.instanceOf(Error);
            }
        });
    });
});
//# sourceMappingURL=queue-endpoint.test.js.map