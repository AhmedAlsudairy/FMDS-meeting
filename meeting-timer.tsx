"use client"

import { useState, useEffect, useRef } from "react"

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
  const timeStr = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })

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

    // Create simplified but professional HTML content for PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>FMDS Meeting Schedule - Professional Report</title>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body { 
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f7fa;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #2c3e50, #3498db);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    
    .company-logo {
      width: 80px;
      height: 80px;
      background: #e74c3c;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: bold;
      color: white;
    }
    
    h1 { 
      font-size: 2.5em;
      margin-bottom: 10px;
      font-weight: bold;
    }
    
    .subtitle {
      font-size: 1.2em;
      margin-bottom: 20px;
      opacity: 0.9;
    }
    
    .meeting-info { 
      background: rgba(255,255,255,0.2);
      padding: 20px;
      border-radius: 10px;
      display: inline-block;
    }
    
    .content {
      padding: 40px 30px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .stat-card {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 10px;
      text-align: center;
      border-left: 5px solid #3498db;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    
    .stat-card:nth-child(2) { border-left-color: #e74c3c; }
    .stat-card:nth-child(3) { border-left-color: #2ecc71; }
    .stat-card:nth-child(4) { border-left-color: #f39c12; }
    .stat-card:nth-child(5) { border-left-color: #9b59b6; }
    .stat-card:nth-child(6) { border-left-color: #1abc9c; }
    
    .stat-number {
      font-size: 2.5em;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 10px;
    }
    
    .stat-label {
      color: #666;
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }
    
    .section-title {
      font-size: 2em;
      color: #2c3e50;
      margin-bottom: 25px;
      padding-bottom: 10px;
      border-bottom: 3px solid #3498db;
      display: inline-block;
    }
    
    .main-table { 
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    
    .main-table th { 
      background: #34495e;
      color: white;
      padding: 15px 12px;
      text-align: left;
      font-weight: bold;
      font-size: 0.9em;
    }
    
    .main-table td { 
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    
    .main-table tr:last-child td {
      border-bottom: none;
    }
    
    .main-table tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    
    .activity-name {
      font-weight: bold;
      color: #2c3e50;
    }
    
    .duration-badge {
      background: #3498db;
      color: white;
      padding: 5px 12px;
      border-radius: 15px;
      font-weight: bold;
      font-size: 0.85em;
    }
    
    .time-range {
      background: #9b59b6;
      color: white;
      padding: 5px 10px;
      border-radius: 5px;
      font-family: monospace;
      font-weight: bold;
      font-size: 0.85em;
    }
    
    .days-badge {
      background: #e74c3c;
      color: white;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: bold;
      margin: 1px;
      display: inline-block;
    }
    
    .frequency-badge {
      background: #f39c12;
      color: white;
      padding: 5px 10px;
      border-radius: 12px;
      font-weight: bold;
      font-size: 0.85em;
    }
    
    .day-section {
      margin-bottom: 30px;
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      border-left: 5px solid #3498db;
    }
    
    .day-header {
      font-size: 1.5em;
      color: #2c3e50;
      margin-bottom: 15px;
      font-weight: bold;
    }
    
    .summary-section {
      background: #2c3e50;
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin-top: 30px;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 20px;
    }
    
    .summary-card {
      background: rgba(255,255,255,0.1);
      padding: 20px;
      border-radius: 8px;
    }
    
    .summary-card h4 {
      color: #ecf0f1;
      margin-bottom: 15px;
      font-size: 1.2em;
      border-bottom: 2px solid #3498db;
      padding-bottom: 8px;
    }
    
    .summary-card p {
      margin-bottom: 8px;
      opacity: 0.9;
    }
    
    .footer {
      background: #34495e;
      color: white;
      padding: 25px;
      text-align: center;
    }
    
    .document-info {
      background: rgba(255,255,255,0.1);
      padding: 20px;
      border-radius: 8px;
    }
    
    .no-activities {
      text-align: center;
      color: #666;
      font-style: italic;
      padding: 30px;
      background: #f8f9fa;
      border-radius: 8px;
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
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company-logo">FMDS</div>
      <h1>Meeting Schedule Report</h1>
      <div class="subtitle">First Management Development System</div>
      <div class="meeting-info">
        <strong>📅 Daily Meeting Time: ${meetingTime}</strong><br>
        Professional Schedule Management Report
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
        <div class="stat-card">
          <div class="stat-number">${activeDays}</div>
          <div class="stat-label">Active Days</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${mostBusyDay.totalDuration}</div>
          <div class="stat-label">Peak Day Minutes</div>
        </div>
      </div>
      
      <h2 class="section-title">📋 Complete Activity Schedule</h2>
      
      <table class="main-table">
        <thead>
          <tr>
            <th>🎯 Activity Name</th>
            <th>⏱️ Duration</th>
            <th>🕐 Time Range</th>
            <th>📅 Scheduled Days</th>
            <th>📊 Frequency</th>
          </tr>
        </thead>
        <tbody>
          ${segments
            .map(
              (segment) => `
            <tr>
              <td class="activity-name">${segment.title}</td>
              <td><span class="duration-badge">${segment.duration} min</span></td>
              <td><span class="time-range">${segment.startTime || "N/A"} - ${segment.endTime || "N/A"}</span></td>
              <td>${segment.days.map((day) => `<span class="days-badge">${day.slice(0, 3)}</span>`).join(" ")}</td>
              <td><span class="frequency-badge">${segment.days.length}/week</span></td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      
      ${allDaysData
        .map(
          (dayData) => `
        <div class="day-section">
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
                    <td><span class="time-range">${segment.startTime} - ${segment.endTime}</span></td>
                  </tr>
                `,
                  )
                  .join("")}
                <tr style="background: #e8f5e9; font-weight: bold;">
                  <td>📊 ${dayData.day} Total</td>
                  <td><span class="duration-badge" style="background: #2ecc71;">${dayData.totalDuration} min</span></td>
                  <td><span class="time-range" style="background: #2ecc71;">${Math.round((dayData.totalDuration / 60) * 10) / 10}h total</span></td>
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
    
    <div class="summary-section">
      <h3 style="text-align: center; margin-bottom: 20px; font-size: 2em;">📊 Analytics Summary</h3>
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
    
    <div class="footer">
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
        Report: FMDS Professional Meeting Schedule | Version: 4.1 | Status: Active
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
      }, 1000)
    }
  }

  const exportToExcel = () => {
    // Create comprehensive Excel data with enhanced formatting
    const currentDate = new Date()
    const dateStr = currentDate.toLocaleDateString()

    // Prepare enhanced data for Excel
    const excelData = []

    // Add header section with company branding
    excelData.push(["FMDS - FIRST MANAGEMENT DEVELOPMENT SYSTEM"])
    excelData.push(["📅 PROFESSIONAL MEETING SCHEDULE REPORT"])
    excelData.push([`Generated: ${dateStr} at ${timeStr}`])
    excelData.push([`Meeting Time: ${meetingTime}`])
    excelData.push([""])

    // Add executive summary
    excelData.push(["📊 EXECUTIVE SUMMARY"])
    excelData.push(["Metric", "Value", "Analysis"])
    excelData.push(["Total Activities", segments.length, "Number of scheduled activities"])
    excelData.push([
      "Total Duration",
      `${segments.reduce((sum, seg) => sum + seg.duration, 0)} minutes`,
      "Combined duration of all activities",
    ])
    excelData.push([
      "Total Hours",
      `${Math.round((segments.reduce((sum, seg) => sum + seg.duration, 0) / 60) * 10) / 10} hours`,
      "Total time commitment",
    ])
    excelData.push([
      "Average Duration",
      `${Math.round(segments.reduce((sum, seg) => sum + seg.duration, 0) / segments.length)} minutes`,
      "Average time per activity",
    ])
    excelData.push([
      "Active Days",
      `${days.filter((day) => segments.some((seg) => seg.days.includes(day))).length}/5 weekdays`,
      "Days with scheduled activities",
    ])
    excelData.push([
      "Weekly Commitment",
      `${segments.reduce((sum, seg) => sum + seg.duration * seg.days.length, 0)} minutes`,
      "Total weekly time investment",
    ])
    excelData.push([""])

    // Add detailed activity breakdown
    excelData.push(["🎯 DETAILED ACTIVITY BREAKDOWN"])
    excelData.push([
      "Activity ID",
      "Activity Name",
      "Duration (Min)",
      "Start Time",
      "End Time",
      "Scheduled Days",
      "Days/Week",
      "Weekly Minutes",
      "Category",
      "Priority",
      "Status",
      "Efficiency Score",
    ])

    segments.forEach((segment, index) => {
      const weeklyMinutes = segment.duration * segment.days.length
      const category = segment.duration <= 10 ? "⚡ Quick" : segment.duration <= 20 ? "⏱️ Standard" : "🕐 Extended"
      const priority = segment.days.length >= 4 ? "🔴 High" : segment.days.length >= 2 ? "🟡 Medium" : "🟢 Low"
      const efficiencyScore = Math.round((segment.days.length / 5) * (40 / segment.duration) * 100)

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
        "✅ Active",
        `${efficiencyScore}%`,
      ])
    })

    excelData.push([""])

    // Add daily breakdown
    excelData.push(["📅 DAILY SCHEDULE BREAKDOWN"])
    excelData.push([
      "Day",
      "Activities Count",
      "Total Duration (Min)",
      "Total Hours",
      "Activity Names",
      "Peak Time",
      "Utilization %",
    ])

    days.forEach((day) => {
      const daySegments = segments.filter((segment) => segment.days.includes(day))
      const totalDuration = daySegments.reduce((sum, seg) => sum + seg.duration, 0)
      const activityNames = daySegments.map((seg) => seg.title).join(" | ")
      const peakTime =
        daySegments.length > 0 ? `${daySegments[0].startTime} - ${daySegments[daySegments.length - 1].endTime}` : "N/A"
      const utilization = Math.round((totalDuration / 40) * 100) // Assuming 40 min total meeting window

      excelData.push([
        day,
        daySegments.length,
        totalDuration,
        Math.round((totalDuration / 60) * 10) / 10,
        activityNames || "No activities",
        peakTime,
        `${utilization}%`,
      ])
    })

    excelData.push([""])

    // Add performance metrics
    excelData.push(["📈 PERFORMANCE METRICS"])
    excelData.push(["Metric", "Value", "Benchmark", "Status", "Recommendation"])

    const totalWeeklyMinutes = segments.reduce((sum, seg) => sum + seg.duration * seg.days.length, 0)
    const activeDays = days.filter((day) => segments.some((seg) => seg.days.includes(day))).length
    const avgDailyTime = Math.round(totalWeeklyMinutes / 5)
    const coverageRate = Math.round((activeDays / 5) * 100)

    excelData.push([
      "Weekly Time Investment",
      `${totalWeeklyMinutes} minutes`,
      "200-300 minutes",
      totalWeeklyMinutes >= 200 ? "✅ Good" : "⚠️ Low",
      totalWeeklyMinutes < 200 ? "Consider adding activities" : "Optimal range",
    ])
    excelData.push([
      "Daily Average",
      `${avgDailyTime} minutes`,
      "40-60 minutes",
      avgDailyTime >= 40 ? "✅ Good" : "⚠️ Low",
      avgDailyTime < 40 ? "Increase daily commitment" : "Well balanced",
    ])
    excelData.push([
      "Schedule Coverage",
      `${coverageRate}%`,
      "80-100%",
      coverageRate >= 80 ? "✅ Excellent" : "⚠️ Needs Improvement",
      coverageRate < 80 ? "Add more active days" : "Great coverage",
    ])
    excelData.push([
      "Activity Diversity",
      `${segments.length} types`,
      "4-8 types",
      segments.length >= 4 ? "✅ Good" : "⚠️ Limited",
      segments.length < 4 ? "Consider more activity types" : "Good variety",
    ])

    excelData.push([""])

    // Add recommendations
    excelData.push(["💡 OPTIMIZATION RECOMMENDATIONS"])
    excelData.push(["Priority", "Recommendation", "Impact", "Effort", "Timeline"])
    excelData.push(["🔴 High", "Standardize meeting times across all days", "High efficiency gain", "Low", "1 week"])
    excelData.push(["🟡 Medium", "Add buffer time between activities", "Reduced stress", "Medium", "2 weeks"])
    excelData.push(["🟢 Low", "Consider rotating activity order", "Improved engagement", "Low", "1 month"])

    excelData.push([""])
    excelData.push(["📋 REPORT METADATA"])
    excelData.push(["Field", "Value"])
    excelData.push(["Report Version", "4.0 Professional"])
    excelData.push(["Export Format", "Excel CSV"])
    excelData.push(["Data Source", "FMDS Meeting Timer"])
    excelData.push(["Classification", "Internal Use"])
    excelData.push(["Next Review", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()])
    excelData.push(["Contact", "FMDS Administration"])

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
      `FMDS_Professional_Schedule_Report_${new Date().toISOString().split("T")[0]}_v4.0.csv`,
    )
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Show success message
    alert(
      "📊 Professional Excel report exported successfully!\n\n✅ Features included:\n• Executive Summary\n• Detailed Activity Breakdown\n• Daily Schedule Analysis\n• Performance Metrics\n• Optimization Recommendations\n\nOpen the file in Excel for best viewing experience.",
    )
  }
}
