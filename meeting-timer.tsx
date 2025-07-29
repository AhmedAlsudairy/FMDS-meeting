"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Play, Pause, Square, Edit, Plus, Download, Trash2, Loader2, RefreshCw, Menu, X } from "lucide-react"
import { meetingSegmentService, type MeetingSegment, type DaySchedule } from "@/lib/database"
import { useToast } from "@/hooks/use-toast"

interface TimerState {
  isRunning: boolean
  currentTime: number
  totalTime: number
  currentSegment: number
}

// TODO: Add support for multiple days
export default function MeetingTimer() {
  const [segments, setSegments] = useState<MeetingSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [timer, setTimer] = useState<TimerState>({
    isRunning: false,
    currentTime: 0,
    totalTime: 0,
    currentSegment: 0,
  })
  const [selectedDay, setSelectedDay] = useState("Monday")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingSegment, setEditingSegment] = useState<MeetingSegment | null>(null)
  const [newSegment, setNewSegment] = useState<Partial<MeetingSegment>>({
    title: "",
    duration: 10,
    days: [],
    startTime: "7:00",
    endTime: "7:10",
    daySchedules: [],
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showDaySchedules, setShowDaySchedules] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const { toast } = useToast()

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]
  const meetingTime = "7:10 AM - 7:50 AM"

  // Get segments for selected day and sort by start time
  const todaySegments = segments
    .filter((segment) => segment.days.includes(selectedDay))
    .sort((a, b) => {
      // Get start time for segment a (use day-specific time if available)
      const dayScheduleA = a.daySchedules?.find(ds => ds.day === selectedDay)
      const startTimeA = dayScheduleA ? dayScheduleA.startTime : a.startTime
      
      // Get start time for segment b (use day-specific time if available)
      const dayScheduleB = b.daySchedules?.find(ds => ds.day === selectedDay)
      const startTimeB = dayScheduleB ? dayScheduleB.startTime : b.startTime
      
      // Compare times (format: "HH:MM")
      return (startTimeA || "00:00").localeCompare(startTimeB || "00:00")
    })

  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(":").map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)

    const endDate = new Date(startDate.getTime() + duration * 60000)
    const endHours = endDate.getHours().toString().padStart(2, "0")
    const endMinutes = endDate.getMinutes().toString().padStart(2, "0")

    return `${endHours}:${endMinutes}`
  }

  // Helper function to get or create day schedule
  const getOrCreateDaySchedule = (daySchedules: DaySchedule[] | undefined, day: string, defaultStartTime: string = "7:00", defaultDuration: number = 10): DaySchedule => {
    const existing = daySchedules?.find(ds => ds.day === day)
    if (existing) return existing
    
    return {
      day,
      startTime: defaultStartTime,
      endTime: calculateEndTime(defaultStartTime, defaultDuration),
      duration: defaultDuration
    }
  }

  // Update day schedule for editing segment
  const updateDaySchedule = (day: string, field: 'startTime' | 'duration', value: string | number) => {
    if (!editingSegment) return
    
    const currentSchedules = editingSegment.daySchedules || []
    const scheduleIndex = currentSchedules.findIndex(ds => ds.day === day)
    
    let updatedSchedule: DaySchedule
    if (scheduleIndex >= 0) {
      updatedSchedule = { ...currentSchedules[scheduleIndex] }
    } else {
      updatedSchedule = getOrCreateDaySchedule(currentSchedules, day, editingSegment.startTime, editingSegment.duration)
    }
    
    if (field === 'startTime') {
      updatedSchedule.startTime = value as string
      updatedSchedule.endTime = calculateEndTime(value as string, updatedSchedule.duration)
    } else if (field === 'duration') {
      updatedSchedule.duration = value as number
      updatedSchedule.endTime = calculateEndTime(updatedSchedule.startTime, value as number)
    }
    
    const newSchedules = [...currentSchedules]
    if (scheduleIndex >= 0) {
      newSchedules[scheduleIndex] = updatedSchedule
    } else {
      newSchedules.push(updatedSchedule)
    }
    
    setEditingSegment(prev => prev ? {
      ...prev,
      daySchedules: newSchedules
    } : null)
  }

  // Load segments from database
  const loadSegments = async () => {
    try {
      setLoading(true)
      const data = await meetingSegmentService.getAll()
      setSegments(data)
    } catch (error) {
      console.error("Error loading segments:", error)
      toast({
        title: "Error",
        description: "Failed to load meeting segments. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadSegments()
  }, [])

  // Auto-calculate end time when start time or duration changes for new segment
  useEffect(() => {
    if (newSegment.startTime && newSegment.duration) {
      const endTime = calculateEndTime(newSegment.startTime, newSegment.duration)
      setNewSegment((prev) => ({ ...prev, endTime }))
    }
  }, [newSegment.startTime, newSegment.duration])

  // Auto-calculate end time when start time or duration changes for editing segment
  useEffect(() => {
    if (editingSegment?.startTime && editingSegment?.duration) {
      const endTime = calculateEndTime(editingSegment.startTime, editingSegment.duration)
      setEditingSegment((prev) => (prev ? { ...prev, endTime } : null))
    }
  }, [editingSegment?.startTime, editingSegment?.duration])

  // Create beep sound using Web Audio API
  const playBeep = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    const ctx = audioContextRef.current
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = 800
    oscillator.type = "sine"

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.5)
  }

  // Timer logic
  useEffect(() => {
    if (timer.isRunning && timer.currentTime > 0) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => {
          const newTime = prev.currentTime - 1
          if (newTime <= 0) {
            playBeep()
            return {
              ...prev,
              currentTime: 0,
              isRunning: false,
            }
          }
          return {
            ...prev,
            currentTime: newTime,
          }
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [timer.isRunning, timer.currentTime])

  const startTimer = (segmentIndex: number) => {
    const segment = todaySegments[segmentIndex]
    // Use day-specific duration if available, otherwise use default duration
    const daySchedule = segment.daySchedules?.find(ds => ds.day === selectedDay)
    const duration = daySchedule ? daySchedule.duration : segment.duration
    const timeInSeconds = duration * 60
    setTimer({
      isRunning: true,
      currentTime: timeInSeconds,
      totalTime: timeInSeconds,
      currentSegment: segmentIndex,
    })
  }

  const pauseTimer = () => {
    setTimer((prev) => ({ ...prev, isRunning: false }))
  }

  const resumeTimer = () => {
    setTimer((prev) => ({ ...prev, isRunning: true }))
  }

  const stopTimer = () => {
    setTimer({
      isRunning: false,
      currentTime: 0,
      totalTime: 0,
      currentSegment: 0,
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const updateSegment = async (id: string, updates: Partial<MeetingSegment>) => {
    try {
      setSaving(true)
      await meetingSegmentService.update(id, updates)
      await loadSegments() // Reload to get fresh data
      toast({
        title: "Success",
        description: "Meeting segment updated successfully.",
      })
    } catch (error) {
      console.error("Error updating segment:", error)
      toast({
        title: "Error",
        description: "Failed to update meeting segment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const addSegment = async () => {
    if (newSegment.title && newSegment.duration && newSegment.days && newSegment.days.length > 0) {
      try {
        setSaving(true)
        await meetingSegmentService.create({
          title: newSegment.title,
          duration: newSegment.duration,
          days: newSegment.days,
          startTime: newSegment.startTime,
          endTime: newSegment.endTime,
        } as Omit<MeetingSegment, "id" | "created_at" | "updated_at">)

        await loadSegments() // Reload to get fresh data
        setNewSegment({
          title: "",
          duration: 10,
          days: [],
          startTime: "7:00",
          endTime: "7:10",
        })
        setIsAddDialogOpen(false)
        toast({
          title: "Success",
          description: "Meeting segment added successfully.",
        })
      } catch (error) {
        console.error("Error adding segment:", error)
        toast({
          title: "Error",
          description: "Failed to add meeting segment. Please try again.",
          variant: "destructive",
        })
      } finally {
        setSaving(false)
      }
    }
  }

  const deleteSegment = async (id: string) => {
    try {
      setSaving(true)
      await meetingSegmentService.delete(id)
      await loadSegments() // Reload to get fresh data
      toast({
        title: "Success",
        description: "Meeting segment deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting segment:", error)
      toast({
        title: "Error",
        description: "Failed to delete meeting segment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDayChange = (day: string, checked: boolean, isNew = false) => {
    if (isNew) {
      setNewSegment((prev) => {
        const newDays = checked ? [...(prev.days || []), day] : (prev.days || []).filter((d) => d !== day)
        let newDaySchedules = prev.daySchedules || []
        
        if (checked) {
          // Add day schedule if not exists
          if (!newDaySchedules.find(ds => ds.day === day)) {
            const newSchedule = getOrCreateDaySchedule(newDaySchedules, day, prev.startTime, prev.duration)
            newDaySchedules = [...newDaySchedules, newSchedule]
          }
        } else {
          // Remove day schedule
          newDaySchedules = newDaySchedules.filter(ds => ds.day !== day)
        }
        
        return {
          ...prev,
          days: newDays,
          daySchedules: newDaySchedules
        }
      })
    } else if (editingSegment) {
      setEditingSegment((prev) => {
        if (!prev) return null
        
        const newDays = checked ? [...prev.days, day] : prev.days.filter((d) => d !== day)
        let newDaySchedules = prev.daySchedules || []
        
        if (checked) {
          // Add day schedule if not exists
          if (!newDaySchedules.find(ds => ds.day === day)) {
            const newSchedule = getOrCreateDaySchedule(newDaySchedules, day, prev.startTime, prev.duration)
            newDaySchedules = [...newDaySchedules, newSchedule]
          }
        } else {
          // Remove day schedule
          newDaySchedules = newDaySchedules.filter(ds => ds.day !== day)
        }
        
        return {
          ...prev,
          days: newDays,
          daySchedules: newDaySchedules
        }
      })
    }
  }

  const exportToPDF = async () => {
    try {
      const analytics = await meetingSegmentService.getAnalytics()

      // Sort segments by start time for ordered display
      const sortedSegments = [...segments].sort((a, b) => {
        const timeA = a.startTime || "00:00"
        const timeB = b.startTime || "00:00"
        return timeA.localeCompare(timeB)
      })

      // Create HTML content for PDF with proper PDF generation
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Electrical Team FMDS Daily Schedule</title>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A3 landscape;
      margin: 8mm;
    }
    
    body { 
      font-family: Arial, sans-serif;
      line-height: 1.2;
      color: #000;
      background: white;
      font-size: 11pt;
      padding: 0;
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    
    .table-title {
      font-size: 22pt;
      color: #2c3e50;
      margin-bottom: 12px;
      text-align: center;
      font-weight: bold;
      border-bottom: 2px solid #3498db;
      padding-bottom: 8px;
    }
    
    .main-table { 
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    
    .main-table th { 
      background: #2c3e50 !important;
      color: white !important;
      padding: 12px 8px;
      text-align: center;
      font-weight: bold;
      border: 1px solid #34495e;
      font-size: 11pt;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .main-table td { 
      padding: 10px 6px;
      border: 1px solid #ddd;
      text-align: center;
      font-size: 10pt;
    }
    
    .main-table tr:nth-child(even) {
      background-color: #f8f9fa !important;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .activity-name {
      font-weight: bold;
      color: #2c3e50;
      text-align: left;
      padding-left: 12px !important;
      font-size: 11pt;
    }
    
    .duration-badge {
      background: #3498db !important;
      color: white !important;
      padding: 6px 10px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 10pt;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .time-badge {
      background: #9b59b6 !important;
      color: white !important;
      padding: 3px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-weight: bold;
      font-size: 9pt;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .day-yes {
      background: #27ae60 !important;
      color: white !important;
      padding: 6px 8px;
      border-radius: 3px;
      font-weight: bold;
      font-size: 10pt;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
      text-align: center;
      min-height: 45px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    
    .day-no {
      background: #95a5a6 !important;
      color: white !important;
      padding: 6px 8px;
      border-radius: 3px;
      font-weight: bold;
      opacity: 0.7;
      font-size: 10pt;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .frequency-badge {
      background: #f39c12 !important;
      color: white !important;
      padding: 6px 10px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 10pt;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .weekly-minutes {
      background: #e74c3c !important;
      color: white !important;
      padding: 6px 10px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 10pt;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .summary-row {
      background: #ecf0f1 !important;
      font-weight: bold !important;
      border-top: 2px solid #2c3e50 !important;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .summary-row td {
      padding: 12px 8px !important;
      font-size: 11pt !important;
    }
    
    .footer-info {
      background: #34495e !important;
      color: white !important;
      padding: 12px;
      border-radius: 3px;
      text-align: center;
      font-size: 9pt;
      margin-top: 10px;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  </style>
</head>
<body>
  <h2 class="table-title">
    <svg width="60" height="60" viewBox="0 0 148 148" style="display: inline-block; vertical-align: middle; margin-right: 10px;" xmlns="http://www.w3.org/2000/svg">
      <path fill="#FEFFFE" d="M73.000000,149.000000 C48.686802,149.000000 24.873606,149.000000 1.030205,149.000000 C1.030205,99.728500 1.030205,50.456978 1.030205,1.092727 C50.229679,1.092727 99.459587,1.092727 148.844757,1.092727 C148.844757,50.332954 148.844757,99.666420 148.844757,149.000000 C123.790642,149.000000 98.645317,149.000000 73.000000,149.000000"/>
      <path fill="#0AA3A9" d="M66.077576,69.029228 C58.080856,79.589882 50.084141,90.150543 41.662998,101.271706 C30.511992,85.376930 19.711630,69.981964 8.921316,54.601326 C16.441002,48.567165 25.073895,48.218052 33.498177,53.827408 C37.630226,56.578758 41.392937,59.884796 45.813919,63.327366 C51.814465,69.509949 58.692383,70.213272 66.077576,69.029228"/>
      <path fill="#EAC448" d="M66.046532,69.015396 C58.692383,70.213272 51.814465,69.509949 46.144756,63.421082 C52.116474,59.943680 58.193146,56.645069 64.416634,53.651722 C66.124229,52.830418 68.327934,52.481773 70.200630,52.721970 C72.021149,52.955467 74.198204,53.838276 75.259438,55.189407 C75.833870,55.920750 74.692276,58.408249 73.817719,59.780312 C72.230087,62.271107 70.263710,64.520485 67.972771,67.144089"/>
    </svg>
    FMDS Meeting Schedule Matrix
  </h2>
  
  <table class="main-table">
    <thead>
      <tr>
        <th style="width: 26%;">🎯 Activity Name</th>
        <th style="width: 11%;">⏱️ Avg Duration (min)</th>
        <th style="width: 12%;">📅 SUN<br><small style="font-size: 8pt;">(time/duration)</small></th>
        <th style="width: 12%;">📅 MON<br><small style="font-size: 8pt;">(time/duration)</small></th>
        <th style="width: 12%;">📅 TUE<br><small style="font-size: 8pt;">(time/duration)</small></th>
        <th style="width: 12%;">📅 WED<br><small style="font-size: 8pt;">(time/duration)</small></th>
        <th style="width: 12%;">📅 THU<br><small style="font-size: 8pt;">(time/duration)</small></th>
        <th style="width: 13%;">📊 Frequency (days/week)</th>
        <th style="width: 13%;">📈 Weekly Minutes</th>
      </tr>
    </thead>
    <tbody>
      ${sortedSegments
        .map((segment) => {
          const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]

          return `
          <tr>
            <td class="activity-name">${segment.title}</td>
            <td><span class="duration-badge">${
              // Calculate average duration across all scheduled days
              segment.days.length > 0 
                ? Math.round(segment.days.reduce((total, day) => {
                    const daySchedule = segment.daySchedules?.find(ds => ds.day === day)
                    const duration = daySchedule ? daySchedule.duration : segment.duration
                    return total + duration
                  }, 0) / segment.days.length)
                : segment.duration
            }</span></td>
            ${days
              .map(
                (day) => {
                  const isScheduled = segment.days.includes(day)
                  if (!isScheduled) {
                    return `
                    <td>
                      <span class="day-no">✗</span>
                    </td>`
                  }
                  
                  // Check if there's a day-specific schedule
                  const daySchedule = segment.daySchedules?.find(ds => ds.day === day)
                  const duration = daySchedule ? daySchedule.duration : segment.duration
                  const startTime = daySchedule ? daySchedule.startTime : segment.startTime
                  const endTime = daySchedule ? daySchedule.endTime : segment.endTime
                  
                  return `
                  <td>
                    <div class="day-yes" style="padding: 5px 6px;">
                      <div style="font-weight: bold; margin-bottom: 2px; font-size: 11pt;">✓</div>
                      <div style="font-size: 8pt; line-height: 1.1;">
                        <div style="margin-bottom: 2px;">${startTime}-${endTime}</div>
                        <div>${duration}min</div>
                      </div>
                    </div>
                  </td>`
                }
              )
              .join("")}
            <td><span class="frequency-badge">${segment.days.length}/5</span></td>
            <td><span class="weekly-minutes">${
              // Calculate total weekly minutes considering day-specific durations
              segment.days.reduce((total, day) => {
                const daySchedule = segment.daySchedules?.find(ds => ds.day === day)
                const duration = daySchedule ? daySchedule.duration : segment.duration
                return total + duration
              }, 0)
            }</span></td>
          </tr>
        `
        })
        .join("")}
      
      <!-- Summary Row -->
      <tr class="summary-row">
        <td class="activity-name" style="color: #2c3e50;">📊 TOTALS</td>
        <td><span class="duration-badge" style="background: #2c3e50;">${
          // Calculate overall average duration
          Math.round(analytics.totalDuration / (analytics.totalActivities || 1))
        }</span></td>
        ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]
          .map((day) => {
            const dayTotal = sortedSegments
              .filter((s) => s.days.includes(day))
              .reduce((sum, s) => {
                // Use day-specific duration if available, otherwise use default duration
                const daySchedule = s.daySchedules?.find(ds => ds.day === day)
                const duration = daySchedule ? daySchedule.duration : s.duration
                return sum + duration
              }, 0)
            return `<td><span class="day-yes" style="background: #2c3e50;">${dayTotal}m</span></td>`
          })
          .join("")}
        <td><span class="frequency-badge" style="background: #2c3e50;">AVG: ${analytics.averageDuration}m</span></td>
        <td><span class="weekly-minutes" style="background: #2c3e50;">${
          // Calculate total weekly minutes considering day-specific durations
          sortedSegments.reduce((total, segment) => {
            return total + segment.days.reduce((segmentTotal, day) => {
              const daySchedule = segment.daySchedules?.find(ds => ds.day === day)
              const duration = daySchedule ? daySchedule.duration : segment.duration
              return segmentTotal + duration
            }, 0)
          }, 0)
        }</span></td>
      </tr>
    </tbody>
  </table>
  
  <div class="footer-info">
    <svg width="16" height="16" viewBox="0 0 148 148" style="display: inline-block; vertical-align: middle; margin-right: 8px;" xmlns="http://www.w3.org/2000/svg">
      <path fill="#FEFFFE" d="M73.000000,149.000000 C48.686802,149.000000 24.873606,149.000000 1.030205,149.000000 C1.030205,99.728500 1.030205,50.456978 1.030205,1.092727 C50.229679,1.092727 99.459587,1.092727 148.844757,1.092727 C148.844757,50.332954 148.844757,99.666420 148.844757,149.000000 C123.790642,149.000000 98.645317,149.000000 73.000000,149.000000"/>
      <path fill="#0AA3A9" d="M66.077576,69.029228 C58.080856,79.589882 50.084141,90.150543 41.662998,101.271706 C30.511992,85.376930 19.711630,69.981964 8.921316,54.601326 C16.441002,48.567165 25.073895,48.218052 33.498177,53.827408 C37.630226,56.578758 41.392937,59.884796 45.813919,63.327366 C51.814465,69.509949 58.692383,70.213272 66.077576,69.029228"/>
      <path fill="#EAC448" d="M66.046532,69.015396 C58.692383,70.213272 51.814465,69.509949 46.144756,63.421082 C52.116474,59.943680 58.193146,56.645069 64.416634,53.651722 C66.124229,52.830418 68.327934,52.481773 70.200630,52.721970 C72.021149,52.955467 74.198204,53.838276 75.259438,55.189407 C75.833870,55.920750 74.692276,58.408249 73.817719,59.780312 C72.230087,62.271107 70.263710,64.520485 67.972771,67.144089"/>
    </svg>
    <strong>Electrical Team FMDS Daily Schedule</strong> | 
    Generated: ${new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })} | 
    Database: Connected | Activities: ${analytics.totalActivities} | Weekly Commitment: ${
      // Calculate total weekly minutes considering day-specific durations  
      sortedSegments.reduce((total, segment) => {
        return total + segment.days.reduce((segmentTotal, day) => {
          const daySchedule = segment.daySchedules?.find(ds => ds.day === day)
          const duration = daySchedule ? daySchedule.duration : segment.duration
          return segmentTotal + duration
        }, 0)
      }, 0)
    } minutes
  </div>
</body>
</html>`

      // Create a proper PDF using browser's print functionality
      const printWindow = window.open("", "_blank", "width=1200,height=800")
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()

        // Wait for content to load then trigger print dialog which can save as PDF
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.focus()
            printWindow.print()
          }, 500)
        }
      }

      toast({
        title: "PDF Ready! 📄",
        description: "Print dialog opened. Choose 'Save as PDF' in the print options to download as PDF file.",
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      })
    }
  }

  const downloadPDF = async () => {
    try {
      const analytics = await meetingSegmentService.getAnalytics()

      // Sort segments by start time for ordered display
      const sortedSegments = [...segments].sort((a, b) => {
        const timeA = a.startTime || "00:00"
        const timeB = b.startTime || "00:00"
        return timeA.localeCompare(timeB)
      })

      // Create a temporary container for PDF generation
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '-9999px'
      container.style.width = '1400px' // A3 landscape width approximation
      container.style.fontFamily = 'Arial, sans-serif'
      container.style.fontSize = '12px'
      container.style.color = '#000'
      container.style.backgroundColor = '#fff'
      container.style.padding = '20px'

      container.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <svg width="48" height="48" viewBox="0 0 148 148" style="display: inline-block; vertical-align: middle; margin-right: 8px;" xmlns="http://www.w3.org/2000/svg">
            <path fill="#FEFFFE" d="M73.000000,149.000000 C48.686802,149.000000 24.873606,149.000000 1.030205,149.000000 C1.030205,99.728500 1.030205,50.456978 1.030205,1.092727 C50.229679,1.092727 99.459587,1.092727 148.844757,1.092727 C148.844757,50.332954 148.844757,99.666420 148.844757,149.000000 C123.790642,149.000000 98.645317,149.000000 73.000000,149.000000"/>
            <path fill="#0AA3A9" d="M66.077576,69.029228 C58.080856,79.589882 50.084141,90.150543 41.662998,101.271706 C30.511992,85.376930 19.711630,69.981964 8.921316,54.601326 C16.441002,48.567165 25.073895,48.218052 33.498177,53.827408 C37.630226,56.578758 41.392937,59.884796 45.813919,63.327366 C51.814465,69.509949 58.692383,70.213272 66.077576,69.029228"/>
            <path fill="#EAC448" d="M66.046532,69.015396 C58.692383,70.213272 51.814465,69.509949 46.144756,63.421082 C52.116474,59.943680 58.193146,56.645069 64.416634,53.651722 C66.124229,52.830418 68.327934,52.481773 70.200630,52.721970 C72.021149,52.955467 74.198204,53.838276 75.259438,55.189407 C75.833870,55.920750 74.692276,58.408249 73.817719,59.780312 C72.230087,62.271107 70.263710,64.520485 67.972771,67.144089"/>
          </svg>
          <h2 style="font-size: 24px; color: #2c3e50; margin: 10px 0; font-weight: bold; border-bottom: 2px solid #3498db; padding-bottom: 10px; display: inline-block;">
            FMDS Meeting Schedule Matrix
          </h2>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #ddd;">
          <thead>
            <tr style="background-color: #2c3e50; color: white;">
              <th style="padding: 12px 8px; text-align: center; font-weight: bold; border: 1px solid #34495e; font-size: 11px;">🎯 Activity Name</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: bold; border: 1px solid #34495e; font-size: 11px;">⏱️ Avg Duration (min)</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: bold; border: 1px solid #34495e; font-size: 11px;">📅 SUN<br><small style="font-size: 8px;">(time/duration)</small></th>
              <th style="padding: 12px 8px; text-align: center; font-weight: bold; border: 1px solid #34495e; font-size: 11px;">📅 MON<br><small style="font-size: 8px;">(time/duration)</small></th>
              <th style="padding: 12px 8px; text-align: center; font-weight: bold; border: 1px solid #34495e; font-size: 11px;">📅 TUE<br><small style="font-size: 8px;">(time/duration)</small></th>
              <th style="padding: 12px 8px; text-align: center; font-weight: bold; border: 1px solid #34495e; font-size: 11px;">📅 WED<br><small style="font-size: 8px;">(time/duration)</small></th>
              <th style="padding: 12px 8px; text-align: center; font-weight: bold; border: 1px solid #34495e; font-size: 11px;">📅 THU<br><small style="font-size: 8px;">(time/duration)</small></th>
              <th style="padding: 12px 8px; text-align: center; font-weight: bold; border: 1px solid #34495e; font-size: 11px;">📊 Frequency</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: bold; border: 1px solid #34495e; font-size: 11px;">📈 Weekly Minutes</th>
            </tr>
          </thead>
          <tbody>
            ${sortedSegments
              .map((segment, index) => {
                const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]
                const rowStyle = index % 2 === 0 ? 'background-color: #f8f9fa;' : ''

                return `
                <tr style="${rowStyle}">
                  <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: left; font-weight: bold; color: #2c3e50;">${segment.title}</td>
                  <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center;">
                    <span style="background: #3498db; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                      ${
                        // Calculate average duration across all scheduled days
                        segment.days.length > 0 
                          ? Math.round(segment.days.reduce((total, day) => {
                              const daySchedule = segment.daySchedules?.find(ds => ds.day === day)
                              const duration = daySchedule ? daySchedule.duration : segment.duration
                              return total + duration
                            }, 0) / segment.days.length)
                          : segment.duration
                      }
                    </span>
                  </td>
                  ${days
                    .map(
                      (day) => {
                        const isScheduled = segment.days.includes(day)
                        if (!isScheduled) {
                          return `
                          <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center;">
                            <span style="background: #95a5a6; color: white; padding: 3px 6px; border-radius: 3px; font-weight: bold; opacity: 0.7;">✗</span>
                          </td>`
                        }
                        
                        // Check if there's a day-specific schedule
                        const daySchedule = segment.daySchedules?.find(ds => ds.day === day)
                        const duration = daySchedule ? daySchedule.duration : segment.duration
                        const startTime = daySchedule ? daySchedule.startTime : segment.startTime
                        const endTime = daySchedule ? daySchedule.endTime : segment.endTime
                        
                        return `
                        <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center;">
                          <div style="background: #27ae60; color: white; padding: 6px 4px; border-radius: 3px; font-weight: bold; display: inline-block; min-width: 80px;">
                            <div style="font-weight: bold; margin-bottom: 2px;">✓</div>
                            <div style="font-size: 9px; line-height: 1.2;">
                              <div style="margin-bottom: 1px;">${startTime}-${endTime}</div>
                              <div>${duration}min</div>
                            </div>
                          </div>
                        </td>`
                      }
                    )
                    .join("")}
                  <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center;">
                    <span style="background: #f39c12; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${segment.days.length}/5</span>
                  </td>
                  <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center;">
                    <span style="background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                      ${
                        // Calculate total weekly minutes considering day-specific durations
                        segment.days.reduce((total, day) => {
                          const daySchedule = segment.daySchedules?.find(ds => ds.day === day)
                          const duration = daySchedule ? daySchedule.duration : segment.duration
                          return total + duration
                        }, 0)
                      }
                    </span>
                  </td>
                </tr>
              `
              })
              .join("")}
            
            <!-- Summary Row -->
            <tr style="background: #ecf0f1; font-weight: bold; border-top: 2px solid #2c3e50;">
              <td style="padding: 12px 8px; border: 1px solid #ddd; text-align: left; color: #2c3e50; font-weight: bold;">📊 TOTALS</td>
              <td style="padding: 12px 8px; border: 1px solid #ddd; text-align: center;">
                <span style="background: #2c3e50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                  ${Math.round(analytics.totalDuration / (analytics.totalActivities || 1))}
                </span>
              </td>
              ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]
                .map((day) => {
                  const dayTotal = sortedSegments
                    .filter((s) => s.days.includes(day))
                    .reduce((sum, s) => {
                      // Use day-specific duration if available, otherwise use default duration
                      const daySchedule = s.daySchedules?.find(ds => ds.day === day)
                      const duration = daySchedule ? daySchedule.duration : s.duration
                      return sum + duration
                    }, 0)
                  return `<td style="padding: 12px 8px; border: 1px solid #ddd; text-align: center;"><span style="background: #2c3e50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${dayTotal}m</span></td>`
                })
                .join("")}
              <td style="padding: 12px 8px; border: 1px solid #ddd; text-align: center;">
                <span style="background: #2c3e50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">AVG: ${analytics.averageDuration}m</span>
              </td>
              <td style="padding: 12px 8px; border: 1px solid #ddd; text-align: center;">
                <span style="background: #2c3e50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                  ${
                    // Calculate total weekly minutes considering day-specific durations
                    sortedSegments.reduce((total, segment) => {
                      return total + segment.days.reduce((segmentTotal, day) => {
                        const daySchedule = segment.daySchedules?.find(ds => ds.day === day)
                        const duration = daySchedule ? daySchedule.duration : segment.duration
                        return segmentTotal + duration
                      }, 0)
                    }, 0)
                  }
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div style="background: #34495e; color: white; padding: 15px; border-radius: 3px; text-align: center; font-size: 10px; margin-top: 20px;">
          <strong>Electrical Team FMDS Daily Schedule</strong> | 
          Generated: ${new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })} | 
          Database: Connected | Activities: ${analytics.totalActivities} | Weekly Commitment: ${
            // Calculate total weekly minutes considering day-specific durations  
            sortedSegments.reduce((total, segment) => {
              return total + segment.days.reduce((segmentTotal, day) => {
                const daySchedule = segment.daySchedules?.find(ds => ds.day === day)
                const duration = daySchedule ? daySchedule.duration : segment.duration
                return segmentTotal + duration
              }, 0)
            }, 0)
          } minutes
        </div>
      `

      document.body.appendChild(container)

      // Use html2canvas and jsPDF to generate PDF
      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF } = await import('jspdf')

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 1400,
        height: container.scrollHeight
      })

      document.body.removeChild(container)

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      })

      const imgWidth = 420 // A3 landscape width in mm
      const pageHeight = 297 // A3 landscape height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const fileName = `FMDS-Meeting-Schedule-${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)

      toast({
        title: "PDF Downloaded! 📄",
        description: `File saved as ${fileName}`,
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "Failed to download PDF. Please try again or use the print option.",
        variant: "destructive",
      })
    }
  }

  const progress = timer.totalTime > 0 ? ((timer.totalTime - timer.currentTime) / timer.totalTime) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm sm:text-base">Loading meeting segments from database...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold text-center flex flex-col sm:flex-row items-center justify-center gap-2">
              <span>FMDS Meeting Timer</span>
              <div className="flex items-center gap-1 text-xs sm:text-sm font-normal text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Database Connected</span>
              </div>
            </CardTitle>
            <p className="text-center text-muted-foreground text-sm sm:text-base">Daily meetings: {meetingTime}</p>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {/* Add New Activity Form - Top Position */}
            {isAddDialogOpen && (
              <Card className="border-2 border-green-200 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-green-800 text-lg sm:text-xl">Add New Activity</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddDialogOpen(false)
                      setNewSegment({
                        title: "",
                        duration: 10,
                        days: [],
                        startTime: "7:00",
                        endTime: "7:10",
                      })
                    }}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Label htmlFor="new-title" className="text-sm font-medium">
                        Activity Title:
                      </Label>
                      <Input
                        id="new-title"
                        value={newSegment.title || ""}
                        onChange={(e) => setNewSegment((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter activity name"
                        disabled={saving}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-duration" className="text-sm font-medium">
                        Duration (minutes):
                      </Label>
                      <Input
                        id="new-duration"
                        type="number"
                        value={newSegment.duration || 10}
                        onChange={(e) =>
                          setNewSegment((prev) => ({ ...prev, duration: Number.parseInt(e.target.value) || 10 }))
                        }
                        disabled={saving}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-start-time" className="text-sm font-medium">
                        Start Time:
                      </Label>
                      <Input
                        id="new-start-time"
                        type="time"
                        value={newSegment.startTime || "7:00"}
                        onChange={(e) => setNewSegment((prev) => ({ ...prev, startTime: e.target.value }))}
                        disabled={saving}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-end-time" className="text-sm font-medium">
                        End Time (Auto-calculated):
                      </Label>
                      <Input
                        id="new-end-time"
                        type="time"
                        value={newSegment.endTime || "7:10"}
                        disabled={true}
                        className="mt-1 bg-gray-100"
                        title="End time is automatically calculated based on start time + duration"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Select Days:</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
                      {days.map((day) => (
                        <div key={day} className="flex items-center space-x-2">
                          <Checkbox
                            id={`new-${day}`}
                            checked={(newSegment.days || []).includes(day)}
                            onCheckedChange={(checked) => handleDayChange(day, checked as boolean, true)}
                            disabled={saving}
                          />
                          <Label htmlFor={`new-${day}`} className="text-sm">
                            {day.slice(0, 3)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-4">
                    <Button
                      onClick={addSegment}
                      className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                      {saving ? "Adding..." : "Add Activity"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false)
                        setNewSegment({
                          title: "",
                          duration: 10,
                          days: [],
                          startTime: "7:00",
                          endTime: "7:10",
                        })
                      }}
                      disabled={saving}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Mobile-Responsive Day Selector */}
            <div>
              <Label className="text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4 block">
                Select Meeting Day
              </Label>

              {/* Mobile: Dropdown selector */}
              <div className="block sm:hidden">
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium"
                >
                  {days.map((day) => {
                    const todaySegmentsCount = segments.filter((segment) => segment.days.includes(day)).length
                    const totalDuration = segments
                      .filter((segment) => segment.days.includes(day))
                      .reduce((sum, seg) => {
                        // Check if there's a day-specific schedule
                        const daySchedule = seg.daySchedules?.find(ds => ds.day === day)
                        return sum + (daySchedule ? daySchedule.duration : seg.duration)
                      }, 0)
                    return (
                      <option key={day} value={day}>
                        {day} - {todaySegmentsCount} activities ({totalDuration}min)
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Desktop: Calendar-style selector */}
              <div className="hidden sm:flex justify-center">
                <div className="inline-flex bg-white rounded-xl shadow-lg border border-gray-200 p-2 gap-1">
                  {days.map((day, index) => {
                    const isSelected = selectedDay === day
                    const todaySegmentsCount = segments.filter((segment) => segment.days.includes(day)).length
                    const totalDuration = segments
                      .filter((segment) => segment.days.includes(day))
                      .reduce((sum, seg) => {
                        // Check if there's a day-specific schedule
                        const daySchedule = seg.daySchedules?.find(ds => ds.day === day)
                        return sum + (daySchedule ? daySchedule.duration : seg.duration)
                      }, 0)

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`
                          relative flex flex-col items-center justify-center px-3 lg:px-4 py-3 rounded-lg transition-all duration-200 min-w-[80px] lg:min-w-[100px]
                          ${
                            isSelected
                              ? "bg-green-500 text-white shadow-md transform scale-105"
                              : "bg-gray-50 text-gray-700 hover:bg-green-50 hover:text-green-700 hover:shadow-sm"
                          }
                        `}
                      >
                        <div
                          className={`text-xs font-medium uppercase tracking-wide mb-1 ${isSelected ? "text-green-100" : "text-gray-500"}`}
                        >
                          {day.slice(0, 3)}
                        </div>
                        <div className={`text-lg font-bold mb-1 ${isSelected ? "text-white" : "text-gray-800"}`}>
                          {index + 1}
                        </div>
                        {todaySegmentsCount > 0 && (
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-2 h-2 rounded-full mb-1 ${isSelected ? "bg-white" : "bg-green-400"}`}
                            ></div>
                            <div className={`text-xs ${isSelected ? "text-green-100" : "text-gray-500"}`}>
                              {todaySegmentsCount} activities
                            </div>
                            <div className={`text-xs ${isSelected ? "text-green-100" : "text-gray-500"}`}>
                              {totalDuration}min
                            </div>
                          </div>
                        )}
                        {todaySegmentsCount === 0 && (
                          <div className={`text-xs ${isSelected ? "text-green-100" : "text-gray-400"}`}>
                            No meetings
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-green-500"></div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Selected day info */}
              <div className="text-center mt-4">
                <div className="inline-flex items-center gap-2 bg-green-50 px-3 sm:px-4 py-2 rounded-full border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-700 font-medium text-sm sm:text-base">
                    {selectedDay} Schedule - {todaySegments.length} activities (
                    {todaySegments.reduce((sum, seg) => {
                      // Check if there's a day-specific schedule
                      const daySchedule = seg.daySchedules?.find(ds => ds.day === selectedDay)
                      return sum + (daySchedule ? daySchedule.duration : seg.duration)
                    }, 0)} minutes total)
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile-Responsive Action buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              {/* Mobile: Hamburger menu */}
              <div className="block sm:hidden w-full">
                <Button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                >
                  {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                  {isMobileMenuOpen ? "Close Menu" : "Actions Menu"}
                </Button>

                {isMobileMenuOpen && (
                  <div className="mt-3 space-y-2 bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                    <Button
                      onClick={() => {
                        setIsAddDialogOpen(true)
                        setIsEditDialogOpen(false)
                        setEditingSegment(null)
                        setShowDaySchedules(false)
                        setIsMobileMenuOpen(false)
                      }}
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={saving}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Activity
                    </Button>
                    <Button
                      onClick={() => {
                        exportToPDF()
                        setIsMobileMenuOpen(false)
                      }}
                      variant="outline"
                      className="w-full border-green-500 text-green-700 hover:bg-green-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Print PDF
                    </Button>
                    {/* <Button
                      onClick={() => {
                        downloadPDF()
                        setIsMobileMenuOpen(false)
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button> */}
                    <Button
                      onClick={() => {
                        loadSegments()
                        setIsMobileMenuOpen(false)
                      }}
                      variant="outline"
                      className="w-full border-gray-500 text-gray-700 hover:bg-gray-50"
                      disabled={loading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>
                )}
              </div>

              {/* Desktop: Horizontal buttons */}
              <div className="hidden sm:flex gap-2 flex-wrap">
                <Button
                  onClick={() => {
                    setIsAddDialogOpen(true)
                    setIsEditDialogOpen(false)
                    setEditingSegment(null)
                    setShowDaySchedules(false)
                  }}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={saving}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Activity
                </Button>
                <Button
                  onClick={exportToPDF}
                  variant="outline"
                  className="border-green-500 text-green-700 hover:bg-green-50 bg-transparent"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Print PDF
                </Button>
                {/* <Button
                  onClick={downloadPDF}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button> */}
                <Button
                  onClick={loadSegments}
                  variant="outline"
                  className="border-gray-500 text-gray-700 hover:bg-gray-50 bg-transparent"
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              {/* Quick stats - responsive */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Activities: {segments.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>
                    Active Days: {days.filter((day) => segments.some((seg) => seg.days.includes(day))).length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>DB Connected</span>
                </div>
              </div>
            </div>

            {/* Current Timer Display - Mobile Responsive */}
            {timer.totalTime > 0 && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="text-center space-y-3 sm:space-y-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-green-800 px-2">
                      {todaySegments[timer.currentSegment]?.title}
                    </h3>
                    <div className="text-3xl sm:text-4xl font-mono font-bold text-green-700">
                      {formatTime(timer.currentTime)}
                    </div>
                    <div className="w-full bg-green-100 rounded-full h-3 sm:h-4">
                      <div
                        className="bg-green-500 h-3 sm:h-4 rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-center gap-2">
                      {timer.isRunning ? (
                        <Button
                          onClick={pauseTimer}
                          variant="outline"
                          className="border-green-500 text-green-700 hover:bg-green-50 bg-transparent w-full sm:w-auto"
                        >
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </Button>
                      ) : (
                        <Button
                          onClick={resumeTimer}
                          disabled={timer.currentTime === 0}
                          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Resume
                        </Button>
                      )}
                      <Button onClick={stopTimer} variant="destructive" className="w-full sm:w-auto">
                        <Square className="w-4 h-4 mr-2" />
                        Stop
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mobile-Responsive Schedule Table */}
            <div className="space-y-4">
              {/* Mobile: Card layout */}
              <div className="block sm:hidden space-y-3">
                {todaySegments.length > 0 ? (
                  todaySegments.map((segment, index) => (
                    <div key={segment.id}>
                      <Card className="border border-gray-200 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <h3 className="font-semibold text-gray-900 text-sm">{segment.title}</h3>
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                {(() => {
                                  const daySchedule = segment.daySchedules?.find(ds => ds.day === selectedDay)
                                  return daySchedule ? `${daySchedule.duration}min` : `${segment.duration}min`
                                })()}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                              <div>
                                <span className="font-medium">Time:</span> {(() => {
                                  const daySchedule = segment.daySchedules?.find(ds => ds.day === selectedDay)
                                  return daySchedule 
                                    ? `${daySchedule.startTime} - ${daySchedule.endTime}`
                                    : `${segment.startTime} - ${segment.endTime}`
                                })()}
                              </div>
                              <div>
                                <span className="font-medium">Days:</span> {segment.days.join(", ")}
                              </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Button
                                onClick={() => startTimer(index)}
                                size="sm"
                                disabled={timer.isRunning || saving}
                                className="bg-green-600 hover:bg-green-700 flex-1"
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Start
                              </Button>
                              <Button
                                onClick={() => {
                                  setEditingSegment(segment)
                                  setIsEditDialogOpen(true)
                                  setIsAddDialogOpen(false)
                                  setShowDaySchedules(false)
                                }}
                                size="sm"
                                variant="outline"
                                disabled={saving}
                                className="flex-1"
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                onClick={() => deleteSegment(segment.id)}
                                size="sm"
                                variant="destructive"
                                disabled={saving}
                                className="px-3"
                              >
                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Inline Edit Form for Mobile */}
                      {isEditDialogOpen && editingSegment && editingSegment.id === segment.id && (
                        <Card className="border-2 border-green-200 shadow-lg mt-2">
                          <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-green-800 text-sm">
                              Edit: {editingSegment.title}
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIsEditDialogOpen(false)
                                setEditingSegment(null)
                                setShowDaySchedules(false)
                              }}
                              className="h-6 w-6 p-0 hover:bg-gray-100"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <Label htmlFor={`edit-title-${segment.id}`} className="text-xs font-medium">
                                  Activity Title:
                                </Label>
                                <Input
                                  id={`edit-title-${segment.id}`}
                                  value={editingSegment.title}
                                  onChange={(e) =>
                                    setEditingSegment((prev) => (prev ? { ...prev, title: e.target.value } : null))
                                  }
                                  disabled={saving}
                                  className="mt-1 text-xs"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label htmlFor={`edit-duration-${segment.id}`} className="text-xs font-medium">
                                    Duration (min):
                                  </Label>
                                  <Input
                                    id={`edit-duration-${segment.id}`}
                                    type="number"
                                    value={editingSegment.duration}
                                    onChange={(e) =>
                                      setEditingSegment((prev) =>
                                        prev ? { ...prev, duration: Number.parseInt(e.target.value) || 0 } : null,
                                      )
                                    }
                                    disabled={saving}
                                    className="mt-1 text-xs"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`edit-start-time-${segment.id}`} className="text-xs font-medium">
                                    Start Time:
                                  </Label>
                                  <Input
                                    id={`edit-start-time-${segment.id}`}
                                    type="time"
                                    value={editingSegment.startTime}
                                    onChange={(e) =>
                                      setEditingSegment((prev) => (prev ? { ...prev, startTime: e.target.value } : null))
                                    }
                                    disabled={saving}
                                    className="mt-1 text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-medium">Select Days:</Label>
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                {days.map((day) => (
                                  <div key={day} className="flex items-center space-x-1">
                                    <Checkbox
                                      id={`edit-${day}-${segment.id}`}
                                      checked={editingSegment.days.includes(day)}
                                      onCheckedChange={(checked) => handleDayChange(day, checked as boolean)}
                                      disabled={saving}
                                    />
                                    <Label htmlFor={`edit-${day}-${segment.id}`} className="text-xs">
                                      {day.slice(0, 3)}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Day-Specific Schedule Settings for Mobile */}
                            {editingSegment.days.length > 0 && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-medium">Day-Specific Times:</Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowDaySchedules(!showDaySchedules)}
                                    className="text-xs h-6 px-2"
                                  >
                                    {showDaySchedules ? "Hide" : "Show"}
                                  </Button>
                                </div>
                                
                                {showDaySchedules && (
                                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg border">
                                    {editingSegment.days.map((day) => {
                                      const daySchedule = getOrCreateDaySchedule(editingSegment.daySchedules, day, editingSegment.startTime, editingSegment.duration)
                                      return (
                                        <div key={day} className="grid grid-cols-2 gap-2 p-2 bg-white rounded border">
                                          <div className="col-span-2">
                                            <Label className="text-xs font-medium text-gray-700">
                                              {day}
                                            </Label>
                                          </div>
                                          <div>
                                            <Label className="text-xs text-gray-600">Time:</Label>
                                            <Input
                                              type="time"
                                              value={daySchedule.startTime}
                                              onChange={(e) => updateDaySchedule(day, 'startTime', e.target.value)}
                                              disabled={saving}
                                              className="mt-1 text-xs h-6"
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs text-gray-600">Duration:</Label>
                                            <Input
                                              type="number"
                                              value={daySchedule.duration}
                                              onChange={(e) => updateDaySchedule(day, 'duration', Number.parseInt(e.target.value) || 0)}
                                              disabled={saving}
                                              className="mt-1 text-xs h-6"
                                              min="1"
                                            />
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="flex gap-2 pt-2">
                              <Button
                                onClick={() => {
                                  if (editingSegment) {
                                    updateSegment(editingSegment.id, editingSegment)
                                    setIsEditDialogOpen(false)
                                    setEditingSegment(null)
                                    setShowDaySchedules(false)
                                  }
                                }}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 flex-1 text-xs"
                                disabled={saving}
                              >
                                {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save"}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setIsEditDialogOpen(false)
                                  setEditingSegment(null)
                                  setShowDaySchedules(false)
                                }}
                                size="sm"
                                disabled={saving}
                                className="flex-1 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ))
                ) : (
                  <Card className="border border-gray-200">
                    <CardContent className="p-6 text-center text-gray-500">
                      <p>No activities scheduled for {selectedDay}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Desktop: Table layout */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 bg-white rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-green-100">
                      <th className="border border-gray-300 p-3 text-left text-sm font-semibold">Activity</th>
                      <th className="border border-gray-300 p-3 text-center text-sm font-semibold">Duration (min)</th>
                      <th className="border border-gray-300 p-3 text-center text-sm font-semibold">Time Range</th>
                      <th className="border border-gray-300 p-3 text-center text-sm font-semibold">Days</th>
                      <th className="border border-gray-300 p-3 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todaySegments.length > 0 ? (
                      todaySegments.map((segment, index) => (
                        <tr key={segment.id} className="hover:bg-green-50 transition-colors">
                          <td className="border border-gray-300 p-3 font-medium">{segment.title}</td>
                          <td className="border border-gray-300 p-3 text-center">
                            {(() => {
                              const daySchedule = segment.daySchedules?.find(ds => ds.day === selectedDay)
                              return daySchedule ? daySchedule.duration : segment.duration
                            })()}
                          </td>
                          <td className="border border-gray-300 p-3 text-center">
                            {(() => {
                              const daySchedule = segment.daySchedules?.find(ds => ds.day === selectedDay)
                              return daySchedule 
                                ? `${daySchedule.startTime} - ${daySchedule.endTime}`
                                : `${segment.startTime} - ${segment.endTime}`
                            })()}
                          </td>
                          <td className="border border-gray-300 p-3 text-center text-sm">{segment.days.join(", ")}</td>
                          <td className="border border-gray-300 p-3 text-center">
                            <div className="flex justify-center gap-2">
                              <Button
                                onClick={() => startTimer(index)}
                                size="sm"
                                disabled={timer.isRunning || saving}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => {
                                  setEditingSegment(segment)
                                  setIsEditDialogOpen(true)
                                  setIsAddDialogOpen(false)
                                  setShowDaySchedules(false)
                                }}
                                size="sm"
                                variant="outline"
                                disabled={saving}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => deleteSegment(segment.id)}
                                size="sm"
                                variant="destructive"
                                disabled={saving}
                              >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="border border-gray-300 p-6 text-center text-gray-500">
                          No activities scheduled for {selectedDay}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
