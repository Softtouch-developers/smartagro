-- Initialize SmartAgro database
-- This script runs when PostgreSQL container is first created

-- Set password for smartagro user
ALTER USER smartagro WITH PASSWORD 'smartagro_password';

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE smartagro_dev TO smartagro;

-- Enable pgvector extension for embeddings (if needed later)
CREATE EXTENSION IF NOT EXISTS vector;
