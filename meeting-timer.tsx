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

    // Create enhanced HTML content for PDF
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
      
      body { 
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1.6;
        color: #1a202c;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        padding: 20px;
      }
      
      .document-container {
        max-width: 1200px;
        margin: 0 auto;
        background: white;
        border-radius: 20px;
        box-shadow: 0 25px 50px rgba(0,0,0,0.15);
        overflow: hidden;
        position: relative;
      }
      
      .document-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 6px;
        background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57);
      }
      
      .header-section {
        background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
        color: white;
        padding: 50px 40px;
        text-align: center;
        position: relative;
        overflow: hidden;
      }
      
      .header-section::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
        background-size: 30px 30px;
        animation: float 20s ease-in-out infinite;
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(180deg); }
      }
      
      .company-logo {
        width: 100px;
        height: 100px;
        background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
        border-radius: 50%;
        margin: 0 auto 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 36px;
        font-weight: 800;
        color: white;
        border: 4px solid rgba(255,255,255,0.3);
        box-shadow: 0 15px 35px rgba(0,0,0,0.2);
        position: relative;
        z-index: 1;
      }
      
      .main-title { 
        font-size: 3.5em;
        margin-bottom: 15px;
        font-weight: 800;
        letter-spacing: -2px;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        position: relative;
        z-index: 1;
      }
      
      .subtitle {
        font-size: 1.4em;
        opacity: 0.9;
        margin-bottom: 30px;
        font-weight: 300;
        letter-spacing: 1px;
        position: relative;
        z-index: 1;
      }
      
      .meeting-info-card { 
        background: rgba(255,255,255,0.15);
        padding: 30px;
        border-radius: 20px;
        backdrop-filter: blur(20px);
        display: inline-block;
        border: 1px solid rgba(255,255,255,0.2);
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        position: relative;
        z-index: 1;
      }
      
      .content-area {
        padding: 60px 40px;
      }
      
      .stats-dashboard {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 30px;
        margin-bottom: 60px;
      }
      
      .stat-card {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        padding: 35px 25px;
        border-radius: 20px;
        text-align: center;
        border-left: 6px solid;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .stat-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 100%);
        pointer-events: none;
      }
      
      .stat-card:nth-child(1) { border-left-color: #3498db; }
      .stat-card:nth-child(2) { border-left-color: #e74c3c; }
      .stat-card:nth-child(3) { border-left-color: #2ecc71; }
      .stat-card:nth-child(4) { border-left-color: #f39c12; }
      .stat-card:nth-child(5) { border-left-color: #9b59b6; }
      .stat-card:nth-child(6) { border-left-color: #1abc9c; }
      
      .stat-number {
        font-size: 3.5em;
        font-weight: 800;
        margin-bottom: 10px;
        background: linear-gradient(135deg, #2c3e50, #3498db);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        position: relative;
        z-index: 1;
      }
      
      .stat-label {
        color: #64748b;
        font-size: 1em;
        text-transform: uppercase;
        letter-spacing: 2px;
        font-weight: 600;
        position: relative;
        z-index: 1;
      }
      
      .section-header {
        font-size: 2.5em;
        color: #2c3e50;
        margin-bottom: 40px;
        padding-bottom: 20px;
        border-bottom: 4px solid;
        border-image: linear-gradient(90deg, #3498db, #2ecc71, #f39c12) 1;
        display: inline-block;
        font-weight: 700;
        letter-spacing: -1px;
      }
      
      .main-table { 
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 50px;
        background: white;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      }
      
      .main-table th { 
        background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
        color: white;
        padding: 25px 20px;
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
        height: 3px;
        background: linear-gradient(90deg, rgba(255,255,255,0.3), transparent);
      }
      
      .main-table td { 
        padding: 20px;
        border-bottom: 1px solid #e2e8f0;
        transition: all 0.3s ease;
        vertical-align: middle;
      }
      
      .main-table tr:hover td {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        transform: scale(1.01);
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      }
      
      .main-table tr:last-child td {
        border-bottom: none;
      }
      
      .activity-name {
        font-weight: 700;
        color: #2c3e50;
        font-size: 1.1em;
        display: flex;
        align-items: center;
      }
      
      .activity-name::before {
        content: '🎯';
        margin-right: 10px;
        font-size: 1.2em;
      }
      
      .duration-badge {
        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
        color: white;
        padding: 10px 18px;
        border-radius: 25px;
        font-weight: 700;
        text-align: center;
        display: inline-block;
        min-width: 80px;
        box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
        font-size: 0.9em;
      }
      
      .time-badge {
        background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
        color: white;
        padding: 10px 16px;
        border-radius: 12px;
        font-family: 'Courier New', monospace;
        font-weight: 700;
        box-shadow: 0 6px 20px rgba(155, 89, 182, 0.4);
        font-size: 0.85em;
      }
      
      .days-badge {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: white;
        padding: 8px 14px;
        border-radius: 20px;
        font-size: 0.8em;
        font-weight: 600;
        box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
        margin: 2px;
        display: inline-block;
      }
      
      .frequency-badge {
        background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: 700;
        text-align: center;
        box-shadow: 0 6px 20px rgba(243, 156, 18, 0.4);
        font-size: 0.9em;
      }
      
      .day-section {
        margin-bottom: 40px;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-radius: 15px;
        padding: 30px;
        border-left: 6px solid #3498db;
      }
      
      .day-header {
        font-size: 1.8em;
        color: #2c3e50;
        margin-bottom: 20px;
        font-weight: 700;
        display: flex;
        align-items: center;
      }
      
      .day-header::before {
        content: '📅';
        margin-right: 15px;
        font-size: 1.2em;
      }
      
      .summary-section {
        background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
        color: white;
        padding: 50px 40px;
        border-radius: 20px;
        margin-top: 50px;
      }
      
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 30px;
        margin-top: 30px;
      }
      
      .summary-card {
        background: rgba(255,255,255,0.1);
        padding: 30px;
        border-radius: 15px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
      }
      
      .summary-card h4 {
        color: #ecf0f1;
        margin-bottom: 20px;
        font-size: 1.3em;
        border-bottom: 2px solid #3498db;
        padding-bottom: 10px;
        font-weight: 600;
      }
      
      .summary-card p {
        margin-bottom: 10px;
        opacity: 0.9;
        line-height: 1.8;
      }
      
      .footer-section {
        background: #1a202c;
        color: white;
        padding: 40px;
        text-align: center;
      }
      
      .document-info {
        background: rgba(255,255,255,0.1);
        padding: 25px;
        border-radius: 15px;
        border: 1px solid rgba(255,255,255,0.2);
        backdrop-filter: blur(10px);
      }
      
      .no-activities {
        text-align: center;
        color: #64748b;
        font-style: italic;
        padding: 40px;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-radius: 10px;
      }
      
      @media print {
        body {
          background: white;
          padding: 0;
        }
        .document-container {
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
    <div class="document-container">
      <div class="header-section">
        <div class="company-logo">FMDS</div>
        <h1 class="main-title">Meeting Schedule</h1>
        <div class="subtitle">First Management Development System</div>
        <div class="meeting-info-card">
          <strong>📅 Daily Meeting Time: ${meetingTime}</strong><br>
          <span style="opacity: 0.9;">Professional Schedule Management Report</span>
        </div>
      </div>
      
      <div class="content-area">
        <div class="stats-dashboard">
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
                <td>${segment.days.map((day) => `<span class="days-badge">${day}</span>`).join(" ")}</td>
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
            <div class="day-header">${dayData.day} Schedule</div>
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
      
      <div class="summary-section">
        <h3 style="text-align: center; margin-bottom: 30px; font-size: 2.2em; font-weight: 300;">📊 Advanced Analytics</h3>
        <div class="summary-grid">
          <div class="summary-card">
            <h4>📈 Activity Distribution</h4>
            <p><strong>Most Active Day:</strong> ${mostBusyDay.day} (${mostBusyDay.totalDuration} minutes)</p>
            <p><strong>Total Weekly Commitment:</strong> ${totalWeeklyMinutes} minutes</p>
            <p><strong>Daily Average:</strong> ${Math.round(totalWeeklyMinutes / 5)} minutes</p>
            <p><strong>Efficiency Score:</strong> ${Math.round((activeDays / 5) * 100)}%</p>
          </div>
          <div class="summary-card">
            <h4>⏰ Time Analysis</h4>
            <p><strong>Shortest Activity:</strong> ${Math.min(...segments.map((s) => s.duration))} minutes</p>
            <p><strong>Longest Activity:</strong> ${Math.max(...segments.map((s) => s.duration))} minutes</p>
            <p><strong>Time Variance:</strong> ${Math.max(...segments.map((s) => s.duration)) - Math.min(...segments.map((s) => s.duration))} minutes</p>
            <p><strong>Meeting Window:</strong> ${meetingTime}</p>
          </div>
          <div class="summary-card">
            <h4>📅 Schedule Optimization</h4>
            <p><strong>Coverage Rate:</strong> ${Math.round((activeDays / 5) * 100)}% of weekdays</p>
            <p><strong>Activity Density:</strong> ${Math.round((totalActivities / activeDays) * 10) / 10} per active day</p>
            <p><strong>Peak Utilization:</strong> ${mostBusyDay.day} (${mostBusyDay.activityCount} activities)</p>
            <p><strong>Optimization Score:</strong> ${Math.round((totalDuration / (activeDays * 40)) * 100)}%</p>
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
          })} at ${timeStr}<br>
          Report: FMDS Professional Meeting Schedule | Version: 4.0 | Status: Active<br>
          Total Pages: 1 | Export Format: PDF | Classification: Internal Use
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
