-- Add day_schedules column to meeting_segments table
-- This column will store JSON data for day-specific schedules

ALTER TABLE meeting_segments 
ADD COLUMN day_schedules JSONB;

-- Add a comment to describe the column
COMMENT ON COLUMN meeting_segments.day_schedules IS 'JSON array of day-specific schedules with startTime, endTime, and duration for each day';

-- Example of the JSON structure that will be stored:
-- [
--   {
--     "day": "Monday",
--     "startTime": "07:00",
--     "endTime": "07:15",
--     "duration": 15
--   },
--   {
--     "day": "Wednesday",
--     "startTime": "07:30",
--     "endTime": "07:45", 
--     "duration": 15
--   }
-- ]
