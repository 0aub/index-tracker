-- Migration: Add index_type field to indices table
-- Date: 2025-01-19
-- Description: Adds index_type column to support multiple index types (NAII, ETARI, etc.)

-- Add index_type column with default value 'NAII'
ALTER TABLE indices
ADD COLUMN IF NOT EXISTS index_type VARCHAR(50) NOT NULL DEFAULT 'NAII';

-- Create index on index_type for faster queries
CREATE INDEX IF NOT EXISTS idx_index_type ON indices(index_type);

-- Add comment to column
COMMENT ON COLUMN indices.index_type IS 'Type of index: NAII, ETARI, etc.';

-- Update existing records to have index_type = 'NAII' (if any exist)
UPDATE indices SET index_type = 'NAII' WHERE index_type IS NULL OR index_type = '';
