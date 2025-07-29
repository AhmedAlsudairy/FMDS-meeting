-- Create the meeting_segments table
CREATE TABLE IF NOT EXISTS meeting_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  duration INTEGER NOT NULL CHECK (duration > 0),
  days TEXT[] NOT NULL CHECK (array_length(days, 1) > 0),
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on the days array for better query performance
CREATE INDEX IF NOT EXISTS idx_meeting_segments_days ON meeting_segments USING GIN (days);

-- Create an index on title for search functionality
CREATE INDEX IF NOT EXISTS idx_meeting_segments_title ON meeting_segments (title);

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meeting_segments_updated_at
  BEFORE UPDATE ON meeting_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
