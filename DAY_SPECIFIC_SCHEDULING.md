# Day-Specific Scheduling Feature

## Overview
The FMDS Meeting Timer now supports day-specific scheduling, allowing you to set different start times and durations for each day of the week for any activity.

## Database Migration Required

Before using this feature, you need to run the following SQL command in your Supabase dashboard:

```sql
ALTER TABLE meeting_segments ADD COLUMN day_schedules JSONB;
```

## How to Use

### 1. Creating Activities with Day-Specific Schedules
- Create an activity as usual by clicking "Add Activity"
- Select the days you want the activity to run
- The activity will initially use the same time and duration for all selected days

### 2. Editing Day-Specific Times
1. Click the "Edit" button on any activity
2. In the edit form, you'll see a "Day-Specific Schedules" section
3. Click "Show Individual Times" to reveal day-specific controls
4. For each selected day, you can now set:
   - **Start Time**: When the activity begins on that day
   - **Duration**: How long the activity runs on that day (in minutes)
   - **End Time**: Automatically calculated based on start time + duration

### 3. Viewing Day-Specific Schedules
- When you select a day in the main interface, activities will display their day-specific times
- The mobile cards and desktop table will show the correct time and duration for the selected day
- If no day-specific schedule is set, it falls back to the default time and duration

### 4. Timer Functionality
- When you start a timer for an activity, it will use the day-specific duration for the currently selected day
- If no day-specific schedule exists, it uses the default duration

## Features

### Visual Indicators
- Times and durations adapt automatically based on the selected day
- The interface clearly shows when day-specific schedules are being used
- Easy toggle to show/hide individual day controls

### Flexible Scheduling
- Each day can have completely different start times
- Each day can have different durations
- Days can be added or removed independently
- Fallback to default values when day-specific schedules aren't set

### Mobile Responsive
- Day-specific editing works on both desktop and mobile
- Compact layout for mobile devices
- Touch-friendly controls

## Example Use Cases

1. **Different Meeting Times**: Monday meetings at 7:00 AM, Wednesday meetings at 7:30 AM
2. **Variable Duration**: 15 minutes on busy days, 30 minutes on lighter days
3. **Flexible Scheduling**: Activities that need to fit around other commitments on different days

## Technical Details

### Data Structure
Day-specific schedules are stored as JSON in the `day_schedules` column:

```json
[
  {
    "day": "Monday",
    "startTime": "07:00",
    "endTime": "07:15",
    "duration": 15
  },
  {
    "day": "Wednesday", 
    "startTime": "07:30",
    "endTime": "07:45",
    "duration": 15
  }
]
```

### Backward Compatibility
- Existing activities without day-specific schedules continue to work normally
- Default `startTime`, `endTime`, and `duration` fields are preserved
- New feature is opt-in - you only see day-specific controls when you choose to use them

## Migration Notes

After running the database migration, existing activities will:
- Continue to work exactly as before
- Show the same times and durations across all days
- Can be edited to add day-specific schedules at any time

The migration is non-destructive and fully backward compatible.
