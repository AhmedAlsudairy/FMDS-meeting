"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Play, Pause, Square, Edit, Plus, Download, Trash2 } from "lucide-react"

interface MeetingSegment {
  id: string
  title: string
  duration: number // in minutes
  days: string[]
  startTime?: string
  endTime?: string
}

interface TimerState {
  isRunning: boolean
  currentTime: number
  totalTime: number
  currentSegment: number
}

const defaultSegments: MeetingSegment[] = [
  {
    id: "1",
    title: "Backlog Review",
    duration: 10,
    days: ["Sunday", "Monday"],
    startTime: "7:10",
    endTime: "7:20",
  },
  {
    id: "2",
    title: "Yesterday Problems",
    duration: 10,
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
    startTime: "7:11",
    endTime: "7:21",
  },
  {
    id: "3",
    title: "Unsafe Conditions",
    duration: 15,
    days: ["Wednesday"],
    startTime: "7:21",
    endTime: "7:36",
  },
  {
    id: "4",
    title: "YT Prop Activities",
    duration: 15,
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
    startTime: "7:36",
    endTime: "7:50",
  },
]

export default function MeetingTimer() {
  const [segments, setSegments] = useState<MeetingSegment[]>(defaultSegments)
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
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]
  const meetingTime = "7:10 AM - 7:50 AM"

  // Get segments for selected day
  const todaySegments = segments.filter((segment) => segment.days.includes(selectedDay))

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
    const timeInSeconds = segment.duration * 60
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

  const updateSegment = (id: string, updates: Partial<MeetingSegment>) => {
    setSegments((prev) => prev.map((seg) => (seg.id === id ? { ...seg, ...updates } : seg)))
  }

  const addSegment = () => {
    if (newSegment.title && newSegment.duration && newSegment.days && newSegment.days.length > 0) {
      const segment: MeetingSegment = {
        id: Date.now().toString(),
        title: newSegment.title,
        duration: newSegment.duration,
        days: newSegment.days,
        startTime: newSegment.startTime,
        endTime: newSegment.endTime,
      }
      setSegments((prev) => [...prev, segment])
      setNewSegment({
        title: "",
        duration: 10,
        days: [],
        startTime: "7:00",
        endTime: "7:10",
      })
      setIsAddDialogOpen(false)
    }
  }

  const deleteSegment = (id: string) => {
    setSegments((prev) => prev.filter((seg) => seg.id !== id))
  }

  const handleDayChange = (day: string, checked: boolean, isNew = false) => {
    if (isNew) {
      setNewSegment((prev) => ({
        ...prev,
        days: checked ? [...(prev.days || []), day] : (prev.days || []).filter((d) => d !== day),
      }))
    } else if (editingSegment) {
      setEditingSegment((prev) =>
        prev
          ? {
              ...prev,
              days: checked ? [...prev.days, day] : prev.days.filter((d) => d !== day),
            }
          : null,
      )
    }
  }

  const exportToPDF = () => {
    // Create a comprehensive table for all days and segments
    const allDaysData = days.map((day) => {
      const daySegments = segments.filter((segment) => segment.days.includes(day))
      return {
        day,
        segments: daySegments,
        totalDuration: daySegments.reduce((sum, seg) => sum + seg.duration, 0),
      }
    })

    const totalActivities = segments.length
    const activeDays = allDaysData.filter((d) => d.segments.length > 0).length
    const grandTotalDuration = allDaysData.reduce((sum, day) => sum + day.totalDuration, 0)

    // Create HTML content for PDF with professional styling
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>FMDS Meeting Schedule</title>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        
        .header {
          background: linear-gradient(135deg, #16a085 0%, #2ecc71 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
          position: relative;
        }
        
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.05)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          opacity: 0.3;
        }
        
        .header-content {
          position: relative;
          z-index: 1;
        }
        
        .company-logo {
          width: 60px;
          height: 60px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
        }
        
        h1 { 
          font-size: 2.5em;
          margin-bottom: 10px;
          font-weight: 300;
          letter-spacing: 2px;
        }
        
        .subtitle {
          font-size: 1.2em;
          opacity: 0.9;
          margin-bottom: 20px;
        }
        
        .meeting-info { 
          background: rgba(255,255,255,0.15);
          padding: 20px;
          border-radius: 10px;
          backdrop-filter: blur(10px);
          display: inline-block;
        }
        
        .content {
          padding: 40px 30px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }
        
        .stat-card {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 25px;
          border-radius: 12px;
          text-align: center;
          border-left: 5px solid #16a085;
          box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }
        
        .stat-number {
          font-size: 2.5em;
          font-weight: bold;
          color: #16a085;
          margin-bottom: 5px;
        }
        
        .stat-label {
          color: #666;
          font-size: 0.9em;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .schedule-section {
          margin-top: 40px;
        }
        
        .section-title {
          font-size: 1.8em;
          color: #2c3e50;
          margin-bottom: 25px;
          padding-bottom: 10px;
          border-bottom: 3px solid #16a085;
          display: inline-block;
        }
        
        table { 
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        
        th { 
          background: linear-gradient(135deg, #16a085 0%, #2ecc71 100%);
          color: white;
          padding: 18px 15px;
          text-align: left;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-size: 0.85em;
        }
        
        td { 
          padding: 15px;
          border-bottom: 1px solid #eee;
          transition: background-color 0.3s ease;
        }
        
        tr:hover td {
          background-color: #f8f9fa;
        }
        
        .day-header { 
          background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
          font-weight: bold;
          color: #2e7d32;
          border-left: 4px solid #4caf50;
        }
        
        .total-row { 
          background: linear-gradient(135deg, #f0f8f0 0%, #e8f5e8 100%);
          font-weight: bold;
          color: #2e7d32;
          border-top: 2px solid #4caf50;
        }
        
        .no-meetings { 
          color: #999;
          font-style: italic;
          text-align: center;
          background: #f8f9fa;
        }
        
        .activity-name {
          font-weight: 600;
          color: #2c3e50;
        }
        
        .duration {
          background: #e3f2fd;
          color: #1976d2;
          padding: 5px 10px;
          border-radius: 20px;
          font-weight: bold;
          text-align: center;
          display: inline-block;
          min-width: 50px;
        }
        
        .time-range {
          font-family: 'Courier New', monospace;
          background: #f3e5f5;
          color: #7b1fa2;
          padding: 5px 10px;
          border-radius: 6px;
          text-align: center;
        }
        
        .days-list {
          font-size: 0.85em;
          color: #666;
          text-align: center;
        }
        
        .footer {
          background: #f8f9fa;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #eee;
          margin-top: 40px;
        }
        
        .footer-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 30px;
          margin-bottom: 20px;
        }
        
        .footer-section h4 {
          color: #2c3e50;
          margin-bottom: 15px;
          font-size: 1.1em;
        }
        
        .footer-section p {
          color: #666;
          font-size: 0.9em;
          line-height: 1.6;
        }
        
        .generated-info {
          background: white;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #16a085;
          margin-top: 20px;
        }
        
        .watermark {
          position: fixed;
          bottom: 20px;
          right: 20px;
          opacity: 0.1;
          font-size: 0.8em;
          color: #666;
          transform: rotate(-45deg);
        }
        
        @media print {
          body {
            background: white;
            padding: 0;
          }
          .container {
            box-shadow: none;
            border-radius: 0;
          }
          .watermark {
            display: none;
          }
        }
        
        .day-separator {
          height: 20px;
          background: linear-gradient(90deg, transparent 0%, #16a085 50%, transparent 100%);
          margin: 20px 0;
          opacity: 0.3;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-content">
            <div class="company-logo">FM</div>
            <h1>FMDS Meeting Schedule</h1>
            <div class="subtitle">First Management Development System</div>
            <div class="meeting-info">
              <strong>📅 Daily Meeting Time: ${meetingTime}</strong><br>
              <span style="opacity: 0.8;">Comprehensive Weekly Schedule Overview</span>
            </div>
          </div>
        </div>
        
        <div class="content">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${totalActivities}</div>
              <div class="stat-label">Total Activities</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${activeDays}</div>
              <div class="stat-label">Active Days</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${grandTotalDuration}</div>
              <div class="stat-label">Total Minutes</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${Math.round((grandTotalDuration / 60) * 10) / 10}</div>
              <div class="stat-label">Total Hours</div>
            </div>
          </div>
          
          <div class="schedule-section">
            <h2 class="section-title">📋 Weekly Schedule Breakdown</h2>
            
            <table>
              <thead>
                <tr>
                  <th style="width: 15%;">📅 Day</th>
                  <th style="width: 35%;">🎯 Activity</th>
                  <th style="width: 15%;">⏱️ Duration</th>
                  <th style="width: 20%;">🕐 Time Range</th>
                  <th style="width: 15%;">📊 Frequency</th>
                </tr>
              </thead>
              <tbody>
                ${allDaysData
                  .map(
                    (dayData) => `
                  ${
                    dayData.segments.length > 0
                      ? `
                    ${dayData.segments
                      .map(
                        (segment, index) => `
                      <tr>
                        <td ${index === 0 ? 'class="day-header"' : ""}>${
                          index === 0 ? `<strong>${dayData.day}</strong>` : ""
                        }</td>
                        <td class="activity-name">${segment.title}</td>
                        <td><span class="duration">${segment.duration} min</span></td>
                        <td class="time-range">${segment.startTime || "N/A"} - ${segment.endTime || "N/A"}</td>
                        <td class="days-list">${segment.days.length} days/week</td>
                      </tr>
                    `,
                      )
                      .join("")}
                    <tr class="total-row">
                      <td></td>
                      <td><strong>📊 ${dayData.day} Total</strong></td>
                      <td><span class="duration">${dayData.totalDuration} min</span></td>
                      <td style="text-align: center;"><strong>${Math.round((dayData.totalDuration / 60) * 10) / 10}h</strong></td>
                      <td></td>
                    </tr>
                    <tr><td colspan="5" class="day-separator"></td></tr>
                  `
                      : `
                    <tr>
                      <td class="day-header"><strong>${dayData.day}</strong></td>
                      <td class="no-meetings" colspan="4">🚫 No meetings scheduled</td>
                    </tr>
                    <tr><td colspan="5" class="day-separator"></td></tr>
                  `
                  }
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-content">
            <div class="footer-section">
              <h4>📈 Schedule Summary</h4>
              <p>This comprehensive schedule covers all FMDS meeting activities across the work week, ensuring optimal time management and productivity tracking.</p>
            </div>
            <div class="footer-section">
              <h4>🎯 Meeting Objectives</h4>
              <p>Daily structured meetings designed to enhance team communication, track progress, and address operational challenges efficiently.</p>
            </div>
            <div class="footer-section">
              <h4>📊 Performance Metrics</h4>
              <p>Average meeting duration: ${Math.round(grandTotalDuration / totalActivities)} minutes per activity. Total weekly commitment: ${Math.round((grandTotalDuration / 60) * 10) / 10} hours.</p>
            </div>
          </div>
          
          <div class="generated-info">
            <strong>📄 Document Information</strong><br>
            Generated on: ${new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}<br>
            Report Type: FMDS Weekly Meeting Schedule | Version: 2.0 | Status: Active
          </div>
        </div>
      </div>
      
      <div class="watermark">FMDS Meeting Planner</div>
    </body>
    </html>
  `

    // Create and download PDF
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 500)
    }
  }

  const progress = timer.totalTime > 0 ? ((timer.totalTime - timer.currentTime) / timer.totalTime) * 100 : 0

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">FMDS Meeting Timer</CardTitle>
          <p className="text-center text-muted-foreground">Daily meetings: {meetingTime}</p>
        </CardHeader>
        <CardContent>
          {/* Beautiful Calendar-Style Day Selector */}
          <div className="mb-8">
            <Label className="text-lg font-semibold text-gray-700 mb-4 block">Select Meeting Day</Label>
            <div className="flex justify-center">
              <div className="inline-flex bg-white rounded-xl shadow-lg border border-gray-200 p-2 gap-1">
                {days.map((day, index) => {
                  const isSelected = selectedDay === day
                  const todaySegmentsCount = segments.filter((segment) => segment.days.includes(day)).length
                  const totalDuration = segments
                    .filter((segment) => segment.days.includes(day))
                    .reduce((sum, seg) => sum + seg.duration, 0)

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`
                        relative flex flex-col items-center justify-center px-4 py-3 rounded-lg transition-all duration-200 min-w-[100px]
                        ${
                          isSelected
                            ? "bg-green-500 text-white shadow-md transform scale-105"
                            : "bg-gray-50 text-gray-700 hover:bg-green-50 hover:text-green-700 hover:shadow-sm"
                        }
                      `}
                    >
                      {/* Day abbreviation */}
                      <div
                        className={`text-xs font-medium uppercase tracking-wide mb-1 ${isSelected ? "text-green-100" : "text-gray-500"}`}
                      >
                        {day.slice(0, 3)}
                      </div>

                      {/* Day number (simulated) */}
                      <div className={`text-lg font-bold mb-1 ${isSelected ? "text-white" : "text-gray-800"}`}>
                        {index + 1}
                      </div>

                      {/* Activity indicator */}
                      {todaySegmentsCount > 0 && (
                        <div className="flex flex-col items-center">
                          <div
                            className={`
                            w-2 h-2 rounded-full mb-1
                            ${isSelected ? "bg-white" : "bg-green-400"}
                          `}
                          ></div>
                          <div className={`text-xs ${isSelected ? "text-green-100" : "text-gray-500"}`}>
                            {todaySegmentsCount} activities
                          </div>
                          <div className={`text-xs ${isSelected ? "text-green-100" : "text-gray-500"}`}>
                            {totalDuration}min
                          </div>
                        </div>
                      )}

                      {/* No activities indicator */}
                      {todaySegmentsCount === 0 && (
                        <div className={`text-xs ${isSelected ? "text-green-100" : "text-gray-400"}`}>No meetings</div>
                      )}

                      {/* Selected day indicator */}
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
              <div className="inline-flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700 font-medium">
                  {selectedDay} Schedule - {todaySegments.length} activities (
                  {todaySegments.reduce((sum, seg) => sum + seg.duration, 0)} minutes total)
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <Button onClick={() => setIsAddDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Activity
              </Button>
              <Button onClick={exportToPDF} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Total Activities: {segments.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>Active Days: {days.filter((day) => segments.some((seg) => seg.days.includes(day))).length}</span>
              </div>
            </div>
          </div>

          {/* Current Timer Display */}
          {timer.totalTime > 0 && (
            <Card className="mb-6 bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold text-green-800">{todaySegments[timer.currentSegment]?.title}</h3>
                  <div className="text-4xl font-mono font-bold text-green-700">{formatTime(timer.currentTime)}</div>
                  <div className="w-full bg-green-100 rounded-full h-4">
                    <div
                      className="bg-green-500 h-4 rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-center gap-2">
                    {timer.isRunning ? (
                      <Button
                        onClick={pauseTimer}
                        variant="outline"
                        className="border-green-500 text-green-700 hover:bg-green-50 bg-transparent"
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        Pause
                      </Button>
                    ) : (
                      <Button
                        onClick={resumeTimer}
                        disabled={timer.currentTime === 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Resume
                      </Button>
                    )}
                    <Button onClick={stopTimer} variant="destructive">
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Schedule Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-green-100">
                  <th className="border border-gray-300 p-3 text-left">Activity</th>
                  <th className="border border-gray-300 p-3 text-center">Duration (min)</th>
                  <th className="border border-gray-300 p-3 text-center">Time Range</th>
                  <th className="border border-gray-300 p-3 text-center">Days</th>
                  <th className="border border-gray-300 p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {todaySegments.length > 0 ? (
                  todaySegments.map((segment, index) => (
                    <tr key={segment.id} className="hover:bg-green-50">
                      <td className="border border-gray-300 p-3 font-medium">{segment.title}</td>
                      <td className="border border-gray-300 p-3 text-center">{segment.duration}</td>
                      <td className="border border-gray-300 p-3 text-center">
                        {segment.startTime} - {segment.endTime}
                      </td>
                      <td className="border border-gray-300 p-3 text-center text-sm">{segment.days.join(", ")}</td>
                      <td className="border border-gray-300 p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            onClick={() => startTimer(index)}
                            size="sm"
                            disabled={timer.isRunning}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingSegment(segment)
                              setIsEditDialogOpen(true)
                            }}
                            size="sm"
                            variant="outline"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button onClick={() => deleteSegment(segment.id)} size="sm" variant="destructive">
                            <Trash2 className="w-4 h-4" />
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

          {/* Add New Segment Form */}
          {isAddDialogOpen && (
            <Card className="mt-6 border-2 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800">Add New Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="new-title">Activity Title:</Label>
                  <Input
                    id="new-title"
                    value={newSegment.title || ""}
                    onChange={(e) => setNewSegment((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter activity name"
                  />
                </div>
                <div>
                  <Label htmlFor="new-duration">Duration (minutes):</Label>
                  <Input
                    id="new-duration"
                    type="number"
                    value={newSegment.duration || 10}
                    onChange={(e) =>
                      setNewSegment((prev) => ({ ...prev, duration: Number.parseInt(e.target.value) || 10 }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="new-start-time">Start Time:</Label>
                  <Input
                    id="new-start-time"
                    type="time"
                    value={newSegment.startTime || "7:00"}
                    onChange={(e) => setNewSegment((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="new-end-time">End Time:</Label>
                  <Input
                    id="new-end-time"
                    type="time"
                    value={newSegment.endTime || "7:10"}
                    onChange={(e) => setNewSegment((prev) => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Select Days:</Label>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {days.map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`new-${day}`}
                          checked={(newSegment.days || []).includes(day)}
                          onCheckedChange={(checked) => handleDayChange(day, checked as boolean, true)}
                        />
                        <Label htmlFor={`new-${day}`} className="text-sm">
                          {day}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addSegment} className="bg-green-600 hover:bg-green-700">
                    Add Activity
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
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit Form */}
          {isEditDialogOpen && editingSegment && (
            <Card className="mt-6 border-2 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800">Edit Activity: {editingSegment.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Activity Title:</Label>
                  <Input
                    id="edit-title"
                    value={editingSegment.title}
                    onChange={(e) => setEditingSegment((prev) => (prev ? { ...prev, title: e.target.value } : null))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-duration">Duration (minutes):</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    value={editingSegment.duration}
                    onChange={(e) =>
                      setEditingSegment((prev) =>
                        prev ? { ...prev, duration: Number.parseInt(e.target.value) || 0 } : null,
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-start-time">Start Time:</Label>
                  <Input
                    id="edit-start-time"
                    type="time"
                    value={editingSegment.startTime}
                    onChange={(e) =>
                      setEditingSegment((prev) => (prev ? { ...prev, startTime: e.target.value } : null))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-end-time">End Time:</Label>
                  <Input
                    id="edit-end-time"
                    type="time"
                    value={editingSegment.endTime}
                    onChange={(e) => setEditingSegment((prev) => (prev ? { ...prev, endTime: e.target.value } : null))}
                  />
                </div>
                <div>
                  <Label>Select Days:</Label>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {days.map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${day}`}
                          checked={editingSegment.days.includes(day)}
                          onCheckedChange={(checked) => handleDayChange(day, checked as boolean)}
                        />
                        <Label htmlFor={`edit-${day}`} className="text-sm">
                          {day}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (editingSegment) {
                        updateSegment(editingSegment.id, editingSegment)
                        setIsEditDialogOpen(false)
                        setEditingSegment(null)
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false)
                      setEditingSegment(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
