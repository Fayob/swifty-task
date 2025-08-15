const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Test server is running',
    timestamp: new Date().toISOString()
  });
});

const port = 5001;
app.listen(port, () => {
  console.log(`🚀 Test server running on port ${port}`);
  console.log(`📡 Health check: http://localhost:${port}/health`);
});
