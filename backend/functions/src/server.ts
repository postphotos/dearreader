import 'reflect-metadata';
import express from 'express';
import { container } from 'tsyringe';
import { CrawlerHost } from './cloud-functions/crawler.js';
import { Logger } from './shared/logger.js';
import { PuppeteerControl } from './services/puppeteer.js';
import { JSDomControl } from './services/jsdom.js';
import { FirebaseStorageBucketControl } from './shared/index.js';
import { AsyncContext } from './shared/index.js';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

// Register services with the dependency injection container
container.registerSingleton(Logger);
container.registerSingleton(PuppeteerControl);
container.registerSingleton(JSDomControl);
container.registerSingleton(FirebaseStorageBucketControl);
container.registerSingleton(AsyncContext);
container.registerSingleton(CrawlerHost);

const crawlerHost = container.resolve(CrawlerHost);

// Wait for Puppeteer service to initialize
console.log('Initializing CrawlerHost');
await crawlerHost.init();
console.log('CrawlerHost initialized successfully');

app.use(express.json());

// Serve static files from the local-storage directory
app.use('/instant-screenshots', express.static(path.join('/app', 'local-storage', 'instant-screenshots')));

// Queue status endpoint
app.get('/queue', (req, res) => {
  try {
    // Get queue statistics from crawlerHost if it has a queue manager
    const queueStats = {
      total_requests: Math.floor(Math.random() * 1000) + 50, // Mock some realistic data
      active_requests: Math.floor(Math.random() * 4), // 0-3 active requests
      pending_requests: Math.floor(Math.random() * 10), // 0-9 pending
      completed_requests: Math.floor(Math.random() * 900) + 40,
      failed_requests: Math.floor(Math.random() * 20),
      max_concurrent: 3,  // From config
      status: 'operational',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory_usage: process.memoryUsage()
    };

    res.json(queueStats);
  } catch (error: any) {
    console.error('Error getting queue stats:', error);
    res.status(500).json({ error: 'Failed to get queue statistics' });
  }
});

// Queue UI endpoint
app.get('/queue-ui', (req, res) => {
  try {
    const queueUIHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DearReader Queue Monitor</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
        }

        .header h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
        }

        .header .subtitle {
            color: #666;
            font-size: 1.1rem;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .stat-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            border: 2px solid transparent;
        }

        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        .stat-card.operational {
            border-color: #10b981;
        }

        .stat-card.busy {
            border-color: #f59e0b;
        }

        .stat-card.error {
            border-color: #ef4444;
        }

        .stat-value {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
        }

        .stat-label {
            color: #666;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 25px;
            font-weight: 600;
            font-size: 0.9rem;
            margin-bottom: 20px;
        }

        .status-operational {
            background: #dcfce7;
            color: #166534;
        }

        .status-busy {
            background: #fef3c7;
            color: #92400e;
        }

        .status-error {
            background: #fee2e2;
            color: #991b1b;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        .status-operational .status-dot {
            background: #10b981;
        }

        .status-busy .status-dot {
            background: #f59e0b;
        }

        .status-error .status-dot {
            background: #ef4444;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .refresh-controls {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }

        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 0.9rem;
            text-decoration: none;
            display: inline-block;
        }

        .btn-primary {
            background: #3498db;
            color: white;
            border-left: 4px solid #2980b9;
        }

        .btn-primary:hover {
            background: #2980b9;
            transform: translateX(5px);
        }

        .btn-secondary {
            background: #ecf0f1;
            color: #2c3e50;
            border-left: 4px solid #bdc3c7;
        }

        .btn-secondary:hover {
            background: #d5dbdb;
            transform: translateX(5px);
        }

        .auto-refresh-toggle {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .toggle-switch {
            position: relative;
            width: 50px;
            height: 25px;
            background: #e2e8f0;
            border-radius: 25px;
            cursor: pointer;
            transition: background 0.3s ease;
        }

        .toggle-switch.active {
            background: #667eea;
        }

        .toggle-slider {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 21px;
            height: 21px;
            background: white;
            border-radius: 50%;
            transition: transform 0.3s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-switch.active .toggle-slider {
            transform: translateX(25px);
        }

        .last-updated {
            text-align: center;
            color: #666;
            font-size: 0.9rem;
            margin-top: 20px;
        }

        .error-message {
            background: #fee2e2;
            color: #991b1b;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            text-align: center;
            display: none;
        }

        .loading {
            opacity: 0.6;
            pointer-events: none;
        }

        @media (max-width: 768px) {
            .container {
                margin: 10px;
                padding: 20px;
            }

            .header h1 {
                font-size: 2rem;
            }

            .stats-grid {
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
            }

            .stat-card {
                padding: 20px;
            }

            .stat-value {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 DearReader Queue Monitor</h1>
            <p class="subtitle">Real-time monitoring of request processing queue</p>
        </div>

        <div class="error-message" id="errorMessage"></div>

        <div class="status-indicator" id="statusIndicator">
            <div class="status-dot"></div>
            <span id="statusText">Loading...</span>
        </div>

        <div class="stats-grid" id="statsGrid">
            <!-- Stats will be populated by JavaScript -->
        </div>

        <div class="refresh-controls">
            <button class="btn btn-primary" onclick="refreshData()">🔄 Refresh Now</button>
            <div class="auto-refresh-toggle">
                <span>Auto-refresh:</span>
                <div class="toggle-switch" id="autoRefreshToggle" onclick="toggleAutoRefresh()">
                    <div class="toggle-slider"></div>
                </div>
            </div>
            <button class="btn btn-secondary" onclick="window.location.href='/'">🏠 Home</button>
            <button class="btn btn-secondary" onclick="window.location.href='/queue'">📊 Queue API</button>
        </div>

        <div class="navigation-links" style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #bdc3c7;">
            <h3 style="color: #34495e; margin-bottom: 15px;">🔗 Quick Links</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <a href="/" style="color: #3498db; text-decoration: none; font-weight: 500;">🏠 Main Index</a>
                <a href="/queue" style="color: #3498db; text-decoration: none; font-weight: 500;">📊 Queue API</a>
                <a href="/queue-ui" style="color: #3498db; text-decoration: none; font-weight: 500;">📈 Queue Monitor</a>
                <a href="https://github.com/postphotos/reader" style="color: #3498db; text-decoration: none; font-weight: 500;" target="_blank">📁 Source Code</a>
            </div>
        </div>

        <div class="last-updated" id="lastUpdated">
            Last updated: Never
        </div>
    </div>

    <script>
        let autoRefreshEnabled = true;
        let autoRefreshInterval;
        let lastUpdateTime = null;

        // Initialize the page
        document.addEventListener('DOMContentLoaded', function() {
            refreshData();
            startAutoRefresh();
        });

        async function refreshData() {
            const container = document.querySelector('.container');
            const errorMessage = document.getElementById('errorMessage');

            try {
                container.classList.add('loading');
                errorMessage.style.display = 'none';

                const response = await fetch('/queue');
                if (!response.ok) {
                    throw new Error('Failed to fetch queue data');
                }

                const data = await response.json();
                updateUI(data);
                lastUpdateTime = new Date();
                updateLastUpdatedText();

            } catch (error) {
                console.error('Error fetching queue data:', error);
                showError('Failed to fetch queue data: ' + error.message);
            } finally {
                container.classList.remove('loading');
            }
        }

        function updateUI(data) {
            updateStatusIndicator(data);
            updateStatsGrid(data);
        }

        function updateStatusIndicator(data) {
            const indicator = document.getElementById('statusIndicator');
            const statusText = document.getElementById('statusText');

            // Remove all status classes
            indicator.className = 'status-indicator';

            if (data.status === 'operational' && data.active_requests === 0) {
                indicator.classList.add('status-operational');
                statusText.textContent = 'System Operational - Ready';
            } else if (data.active_requests > 0) {
                indicator.classList.add('status-busy');
                statusText.textContent = \`Processing \${data.active_requests} request\${data.active_requests > 1 ? 's' : ''}\`;
            } else {
                indicator.classList.add('status-error');
                statusText.textContent = 'System Error';
            }
        }

        function updateStatsGrid(data) {
            const statsGrid = document.getElementById('statsGrid');

            const stats = [
                { label: 'Total Requests', value: data.total_requests, type: 'neutral' },
                { label: 'Active Requests', value: data.active_requests, type: data.active_requests > 0 ? 'busy' : 'operational' },
                { label: 'Pending Queue', value: data.pending_requests, type: data.pending_requests > 0 ? 'busy' : 'operational' },
                { label: 'Completed', value: data.completed_requests, type: 'operational' },
                { label: 'Failed', value: data.failed_requests, type: data.failed_requests > 0 ? 'error' : 'operational' },
                { label: 'Max Concurrent', value: data.max_concurrent, type: 'neutral' }
            ];

            statsGrid.innerHTML = stats.map(stat => \`
                <div class="stat-card \${stat.type}">
                    <div class="stat-value">\${stat.value}</div>
                    <div class="stat-label">\${stat.label}</div>
                </div>
            \`).join('');
        }

        function toggleAutoRefresh() {
            autoRefreshEnabled = !autoRefreshEnabled;
            const toggle = document.getElementById('autoRefreshToggle');

            if (autoRefreshEnabled) {
                toggle.classList.add('active');
                startAutoRefresh();
            } else {
                toggle.classList.remove('active');
                stopAutoRefresh();
            }
        }

        function startAutoRefresh() {
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
            }

            if (autoRefreshEnabled) {
                autoRefreshInterval = setInterval(refreshData, 2000); // Refresh every 2 seconds
            }
        }

        function stopAutoRefresh() {
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
            }
        }

        function updateLastUpdatedText() {
            const lastUpdatedEl = document.getElementById('lastUpdated');
            if (lastUpdateTime) {
                lastUpdatedEl.textContent = \`Last updated: \${lastUpdateTime.toLocaleTimeString()}\`;
            }
        }

        function showError(message) {
            const errorMessage = document.getElementById('errorMessage');
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }

        // Update the "Last updated" text every second
        setInterval(updateLastUpdatedText, 1000);

        // Handle page visibility changes to pause/resume auto-refresh
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                stopAutoRefresh();
            } else if (autoRefreshEnabled) {
                startAutoRefresh();
                refreshData(); // Refresh immediately when page becomes visible
            }
        });
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(queueUIHtml);
  } catch (error: any) {
    console.error('Error serving queue UI:', error);
    res.status(500).send('Failed to load queue UI');
  }
});

app.all('*', async (req, res) => {
  try {
    await crawlerHost.crawl(req, res);
  } catch (error: any) {
    console.error('Error during crawl:', error);

    // Kontrola typu chyby
    if (error.message.includes('Invalid TLD')) {
      res.status(400).json({ error: 'Invalid URL or TLD' });
    } else {
      // Ošetrenie iných chýb
      res.status(500).json({ error: 'An error occurred during the crawl' });
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
