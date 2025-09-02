-- Create the agent_outputs table
CREATE TABLE IF NOT EXISTS agent_outputs (
    id SERIAL PRIMARY KEY,
    heading VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    keypoints JSONB,
    tags JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_outputs_created_at ON agent_outputs(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_heading ON agent_outputs(heading);

-- Insert sample data (optional)
INSERT INTO agent_outputs (heading, summary, keypoints, tags) VALUES 
('Sample Output', 'This is a sample LLM output for testing', '["Point 1", "Point 2"]', '["test", "sample"]')
ON CONFLICT DO NOTHING;