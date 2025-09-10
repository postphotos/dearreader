import config from '../config.js';
class Semaphore {
    constructor(maxPermits) {
        this.maxPermits = maxPermits;
        this.waiting = [];
        this.permits = maxPermits;
    }
    async acquire() {
        if (this.permits > 0) {
            this.permits -= 1;
            return () => {
                this.permits += 1;
                this._drainWaiting();
            };
        }
        return new Promise((resolve) => {
            this.waiting.push((release) => resolve(release));
        });
    }
    _drainWaiting() {
        if (this.waiting.length > 0 && this.permits > 0) {
            const waiter = this.waiting.shift();
            this.permits -= 1;
            waiter(() => {
                this.permits += 1;
                this._drainWaiting();
            });
        }
    }
}
const globalSemaphore = new Semaphore(config.concurrency?.max_api_concurrency || 50);
const clientSemaphores = new Map();
function getClientId(req) {
    return req.headers['x-api-key'] || (req.ip || req.connection?.remoteAddress || 'anon');
}
export function concurrencyMiddleware(req, res, next) {
    const clientId = getClientId(req);
    const clientCfg = { max: config.concurrency?.default_client_concurrency || 5, maxQueue: config.concurrency?.max_queue_length_per_client || 20 };
    let clientState = clientSemaphores.get(clientId);
    if (!clientState) {
        clientState = { sem: new Semaphore(clientCfg.max), queued: 0 };
        clientSemaphores.set(clientId, clientState);
    }
    if (clientState.queued >= clientCfg.maxQueue) {
        res.setHeader('Retry-After', '5');
        return res.status(429).json({ error: 'Client queue limit exceeded, try again later' });
    }
    clientState.queued += 1;
    globalSemaphore
        .acquire()
        .then((releaseGlobal) => {
        clientState.queued -= 1;
        clientState.sem
            .acquire()
            .then((releaseClient) => {
            const cleanup = () => {
                try {
                    releaseClient();
                }
                catch { }
                try {
                    releaseGlobal();
                }
                catch { }
            };
            res.once('finish', cleanup);
            res.once('close', cleanup);
            next();
        })
            .catch(() => {
            try {
                releaseGlobal();
            }
            catch { }
            res.setHeader('Retry-After', '1');
            res.status(503).json({ error: 'Failed to acquire client semaphore' });
        });
    })
        .catch(() => {
        res.setHeader('Retry-After', '1');
        res.status(503).json({ error: 'Server busy, try again later' });
    });
}
//# sourceMappingURL=concurrency.js.map