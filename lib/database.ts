import { supabase } from "./supabase"
import type { Database } from "./supabase"

export type MeetingSegment = Database["public"]["Tables"]["meeting_segments"]["Row"] & {
  startTime?: string
  endTime?: string
}

export type MeetingSegmentInsert = Database["public"]["Tables"]["meeting_segments"]["Insert"]
export type MeetingSegmentUpdate = Database["public"]["Tables"]["meeting_segments"]["Update"]

// Convert database format to component format
const formatSegmentForComponent = (
  segment: Database["public"]["Tables"]["meeting_segments"]["Row"],
): MeetingSegment => ({
  ...segment,
  startTime: segment.start_time || undefined,
  endTime: segment.end_time || undefined,
})

// Convert component format to database format
const formatSegmentForDatabase = (segment: Partial<MeetingSegment>): Partial<MeetingSegmentInsert> => ({
  title: segment.title,
  duration: segment.duration,
  days: segment.days,
  start_time: segment.startTime || null,
  end_time: segment.endTime || null,
})

export const meetingSegmentService = {
  // Get all meeting segments
  async getAll(): Promise<MeetingSegment[]> {
    const { data, error } = await supabase.from("meeting_segments").select("*").order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching meeting segments:", error)
      throw new Error("Failed to fetch meeting segments")
    }

    return data.map(formatSegmentForComponent)
  },

  // Get segments for a specific day
  async getByDay(day: string): Promise<MeetingSegment[]> {
    const { data, error } = await supabase
      .from("meeting_segments")
      .select("*")
      .contains("days", [day])
      .order("start_time", { ascending: true })

    if (error) {
      console.error("Error fetching meeting segments by day:", error)
      throw new Error("Failed to fetch meeting segments for the day")
    }

    return data.map(formatSegmentForComponent)
  },

  // Create a new meeting segment
  async create(segment: Omit<MeetingSegment, "id" | "created_at" | "updated_at">): Promise<MeetingSegment> {
    const dbSegment = formatSegmentForDatabase(segment)

    const { data, error } = await supabase.from("meeting_segments").insert(dbSegment).select().single()

    if (error) {
      console.error("Error creating meeting segment:", error)
      throw new Error("Failed to create meeting segment")
    }

    return formatSegmentForComponent(data)
  },

  // Update a meeting segment
  async update(id: string, updates: Partial<MeetingSegment>): Promise<MeetingSegment> {
    const dbUpdates = formatSegmentForDatabase(updates)

    const { data, error } = await supabase.from("meeting_segments").update(dbUpdates).eq("id", id).select().single()

    if (error) {
      console.error("Error updating meeting segment:", error)
      throw new Error("Failed to update meeting segment")
    }

    return formatSegmentForComponent(data)
  },

  // Delete a meeting segment
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("meeting_segments").delete().eq("id", id)

    if (error) {
      console.error("Error deleting meeting segment:", error)
      throw new Error("Failed to delete meeting segment")
    }
  },

  // Get analytics data
  async getAnalytics() {
    const segments = await this.getAll()

    const totalActivities = segments.length
    const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0)
    const totalWeeklyMinutes = segments.reduce((sum, seg) => sum + seg.duration * seg.days.length, 0)
    const averageDuration = totalActivities > 0 ? Math.round(totalDuration / totalActivities) : 0

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]
    const allDaysData = days.map((day) => {
      const daySegments = segments.filter((segment) => segment.days.includes(day))
      return {
        day,
        segments: daySegments,
        totalDuration: daySegments.reduce((sum, seg) => sum + seg.duration, 0),
        activityCount: daySegments.length,
      }
    })

    const mostBusyDay = allDaysData.sort((a, b) => b.totalDuration - a.totalDuration)[0]
    const activeDays = allDaysData.filter((d) => d.segments.length > 0).length

    return {
      totalActivities,
      totalDuration,
      totalWeeklyMinutes,
      averageDuration,
      mostBusyDay,
      activeDays,
      allDaysData,
    }
  },
}
