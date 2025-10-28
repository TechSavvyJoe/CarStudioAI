-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create images table
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  processed_url TEXT,
  ai_generated_name TEXT,
  status TEXT NOT NULL,
  error TEXT,
  spin360_index INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on project_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_images_project_id ON images(project_id);

-- Create index on spin360_index for 360 spin queries
CREATE INDEX IF NOT EXISTS idx_images_spin360 ON images(spin360_index) WHERE spin360_index IS NOT NULL;
