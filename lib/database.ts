import { supabase } from "./supabase"

export interface MeetingSegment {
  id: string
  title: string
  duration: number
  days: string[]
  startTime?: string
  endTime?: string
  created_at?: string
  updated_at?: string
}

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

    return data.map((segment) => ({
      id: segment.id,
      title: segment.title,
      duration: segment.duration,
      days: segment.days,
      startTime: segment.start_time,
      endTime: segment.end_time,
      created_at: segment.created_at,
      updated_at: segment.updated_at,
    }))
  },

  async create(segment: Omit<MeetingSegment, "id" | "created_at" | "updated_at">): Promise<MeetingSegment> {
    const { data, error } = await supabase
      .from("meeting_segments")
      .insert({
        title: segment.title,
        duration: segment.duration,
        days: segment.days,
        start_time: segment.startTime,
        end_time: segment.endTime,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create meeting segment: ${error.message}`)
    }

    return {
      id: data.id,
      title: data.title,
      duration: data.duration,
      days: data.days,
      startTime: data.start_time,
      endTime: data.end_time,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  },

  async update(id: string, updates: Partial<MeetingSegment>): Promise<MeetingSegment> {
    const { data, error } = await supabase
      .from("meeting_segments")
      .update({
        ...(updates.title && { title: updates.title }),
        ...(updates.duration && { duration: updates.duration }),
        ...(updates.days && { days: updates.days }),
        ...(updates.startTime && { start_time: updates.startTime }),
        ...(updates.endTime && { end_time: updates.endTime }),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update meeting segment: ${error.message}`)
    }

    return {
      id: data.id,
      title: data.title,
      duration: data.duration,
      days: data.days,
      startTime: data.start_time,
      endTime: data.end_time,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
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
