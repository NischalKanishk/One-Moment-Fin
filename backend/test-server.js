const express = require('express');
const app = express();
const PORT = 3001;

app.get('/test', (req, res) => {
  res.json({ message: 'Test server is working!', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Test server listening on port ${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/test`);
});
