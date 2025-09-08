const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'js', 'public')));

// Queue status endpoint - provides mock data for focus chain testing
app.get('/queue', (req, res) => {
  try {
    const queueStats = {
      total_requests: Math.floor(Math.random() * 1000) + 50,
      active_requests: Math.floor(Math.random() * 4),
      pending_requests: Math.floor(Math.random() * 10),
      completed_requests: Math.floor(Math.random() * 900) + 40,
      failed_requests: Math.floor(Math.random() * 20),
      max_concurrent: 3,
      status: 'operational',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory_usage: process.memoryUsage()
    };

    res.json(queueStats);
  } catch (error) {
    console.error('Error getting queue stats:', error);
    res.status(500).json({ error: 'Failed to get queue statistics' });
  }
});

// Root endpoint serves index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'js', 'public', 'index.html'));
});

// Queue UI serves queue.html
app.get('/queue-ui', (req, res) => {
  res.sendFile(path.join(__dirname, 'js', 'public', 'queue.html'));
});

// Simple URL crawler endpoint for basic testing
app.all('*', (req, res) => {
  // Simple response for focus chain URL testing
  const url = req.url.slice(1); // Remove leading slash

  if (!url) {
    res.status(400).json({ error: 'No URL provided' });
    return;
  }

  // Mock response for focus chain URL query validation
  res.json({
    href: url,
    title: url.startsWith('http') ? `Crawled: ${url}` : 'Error: Invalid URL',
    text: `Mock crawl content for ${url}`,
    timestamp: new Date().toISOString(),
    status: url.startsWith('http') ? 'success' : 'error'
  });
});

// Start minimal server for focus chain UI testing
app.listen(port, () => {
  console.log(`🎯 Focus Chain Testing Server`);
  console.log(`📡 Server running on port ${port}`);
  console.log(`🌐 Web UI: http://localhost:${port}`);
  console.log(`📊 Queue endpoint: http://localhost:${port}/queue`);
  console.log(`🎨 Queue UI: http://localhost:${port}/queue-ui`);
  console.log(`\n✅ Ready for focus chain testing!`);
});

module.exports = app;
