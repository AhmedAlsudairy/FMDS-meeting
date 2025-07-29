-- Insert default meeting segments
INSERT INTO meeting_segments (title, duration, days, start_time, end_time) VALUES
('Backlog Review', 10, ARRAY['Sunday', 'Monday'], '07:10:00', '07:20:00'),
('Yesterday Problems', 10, ARRAY['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'], '07:11:00', '07:21:00'),
('Unsafe Conditions', 15, ARRAY['Wednesday'], '07:21:00', '07:36:00'),
('YT Prop Activities', 15, ARRAY['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'], '07:36:00', '07:50:00')
ON CONFLICT (id) DO NOTHING;
