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
    // Create a comprehensive single table for all segments
    const allSegments = segments.map((segment) => ({
      ...segment,
      daysString: segment.days.join(", "),
      frequency: segment.days.length,
    }))

    const totalActivities = segments.length
    const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0)
    const averageDuration = totalActivities > 0 ? Math.round(totalDuration / totalActivities) : 0

    // Create HTML content for PDF with single professional table
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
          max-width: 1400px;
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
          width: 80px;
          height: 80px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: bold;
          border: 3px solid rgba(255,255,255,0.3);
        }
        
        h1 { 
          font-size: 3em;
          margin-bottom: 15px;
          font-weight: 300;
          letter-spacing: 3px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        
        .subtitle {
          font-size: 1.4em;
          opacity: 0.9;
          margin-bottom: 25px;
          font-weight: 300;
        }
        
        .meeting-info { 
          background: rgba(255,255,255,0.15);
          padding: 25px;
          border-radius: 15px;
          backdrop-filter: blur(10px);
          display: inline-block;
          border: 1px solid rgba(255,255,255,0.2);
        }
        
        .content {
          padding: 50px 30px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 25px;
          margin-bottom: 50px;
        }
        
        .stat-card {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 30px;
          border-radius: 15px;
          text-align: center;
          border-left: 6px solid #16a085;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-5px);
        }
        
        .stat-number {
          font-size: 3em;
          font-weight: bold;
          color: #16a085;
          margin-bottom: 10px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        
        .stat-label {
          color: #666;
          font-size: 1em;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 600;
        }
        
        .section-title {
          font-size: 2.2em;
          color: #2c3e50;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 4px solid #16a085;
          display: inline-block;
          font-weight: 300;
        }
        
        .main-table { 
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 15px 35px rgba(0,0,0,0.1);
        }
        
        .main-table th { 
          background: linear-gradient(135deg, #16a085 0%, #2ecc71 100%);
          color: white;
          padding: 20px 15px;
          text-align: left;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-size: 0.9em;
          position: relative;
        }
        
        .main-table th::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(255,255,255,0.3);
        }
        
        .main-table td { 
          padding: 18px 15px;
          border-bottom: 1px solid #eee;
          transition: all 0.3s ease;
          vertical-align: middle;
        }
        
        .main-table tr:hover td {
          background-color: #f8f9fa;
          transform: scale(1.01);
        }
        
        .main-table tr:last-child td {
          border-bottom: none;
        }
        
        .activity-name {
          font-weight: 700;
          color: #2c3e50;
          font-size: 1.1em;
        }
        
        .duration-badge {
          background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 25px;
          font-weight: bold;
          text-align: center;
          display: inline-block;
          min-width: 70px;
          box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
        }
        
        .time-range {
          font-family: 'Courier New', monospace;
          background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          text-align: center;
          font-weight: bold;
          box-shadow: 0 4px 15px rgba(155, 89, 182, 0.3);
        }
        
        .days-badge {
          background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.85em;
          font-weight: 600;
          text-align: center;
          box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
        }
        
        .frequency-badge {
          background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
          color: white;
          padding: 6px 12px;
          border-radius: 15px;
          font-weight: bold;
          text-align: center;
          box-shadow: 0 4px 15px rgba(243, 156, 18, 0.3);
        }
        
        .summary-section {
          background: linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 100%);
          padding: 40px;
          border-radius: 15px;
          margin-top: 40px;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
        }
        
        .summary-card {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        
        .summary-card h4 {
          color: #2c3e50;
          margin-bottom: 15px;
          font-size: 1.2em;
          border-bottom: 2px solid #16a085;
          padding-bottom: 8px;
        }
        
        .footer {
          background: #2c3e50;
          color: white;
          padding: 30px;
          text-align: center;
          margin-top: 0;
        }
        
        .generated-info {
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.2);
          backdrop-filter: blur(10px);
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
          .main-table tr:hover td {
            transform: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-content">
            <div class="company-logo">FMDS</div>
            <h1>Meeting Schedule</h1>
            <div class="subtitle">First Management Development System</div>
            <div class="meeting-info">
              <strong>📅 Daily Meeting Time: ${meetingTime}</strong><br>
              <span style="opacity: 0.9;">Complete Activity Schedule Overview</span>
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
              <div class="stat-number">${totalDuration}</div>
              <div class="stat-label">Total Minutes</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${Math.round((totalDuration / 60) * 10) / 10}</div>
              <div class="stat-label">Total Hours</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${averageDuration}</div>
              <div class="stat-label">Avg Duration</div>
            </div>
          </div>
          
          <h2 class="section-title">📋 Complete Activity Schedule</h2>
          
          <table class="main-table">
            <thead>
              <tr>
                <th style="width: 25%;">🎯 Activity Name</th>
                <th style="width: 12%;">⏱️ Duration</th>
                <th style="width: 18%;">🕐 Time Range</th>
                <th style="width: 30%;">📅 Scheduled Days</th>
                <th style="width: 15%;">📊 Frequency</th>
              </tr>
            </thead>
            <tbody>
              ${allSegments
                .map(
                  (segment) => `
                <tr>
                  <td class="activity-name">${segment.title}</td>
                  <td><span class="duration-badge">${segment.duration} min</span></td>
                  <td><span class="time-range">${segment.startTime || "N/A"} - ${segment.endTime || "N/A"}</span></td>
                  <td><span class="days-badge">${segment.daysString}</span></td>
                  <td><span class="frequency-badge">${segment.frequency} days/week</span></td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="summary-section">
            <h3 style="text-align: center; margin-bottom: 30px; color: #2c3e50; font-size: 1.8em;">📊 Schedule Analysis</h3>
            <div class="summary-grid">
              <div class="summary-card">
                <h4>📈 Activity Distribution</h4>
                <p><strong>Most Frequent:</strong> ${
                  days
                    .map((day) => ({
                      day,
                      count: segments.filter((s) => s.days.includes(day)).length,
                    }))
                    .sort((a, b) => b.count - a.count)[0]?.day || "N/A"
                }</p>
                <p><strong>Total Weekly Minutes:</strong> ${segments.reduce((sum, seg) => sum + seg.duration * seg.days.length, 0)} minutes</p>
                <p><strong>Average per Day:</strong> ${Math.round(segments.reduce((sum, seg) => sum + seg.duration * seg.days.length, 0) / 5)} minutes</p>
              </div>
              <div class="summary-card">
                <h4>⏰ Time Management</h4>
                <p><strong>Shortest Activity:</strong> ${Math.min(...segments.map((s) => s.duration))} minutes</p>
                <p><strong>Longest Activity:</strong> ${Math.max(...segments.map((s) => s.duration))} minutes</p>
                <p><strong>Total Daily Range:</strong> ${meetingTime}</p>
              </div>
              <div class="summary-card">
                <h4>📅 Weekly Coverage</h4>
                <p><strong>Active Days:</strong> ${days.filter((day) => segments.some((seg) => seg.days.includes(day))).length}/5 weekdays</p>
                <p><strong>Coverage:</strong> ${Math.round((days.filter((day) => segments.some((seg) => seg.days.includes(day))).length / 5) * 100)}%</p>
                <p><strong>Most Busy Day:</strong> ${
                  days
                    .map((day) => ({
                      day,
                      duration: segments.filter((s) => s.days.includes(day)).reduce((sum, s) => sum + s.duration, 0),
                    }))
                    .sort((a, b) => b.duration - a.duration)[0]?.day || "N/A"
                }</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <div class="generated-info">
            <strong>📄 Document Information</strong><br>
            Generated: ${new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}<br>
            Report: FMDS Complete Meeting Schedule | Version: 3.0 | Status: Active
          </div>
        </div>
      </div>
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

  const exportToExcel = () => {
    // Prepare data for Excel export
    const excelData = segments.map((segment, index) => ({
      "Activity ID": `ACT-${String(index + 1).padStart(3, "0")}`,
      "Activity Name": segment.title,
      "Duration (Minutes)": segment.duration,
      "Start Time": segment.startTime || "N/A",
      "End Time": segment.endTime || "N/A",
      "Scheduled Days": segment.days.join(", "),
      "Days per Week": segment.days.length,
      "Weekly Minutes": segment.duration * segment.days.length,
      Category: segment.duration <= 10 ? "Short" : segment.duration <= 20 ? "Medium" : "Long",
      Status: "Active",
    }))

    // Add summary rows
    const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0)
    const totalWeeklyMinutes = segments.reduce((sum, seg) => sum + seg.duration * seg.days.length, 0)

    excelData.push({
      "Activity ID": "",
      "Activity Name": "",
      "Duration (Minutes)": "",
      "Start Time": "",
      "End Time": "",
      "Scheduled Days": "",
      "Days per Week": "",
      "Weekly Minutes": "",
      Category: "",
      Status: "",
    })

    excelData.push({
      "Activity ID": "SUMMARY",
      "Activity Name": "Total Activities",
      "Duration (Minutes)": totalDuration,
      "Start Time": meetingTime.split(" - ")[0],
      "End Time": meetingTime.split(" - ")[1],
      "Scheduled Days": `${days.filter((day) => segments.some((seg) => seg.days.includes(day))).length}/5 Days`,
      "Days per Week": Math.round(segments.reduce((sum, seg) => sum + seg.days.length, 0) / segments.length),
      "Weekly Minutes": totalWeeklyMinutes,
      Category: "TOTAL",
      Status: "Active",
    })

    // Convert to CSV format
    const headers = Object.keys(excelData[0])
    const csvContent = [
      // Add title rows
      ["FMDS Meeting Schedule Export"],
      [`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`],
      ["First Management Development System"],
      [`Meeting Time: ${meetingTime}`],
      [""],
      headers,
      ...excelData.map((row) =>
        headers.map((header) => {
          const value = row[header as keyof typeof row]
          // Escape commas and quotes for CSV
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }),
      ),
    ]
      .map((row) => row.join(","))
      .join("\n")

    // Create and download Excel file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `FMDS_Meeting_Schedule_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
              <Button
                onClick={exportToPDF}
                variant="outline"
                className="border-green-500 text-green-700 hover:bg-green-50 bg-transparent"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button
                onClick={exportToExcel}
                variant="outline"
                className="border-blue-500 text-blue-700 hover:bg-blue-50 bg-transparent"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
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
