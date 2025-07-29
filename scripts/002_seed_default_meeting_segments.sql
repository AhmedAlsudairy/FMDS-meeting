-- Insert default meeting segments
INSERT INTO meeting_segments (title, duration, days, start_time, end_time) VALUES
  ('Backlog Review', 10, ARRAY['Sunday', 'Monday'], '07:10', '07:20'),
  ('Yesterday Problems', 10, ARRAY['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'], '07:11', '07:21'),
  ('Unsafe Conditions', 15, ARRAY['Wednesday'], '07:21', '07:36'),
  ('YT Prop Activities', 15, ARRAY['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'], '07:36', '07:50')
ON CONFLICT (id) DO NOTHING;
