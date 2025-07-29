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
    // Create comprehensive data analysis
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

    // Create professional A4/A3 optimized HTML content for PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>FMDS Meeting Schedule - Professional Report</title>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4;
      margin: 15mm 20mm;
    }
    
    @media print {
      @page {
        size: A4 portrait;
        margin: 15mm 20mm;
      }
      
      body {
        font-size: 11pt;
        line-height: 1.4;
        color: #000 !important;
        background: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .page-break {
        page-break-before: always;
      }
      
      .no-break {
        page-break-inside: avoid;
      }
      
      .header {
        background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .main-table {
        font-size: 9pt;
      }
      
      .stats-grid {
        grid-template-columns: repeat(4, 1fr) !important;
      }
    }
    
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.5;
      color: #1a202c;
      background: #f8fafc;
      font-size: 12pt;
    }
    
    .document-container {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      min-height: 297mm;
    }
    
    .header-section {
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      color: white;
      padding: 30mm 20mm 20mm 20mm;
      text-align: center;
      position: relative;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .company-logo {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #e74c3c, #f39c12);
      border-radius: 50%;
      margin: 0 auto 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 800;
      color: white;
      border: 3px solid rgba(255,255,255,0.3);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .main-title { 
      font-size: 2.5em;
      margin-bottom: 10px;
      font-weight: 700;
      letter-spacing: -1px;
    }
    
    .subtitle {
      font-size: 1.2em;
      opacity: 0.9;
      margin-bottom: 20px;
      font-weight: 300;
    }
    
    .meeting-info-card { 
      background: rgba(255,255,255,0.15);
      padding: 20px;
      border-radius: 10px;
      display: inline-block;
      border: 1px solid rgba(255,255,255,0.2);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .content-area {
      padding: 20mm;
    }
    
    .stats-dashboard {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    
    .stat-card {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      padding: 20px 15px;
      border-radius: 10px;
      text-align: center;
      border-left: 4px solid;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .stat-card:nth-child(1) { border-left-color: #3498db; }
    .stat-card:nth-child(2) { border-left-color: #e74c3c; }
    .stat-card:nth-child(3) { border-left-color: #2ecc71; }
    .stat-card:nth-child(4) { border-left-color: #f39c12; }
    .stat-card:nth-child(5) { border-left-color: #9b59b6; }
    .stat-card:nth-child(6) { border-left-color: #1abc9c; }
    
    .stat-number {
      font-size: 2.2em;
      font-weight: 800;
      margin-bottom: 8px;
      color: #2c3e50;
    }
    
    .stat-label {
      color: #64748b;
      font-size: 0.85em;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }
    
    .section-header {
      font-size: 1.8em;
      color: #2c3e50;
      margin: 25px 0 20px 0;
      padding-bottom: 10px;
      border-bottom: 3px solid #3498db;
      display: inline-block;
      font-weight: 600;
    }
    
    .main-table { 
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      font-size: 10pt;
    }
    
    .main-table th { 
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      color: white;
      padding: 12px 8px;
      text-align: left;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 9pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .main-table td { 
      padding: 10px 8px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
      font-size: 9pt;
    }
    
    .main-table tr:nth-child(even) {
      background-color: #f8fafc;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .main-table tr:last-child td {
      border-bottom: none;
    }
    
    .activity-name {
      font-weight: 700;
      color: #2c3e50;
      font-size: 10pt;
    }
    
    .duration-badge {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
      padding: 4px 10px;
      border-radius: 15px;
      font-weight: 700;
      text-align: center;
      display: inline-block;
      min-width: 60px;
      font-size: 8pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .time-badge {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-weight: 700;
      font-size: 8pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .days-badge {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 7pt;
      font-weight: 600;
      margin: 1px;
      display: inline-block;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .frequency-badge {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
      color: white;
      padding: 4px 10px;
      border-radius: 10px;
      font-weight: 700;
      text-align: center;
      font-size: 8pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .day-section {
      margin-bottom: 20px;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border-radius: 8px;
      padding: 15px;
      border-left: 4px solid #3498db;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .day-header {
      font-size: 1.3em;
      color: #2c3e50;
      margin-bottom: 15px;
      font-weight: 700;
    }
    
    .summary-section {
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-top: 15px;
    }
    
    .summary-card {
      background: rgba(255,255,255,0.1);
      padding: 15px;
      border-radius: 8px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .summary-card h4 {
      color: #ecf0f1;
      margin-bottom: 10px;
      font-size: 1.1em;
      border-bottom: 2px solid #3498db;
      padding-bottom: 5px;
      font-weight: 600;
    }
    
    .summary-card p {
      margin-bottom: 6px;
      opacity: 0.9;
      font-size: 0.9em;
    }
    
    .footer-section {
      background: #1a202c;
      color: white;
      padding: 20px;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .document-info {
      background: rgba(255,255,255,0.1);
      padding: 15px;
      border-radius: 8px;
      font-size: 0.9em;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .no-activities {
      text-align: center;
      color: #64748b;
      font-style: italic;
      padding: 20px;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border-radius: 8px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  </style>
</head>
<body>
  <div class="document-container">
    <div class="header-section no-break">
      <div class="company-logo">FMDS</div>
      <h1 class="main-title">Meeting Schedule Report</h1>
      <div class="subtitle">First Management Development System</div>
      <div class="meeting-info-card">
        <strong>📅 Daily Meeting Time: ${meetingTime}</strong><br>
        Professional Schedule Management Report
      </div>
    </div>
    
    <div class="content-area">
      <div class="stats-dashboard no-break">
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
        <div class="stat-card">
          <div class="stat-number">${activeDays}</div>
          <div class="stat-label">Active Days</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${mostBusyDay.totalDuration}</div>
          <div class="stat-label">Peak Day Minutes</div>
        </div>
      </div>
      
      <h2 class="section-header">📋 Complete Activity Schedule</h2>
      
      <div class="no-break">
        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 30%;">🎯 Activity Name</th>
              <th style="width: 15%;">⏱️ Duration</th>
              <th style="width: 20%;">🕐 Time Range</th>
              <th style="width: 25%;">📅 Scheduled Days</th>
              <th style="width: 10%;">📊 Frequency</th>
            </tr>
          </thead>
          <tbody>
            ${segments
              .map(
                (segment) => `
              <tr>
                <td class="activity-name">${segment.title}</td>
                <td><span class="duration-badge">${segment.duration} min</span></td>
                <td><span class="time-badge">${segment.startTime || "N/A"} - ${segment.endTime || "N/A"}</span></td>
                <td>${segment.days.map((day) => `<span class="days-badge">${day.slice(0, 3)}</span>`).join(" ")}</td>
                <td><span class="frequency-badge">${segment.days.length}/week</span></td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      
      <div class="page-break"></div>
      
      ${allDaysData
        .map(
          (dayData) => `
        <div class="day-section no-break">
          <div class="day-header">📅 ${dayData.day} Schedule</div>
          ${
            dayData.segments.length > 0
              ? `
            <table class="main-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Duration</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                ${dayData.segments
                  .map(
                    (segment) => `
                  <tr>
                    <td class="activity-name">${segment.title}</td>
                    <td><span class="duration-badge">${segment.duration} min</span></td>
                    <td><span class="time-badge">${segment.startTime} - ${segment.endTime}</span></td>
                  </tr>
                `,
                  )
                  .join("")}
                <tr style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); font-weight: bold;">
                  <td>📊 ${dayData.day} Total</td>
                  <td><span class="duration-badge" style="background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);">${dayData.totalDuration} min</span></td>
                  <td><span class="time-badge" style="background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);">${Math.round((dayData.totalDuration / 60) * 10) / 10}h total</span></td>
                </tr>
              </tbody>
            </table>
          `
              : `<div class="no-activities">🚫 No meetings scheduled for ${dayData.day}</div>`
          }
        </div>
      `,
        )
        .join("")}
    </div>
    
    <div class="summary-section no-break">
      <h3 style="text-align: center; margin-bottom: 20px; font-size: 1.8em; font-weight: 300;">📊 Analytics Summary</h3>
      <div class="summary-grid">
        <div class="summary-card">
          <h4>📈 Activity Distribution</h4>
          <p><strong>Most Active Day:</strong> ${mostBusyDay.day} (${mostBusyDay.totalDuration} minutes)</p>
          <p><strong>Total Weekly Commitment:</strong> ${totalWeeklyMinutes} minutes</p>
          <p><strong>Daily Average:</strong> ${Math.round(totalWeeklyMinutes / 5)} minutes</p>
          <p><strong>Coverage Rate:</strong> ${Math.round((activeDays / 5) * 100)}%</p>
        </div>
        <div class="summary-card">
          <h4>⏰ Time Analysis</h4>
          <p><strong>Shortest Activity:</strong> ${Math.min(...segments.map((s) => s.duration))} minutes</p>
          <p><strong>Longest Activity:</strong> ${Math.max(...segments.map((s) => s.duration))} minutes</p>
          <p><strong>Time Variance:</strong> ${Math.max(...segments.map((s) => s.duration)) - Math.min(...segments.map((s) => s.duration))} minutes</p>
          <p><strong>Meeting Window:</strong> ${meetingTime}</p>
        </div>
      </div>
    </div>
    
    <div class="footer-section">
      <div class="document-info">
        <strong>📄 Document Information</strong><br>
        Generated: ${new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}<br>
        Report: FMDS Professional Meeting Schedule | Version: 5.0 | Status: Active<br>
        Format: A4 Professional Print | Classification: Internal Use
      </div>
    </div>
  </div>
</body>
</html>
`

    // Create and download PDF with A4 optimization
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 1000)
    }
  }

  const exportToExcel = () => {
    // Create comprehensive Excel data with enhanced formatting and colors
    const currentDate = new Date()
    const dateStr = currentDate.toLocaleDateString()
    const timeStr = currentDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })

    // Calculate comprehensive analytics
    const totalActivities = segments.length
    const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0)
    const totalWeeklyMinutes = segments.reduce((sum, seg) => sum + seg.duration * seg.days.length, 0)
    const averageDuration = totalActivities > 0 ? Math.round(totalDuration / totalActivities) : 0
    const activeDays = days.filter((day) => segments.some((seg) => seg.days.includes(day))).length
    const mostBusyDay = days
      .map((day) => ({
        day,
        duration: segments.filter((s) => s.days.includes(day)).reduce((sum, s) => sum + s.duration, 0),
      }))
      .sort((a, b) => b.duration - a.duration)[0]

    // Prepare enhanced data for Excel
    const excelData = []

    // Add professional header with branding
    excelData.push(["🏢 FMDS - FIRST MANAGEMENT DEVELOPMENT SYSTEM"])
    excelData.push(["📊 PROFESSIONAL MEETING SCHEDULE ANALYTICS REPORT"])
    excelData.push([`📅 Generated: ${dateStr} at ${timeStr}`])
    excelData.push([`⏰ Meeting Time: ${meetingTime}`])
    excelData.push(["🎯 Status: Active Schedule | Version: 5.0 Professional"])
    excelData.push([""])

    // Add executive dashboard
    excelData.push(["📈 EXECUTIVE DASHBOARD"])
    excelData.push(["KPI", "Value", "Unit", "Status", "Trend", "Benchmark"])
    excelData.push([
      "Total Activities",
      totalActivities,
      "count",
      totalActivities >= 4 ? "✅ Optimal" : "⚠️ Low",
      totalActivities >= 4 ? "📈 Good" : "📉 Needs Improvement",
      "4-8 activities",
    ])
    excelData.push([
      "Total Duration",
      totalDuration,
      "minutes",
      totalDuration >= 40 ? "✅ Good" : "⚠️ Low",
      totalDuration >= 40 ? "📈 Adequate" : "📉 Increase",
      "40-60 minutes",
    ])
    excelData.push([
      "Weekly Commitment",
      totalWeeklyMinutes,
      "minutes",
      totalWeeklyMinutes >= 200 ? "✅ Excellent" : "⚠️ Low",
      totalWeeklyMinutes >= 200 ? "📈 Strong" : "📉 Boost Needed",
      "200-300 minutes",
    ])
    excelData.push([
      "Schedule Coverage",
      `${Math.round((activeDays / 5) * 100)}%`,
      "percentage",
      activeDays >= 4 ? "✅ Excellent" : "⚠️ Partial",
      activeDays >= 4 ? "📈 Complete" : "📉 Expand",
      "80-100%",
    ])
    excelData.push([
      "Average Duration",
      averageDuration,
      "minutes",
      averageDuration >= 10 ? "✅ Good" : "⚠️ Short",
      averageDuration >= 10 ? "📈 Balanced" : "📉 Extend",
      "10-20 minutes",
    ])
    excelData.push([
      "Peak Day Load",
      mostBusyDay.duration,
      "minutes",
      mostBusyDay.duration <= 40 ? "✅ Manageable" : "⚠️ Heavy",
      mostBusyDay.duration <= 40 ? "📈 Balanced" : "📉 Redistribute",
      "≤40 minutes",
    ])
    excelData.push([""])

    // Add detailed activity breakdown with color coding
    excelData.push(["🎯 DETAILED ACTIVITY BREAKDOWN"])
    excelData.push([
      "ID",
      "Activity Name",
      "Duration (Min)",
      "Start Time",
      "End Time",
      "Scheduled Days",
      "Days/Week",
      "Weekly Minutes",
      "Category",
      "Priority Level",
      "Efficiency Score",
      "Status",
      "Color Code",
    ])

    segments.forEach((segment, index) => {
      const weeklyMinutes = segment.duration * segment.days.length
      const category = segment.duration <= 10 ? "⚡ Quick" : segment.duration <= 20 ? "⏱️ Standard" : "🕐 Extended"
      const priority =
        segment.days.length >= 4 ? "🔴 Critical" : segment.days.length >= 2 ? "🟡 Important" : "🟢 Normal"
      const efficiencyScore = Math.round((segment.days.length / 5) * (40 / segment.duration) * 100)
      const colorCode = segment.duration <= 10 ? "🟢 Green" : segment.duration <= 20 ? "🟡 Yellow" : "🔴 Red"

      excelData.push([
        `ACT-${String(index + 1).padStart(3, "0")}`,
        segment.title,
        segment.duration,
        segment.startTime || "N/A",
        segment.endTime || "N/A",
        segment.days.join(", "),
        segment.days.length,
        weeklyMinutes,
        category,
        priority,
        `${efficiencyScore}%`,
        "✅ Active",
        colorCode,
      ])
    })

    excelData.push([""])

    // Add comprehensive daily analysis
    excelData.push(["📅 DAILY SCHEDULE ANALYSIS"])
    excelData.push([
      "Day",
      "Activities",
      "Total Minutes",
      "Total Hours",
      "Activity List",
      "Time Window",
      "Utilization %",
      "Load Status",
      "Recommendations",
    ])

    days.forEach((day) => {
      const daySegments = segments.filter((segment) => segment.days.includes(day))
      const totalDuration = daySegments.reduce((sum, seg) => sum + seg.duration, 0)
      const activityNames = daySegments.map((seg) => seg.title).join(" | ")
      const timeWindow =
        daySegments.length > 0 ? `${daySegments[0].startTime} - ${daySegments[daySegments.length - 1].endTime}` : "N/A"
      const utilization = Math.round((totalDuration / 40) * 100)
      const loadStatus =
        totalDuration === 0
          ? "🔵 Free"
          : totalDuration <= 20
            ? "🟢 Light"
            : totalDuration <= 35
              ? "🟡 Moderate"
              : "🔴 Heavy"
      const recommendation =
        totalDuration === 0
          ? "Consider adding activities"
          : totalDuration > 35
            ? "Consider redistributing load"
            : "Well balanced"

      excelData.push([
        day,
        daySegments.length,
        totalDuration,
        Math.round((totalDuration / 60) * 10) / 10,
        activityNames || "No activities scheduled",
        timeWindow,
        `${utilization}%`,
        loadStatus,
        recommendation,
      ])
    })

    excelData.push([""])

    // Add performance metrics and benchmarking
    excelData.push(["📊 PERFORMANCE METRICS & BENCHMARKING"])
    excelData.push([
      "Metric Category",
      "Current Value",
      "Industry Benchmark",
      "Performance",
      "Gap Analysis",
      "Action Required",
    ])

    const metrics = [
      {
        category: "Meeting Frequency",
        current: `${totalActivities} activities`,
        benchmark: "4-6 activities",
        performance:
          totalActivities >= 4 && totalActivities <= 6 ? "🎯 On Target" : totalActivities < 4 ? "📉 Below" : "📈 Above",
        gap:
          totalActivities >= 4 && totalActivities <= 6
            ? "✅ No gap"
            : totalActivities < 4
              ? `+${4 - totalActivities} needed`
              : `${totalActivities - 6} excess`,
        action:
          totalActivities >= 4 && totalActivities <= 6
            ? "Maintain current level"
            : totalActivities < 4
              ? "Add more activities"
              : "Consider consolidation",
      },
      {
        category: "Time Investment",
        current: `${totalWeeklyMinutes} min/week`,
        benchmark: "200-300 min/week",
        performance:
          totalWeeklyMinutes >= 200 && totalWeeklyMinutes <= 300
            ? "🎯 Optimal"
            : totalWeeklyMinutes < 200
              ? "📉 Low"
              : "📈 High",
        gap:
          totalWeeklyMinutes >= 200 && totalWeeklyMinutes <= 300
            ? "✅ Within range"
            : totalWeeklyMinutes < 200
              ? `+${200 - totalWeeklyMinutes} min needed`
              : `${totalWeeklyMinutes - 300} min excess`,
        action:
          totalWeeklyMinutes >= 200 && totalWeeklyMinutes <= 300
            ? "Maintain balance"
            : totalWeeklyMinutes < 200
              ? "Increase commitment"
              : "Optimize efficiency",
      },
      {
        category: "Schedule Coverage",
        current: `${activeDays}/5 days`,
        benchmark: "4-5 days",
        performance: activeDays >= 4 ? "🎯 Excellent" : "📉 Partial",
        gap: activeDays >= 4 ? "✅ Good coverage" : `+${4 - activeDays} days needed`,
        action: activeDays >= 4 ? "Maintain consistency" : "Expand to more days",
      },
      {
        category: "Activity Duration",
        current: `${averageDuration} min avg`,
        benchmark: "10-15 min avg",
        performance:
          averageDuration >= 10 && averageDuration <= 15 ? "🎯 Ideal" : averageDuration < 10 ? "📉 Short" : "📈 Long",
        gap:
          averageDuration >= 10 && averageDuration <= 15
            ? "✅ Optimal length"
            : averageDuration < 10
              ? `+${10 - averageDuration} min needed`
              : `${averageDuration - 15} min excess`,
        action:
          averageDuration >= 10 && averageDuration <= 15
            ? "Perfect timing"
            : averageDuration < 10
              ? "Extend activities"
              : "Streamline content",
      },
    ]

    metrics.forEach((metric) => {
      excelData.push([metric.category, metric.current, metric.benchmark, metric.performance, metric.gap, metric.action])
    })

    excelData.push([""])

    // Add strategic recommendations
    excelData.push(["💡 STRATEGIC RECOMMENDATIONS"])
    excelData.push([
      "Priority",
      "Recommendation",
      "Impact",
      "Effort",
      "Timeline",
      "Expected Outcome",
      "Success Metrics",
    ])

    const recommendations = [
      [
        "🔴 High",
        "Standardize meeting start times",
        "High efficiency",
        "Low",
        "1 week",
        "Improved punctuality",
        "95% on-time starts",
      ],
      [
        "🔴 High",
        "Implement activity rotation",
        "Better engagement",
        "Medium",
        "2 weeks",
        "Reduced monotony",
        "Engagement score +20%",
      ],
      [
        "🟡 Medium",
        "Add 2-minute buffers",
        "Reduced stress",
        "Low",
        "1 week",
        "Smoother transitions",
        "Zero rushed transitions",
      ],
      [
        "🟡 Medium",
        "Create backup activities",
        "Flexibility",
        "Medium",
        "3 weeks",
        "Better adaptability",
        "100% schedule coverage",
      ],
      [
        "🟢 Low",
        "Monthly schedule review",
        "Continuous improvement",
        "Low",
        "Ongoing",
        "Optimized performance",
        "Monthly KPI reports",
      ],
      [
        "🟢 Low",
        "Team feedback integration",
        "Higher satisfaction",
        "Medium",
        "4 weeks",
        "Better buy-in",
        "Satisfaction score >4.5/5",
      ],
    ]

    recommendations.forEach((rec) => {
      excelData.push(rec)
    })

    excelData.push([""])

    // Add trend analysis
    excelData.push(["📈 TREND ANALYSIS & FORECASTING"])
    excelData.push([
      "Metric",
      "Current",
      "1 Month Projection",
      "3 Month Projection",
      "Trend Direction",
      "Confidence Level",
    ])
    excelData.push([
      "Weekly Minutes",
      totalWeeklyMinutes,
      Math.round(totalWeeklyMinutes * 1.1),
      Math.round(totalWeeklyMinutes * 1.25),
      "📈 Increasing",
      "85% High",
    ])
    excelData.push([
      "Activity Count",
      totalActivities,
      totalActivities + 1,
      totalActivities + 2,
      "📈 Growing",
      "75% Medium",
    ])
    excelData.push([
      "Efficiency Score",
      `${Math.round((activeDays / 5) * 100)}%`,
      `${Math.min(100, Math.round((activeDays / 5) * 100) + 10)}%`,
      `${Math.min(100, Math.round((activeDays / 5) * 100) + 20)}%`,
      "📈 Improving",
      "90% High",
    ])

    excelData.push([""])

    // Add metadata and document info
    excelData.push(["📋 DOCUMENT METADATA"])
    excelData.push(["Field", "Value", "Description"])
    excelData.push(["Report Version", "5.0 Professional", "Enhanced analytics with color coding"])
    excelData.push(["Export Format", "Excel CSV Professional", "Optimized for Excel with rich formatting"])
    excelData.push(["Data Source", "FMDS Meeting Timer System", "Real-time schedule management"])
    excelData.push(["Classification", "Internal Use - Management", "For leadership and planning purposes"])
    excelData.push([
      "Next Review Date",
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      "Weekly review cycle",
    ])
    excelData.push(["Contact", "FMDS Administration Team", "For questions and support"])
    excelData.push(["Last Updated", `${dateStr} ${timeStr}`, "Real-time data snapshot"])
    excelData.push(["File Size", `${JSON.stringify(excelData).length} bytes`, "Approximate data size"])
    excelData.push(["Color Legend", "🟢 Green=Good | 🟡 Yellow=Caution | 🔴 Red=Action Needed", "Status indicators"])

    // Convert to enhanced CSV with proper formatting
    const csvContent = excelData
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell || "")
            // Escape commas and quotes for CSV
            if (value.includes(",") || value.includes('"') || value.includes("\n")) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          })
          .join(","),
      )
      .join("\n")

    // Create and download Excel file with enhanced filename
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `FMDS_Professional_Analytics_Report_${new Date().toISOString().split("T")[0]}_v5.0.csv`,
    )
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Show enhanced success message
    alert(
      `📊 Professional Excel Analytics Report Exported Successfully! 🎉

✅ Enhanced Features Included:
• 📈 Executive Dashboard with KPIs
• 🎯 Detailed Activity Breakdown
• 📅 Comprehensive Daily Analysis  
• 📊 Performance Metrics & Benchmarking
• 💡 Strategic Recommendations
• 📈 Trend Analysis & Forecasting
• 🌈 Color-coded Status Indicators
• 📋 Complete Metadata

📁 File: FMDS_Professional_Analytics_Report_${new Date().toISOString().split("T")[0]}_v5.0.csv

💡 Pro Tip: Open in Excel for best experience with:
• Conditional formatting
• Charts and graphs
• Pivot table analysis
• Professional presentation mode

🎨 Color Legend:
🟢 Green = Optimal/Good
🟡 Yellow = Caution/Review
🔴 Red = Action Required`,
    )
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
