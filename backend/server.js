const express = require('express');
const { Client } = require('pg');
const cors = require('cors');

const app = express();

// Add CORS middleware
app.use(cors({
  origin: 'http://10.10.20.156:3019', // Allow requests from React app
  credentials: true
}));

app.use(express.json()); // ✅ replaces body-parser

// Postgres connection
const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'sampleDb', 
  port: process.env.DB_PORT || 5432,
});

// Connect with retry + ensure table exists
const connectToDatabase = async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      await client.connect();
      console.log('✅ Connected to Postgres');
      // Ensure table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS agent_outputs (
          id SERIAL PRIMARY KEY,
          heading TEXT NOT NULL,
          summary TEXT NOT NULL,
          keypoints JSONB,
          tags JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ agent_outputs table is ready');
      return;
    } catch (err) {
      console.error(`❌ DB Connection Error (${retries} retries left):`, err.message);
      retries--;
      if (retries === 0) {
        console.error('❌ Failed to connect to Postgres after multiple attempts');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // wait before retry
    }
  }
};

connectToDatabase();

// Health check
app.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Service is running and ready to accept requests'
  });
});

// Store LLM outputs
app.post('/store-llm', async (req, res) => {
  let data = req.body;
  
  // If it's a string, try to parse JSON from it
  if (typeof data === 'string') {
    const regex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const match = data.match(regex);
    try {
      data = match && match[1] ? JSON.parse(match[1].trim()) : JSON.parse(data);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Invalid JSON format' });
    }
  }

  // Normalize to array
  if (!Array.isArray(data)) {
    data = [data];
  }

  const insertedIds = [];
  const errors = [];

  for (const [index, item] of data.entries()) {
    try {
      if (!item.heading || !item.summary) {
        errors.push({ index, error: 'Missing required fields: heading or summary' });
        continue;
      }

      const result = await client.query(
        `INSERT INTO agent_outputs (heading, summary, keypoints, tags)
         VALUES ($1, $2, $3, $4) RETURNING id;`,
        [
          item.heading,
          item.summary,
          JSON.stringify(item.keypoints || []),
          JSON.stringify(item.tags || [])
        ]
      );
      insertedIds.push(result.rows[0].id);
    } catch (err) {
      console.error('DB insert error:', err);
      errors.push({ index, error: err.message });
    }
  }

  res.json({
    success: insertedIds.length > 0,
    inserted: insertedIds,
    errors
  });
});

// Endpoint to fetch all LLM outputs in descending order
app.get('/api/content/all', async (req, res) => {
  try {
    const result = await client.query(
      'SELECT * FROM agent_outputs ORDER BY id DESC'
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No content found' });
    }
    
    // Process all rows to parse JSON strings back to arrays
    const contents = result.rows.map(content => {
      // Parse JSON strings back to arrays if needed
      if (typeof content.keypoints === 'string') {
        try {
          content.keypoints = JSON.parse(content.keypoints);
        } catch (e) {
          content.keypoints = [];
        }
      }
      
      if (typeof content.tags === 'string') {
        try {
          content.tags = JSON.parse(content.tags);
        } catch (e) {
          content.tags = [];
        }
      }
      
      return content;
    });
    
    res.json(contents);
  } catch (err) {
    console.error('DB select error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Optional: Get all stored content (basic info only)
app.get('/api/content', async (req, res) => {
  try {
    const result = await client.query(
      'SELECT id, heading, summary, created_at FROM agent_outputs ORDER BY id DESC'
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('DB select error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Optional: Get single content by ID
app.get('/api/content/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await client.query(
      'SELECT * FROM agent_outputs WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }
    
    const content = result.rows[0];
    
    // Parse JSON strings back to arrays if needed
    if (typeof content.keypoints === 'string') {
      try {
        content.keypoints = JSON.parse(content.keypoints);
      } catch (e) {
        content.keypoints = [];
      }
    }
    
    if (typeof content.tags === 'string') {
      try {
        content.tags = JSON.parse(content.tags);
      } catch (e) {
        content.tags = [];
      }
    }
    
    res.json({ success: true, data: content });
  } catch (err) {
    console.error('DB select error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3018;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 API running on http://10.10.20.156:${PORT}`));