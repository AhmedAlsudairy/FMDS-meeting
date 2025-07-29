import { supabase, type Database } from "./supabase"

export type MeetingSegment = Database["public"]["Tables"]["meeting_segments"]["Row"]
export type MeetingSegmentInsert = Database["public"]["Tables"]["meeting_segments"]["Insert"]
export type MeetingSegmentUpdate = Database["public"]["Tables"]["meeting_segments"]["Update"]

export interface Analytics {
  totalActivities: number
  totalDuration: number
  totalWeeklyMinutes: number
  averageDuration: number
  activeDays: number
  mostBusyDay: {
    day: string
    totalDuration: number
  }
  allDaysData: Array<{
    day: string
    segments: MeetingSegment[]
    totalDuration: number
    activityCount: number
  }>
}

export const meetingSegmentService = {
  async getAll(): Promise<MeetingSegment[]> {
    const { data, error } = await supabase.from("meeting_segments").select("*").order("created_at", { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch meeting segments: ${error.message}`)
    }

    return data || []
  },

  async create(segment: MeetingSegmentInsert): Promise<MeetingSegment> {
    const { data, error } = await supabase.from("meeting_segments").insert(segment).select().single()

    if (error) {
      throw new Error(`Failed to create meeting segment: ${error.message}`)
    }

    return data
  },

  async update(id: string, updates: MeetingSegmentUpdate): Promise<MeetingSegment> {
    const { data, error } = await supabase.from("meeting_segments").update(updates).eq("id", id).select().single()

    if (error) {
      throw new Error(`Failed to update meeting segment: ${error.message}`)
    }

    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("meeting_segments").delete().eq("id", id)

    if (error) {
      throw new Error(`Failed to delete meeting segment: ${error.message}`)
    }
  },

  async getAnalytics(): Promise<Analytics> {
    const segments = await this.getAll()
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

    const totalActivities = segments.length
    const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0)
    const totalWeeklyMinutes = segments.reduce((sum, seg) => sum + seg.duration * seg.days.length, 0)
    const averageDuration = totalActivities > 0 ? Math.round(totalDuration / totalActivities) : 0
    const mostBusyDay = allDaysData.sort((a, b) => b.totalDuration - a.totalDuration)[0]
    const activeDays = allDaysData.filter((d) => d.segments.length > 0).length

    return {
      totalActivities,
      totalDuration,
      totalWeeklyMinutes,
      averageDuration,
      activeDays,
      mostBusyDay,
      allDaysData,
    }
  },
}
