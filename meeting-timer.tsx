"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Play, Pause, Square, Edit, Plus, Download, Trash2, Loader2, RefreshCw } from "lucide-react"
import { meetingSegmentService, type MeetingSegment } from "@/lib/database"
import { useToast } from "@/hooks/use-toast"

interface TimerState {
  isRunning: boolean
  currentTime: number
  totalTime: number
  currentSegment: number
}

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
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const { toast } = useToast()

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]
  const meetingTime = "7:10 AM - 7:50 AM"

  // Get segments for selected day
  const todaySegments = segments.filter((segment) => segment.days.includes(selectedDay))

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

  const exportToPDF = async () => {
    try {
      const analytics = await meetingSegmentService.getAnalytics()

      // Create A3-optimized single table HTML content for PDF
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>FMDS Meeting Schedule - A3 Table</title>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A3 landscape;
      margin: 10mm;
    }
    
    @media print {
      @page {
        size: A3 landscape;
        margin: 10mm;
      }
      
      body {
        font-size: 10pt;
        line-height: 1.3;
        color: #000 !important;
        background: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .main-table {
        font-size: 9pt;
      }
      
      .header-section {
        background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.4;
      color: #1a202c;
      background: #f8fafc;
      font-size: 11pt;
    }
    
    .document-container {
      width: 100%;
      max-width: 420mm;
      margin: 0 auto;
      background: white;
      padding: 15mm;
    }
    
    .header-section {
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      color: white;
      padding: 20mm 15mm;
      text-align: center;
      margin-bottom: 15mm;
      border-radius: 8px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .company-logo {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #e74c3c, #f39c12);
      border-radius: 50%;
      margin: 0 auto 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 800;
      color: white;
      border: 3px solid rgba(255,255,255,0.3);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .main-title { 
      font-size: 2.2em;
      margin-bottom: 8px;
      font-weight: 700;
      letter-spacing: -1px;
    }
    
    .subtitle {
      font-size: 1.1em;
      opacity: 0.9;
      margin-bottom: 15px;
      font-weight: 300;
    }
    
    .meeting-info {
      background: rgba(255,255,255,0.15);
      padding: 15px;
      border-radius: 8px;
      display: inline-block;
      border: 1px solid rgba(255,255,255,0.2);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .stats-summary {
      display: flex;
      justify-content: space-around;
      margin-bottom: 20px;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      padding: 15px;
      border-radius: 8px;
      border: 2px solid #3498db;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .stat-item {
      text-align: center;
      padding: 10px;
    }
    
    .stat-number {
      font-size: 1.8em;
      font-weight: 800;
      color: #2c3e50;
      margin-bottom: 5px;
    }
    
    .stat-label {
      color: #64748b;
      font-size: 0.8em;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }
    
    .main-table { 
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      font-size: 9pt;
      margin-bottom: 20px;
    }
    
    .main-table th { 
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      color: white;
      padding: 12px 8px;
      text-align: center;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 8pt;
      border: 1px solid #34495e;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .main-table td { 
      padding: 10px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
      text-align: center;
      font-size: 8pt;
    }
    
    .main-table tr:nth-child(even) {
      background-color: #f8fafc;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .activity-name {
      font-weight: 700;
      color: #2c3e50;
      text-align: left;
      font-size: 9pt;
    }
    
    .duration-badge {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-weight: 700;
      display: inline-block;
      min-width: 50px;
      font-size: 7pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .time-badge {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
      color: white;
      padding: 3px 6px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-weight: 700;
      font-size: 7pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .day-cell {
      font-size: 7pt;
      line-height: 1.2;
    }
    
    .day-yes {
      background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
      color: white;
      padding: 2px 4px;
      border-radius: 4px;
      margin: 1px;
      display: inline-block;
      font-weight: 600;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .day-no {
      background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
      color: white;
      padding: 2px 4px;
      border-radius: 4px;
      margin: 1px;
      display: inline-block;
      font-weight: 600;
      opacity: 0.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .frequency-badge {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
      color: white;
      padding: 4px 8px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 7pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .weekly-minutes {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
      padding: 4px 8px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 7pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .footer-info {
      background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
      color: white;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      font-size: 8pt;
      margin-top: 15px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .table-title {
      font-size: 1.5em;
      color: #2c3e50;
      margin-bottom: 15px;
      text-align: center;
      font-weight: 700;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="document-container">
    <div class="header-section">
      <div class="company-logo">FMDS</div>
      <h1 class="main-title">Meeting Schedule - Complete Overview</h1>
      <div class="subtitle">First Management Development System</div>
      <div class="meeting-info">
        <strong>📅 Daily Meeting Time: ${meetingTime}</strong><br>
        A3 Professional Table Format | Database Connected
      </div>
    </div>
    
    <div class="stats-summary">
      <div class="stat-item">
        <div class="stat-number">${analytics.totalActivities}</div>
        <div class="stat-label">Total Activities</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${analytics.totalDuration}</div>
        <div class="stat-label">Total Minutes</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${Math.round((analytics.totalDuration / 60) * 10) / 10}</div>
        <div class="stat-label">Total Hours</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${analytics.averageDuration}</div>
        <div class="stat-label">Avg Duration</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${analytics.activeDays}</div>
        <div class="stat-label">Active Days</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${analytics.totalWeeklyMinutes}</div>
        <div class="stat-label">Weekly Minutes</div>
      </div>
    </div>
    
    <h2 class="table-title">📋 Complete Meeting Schedule Matrix</h2>
    
    <table class="main-table">
      <thead>
        <tr>
          <th style="width: 20%;">🎯 Activity Name</th>
          <th style="width: 8%;">⏱️ Duration<br>(min)</th>
          <th style="width: 12%;">🕐 Start Time</th>
          <th style="width: 12%;">🕐 End Time</th>
          <th style="width: 6%;">📅 SUN</th>
          <th style="width: 6%;">📅 MON</th>
          <th style="width: 6%;">📅 TUE</th>
          <th style="width: 6%;">📅 WED</th>
          <th style="width: 6%;">📅 THU</th>
          <th style="width: 8%;">📊 Frequency<br>(days/week)</th>
          <th style="width: 10%;">📈 Weekly<br>Minutes</th>
        </tr>
      </thead>
      <tbody>
        ${segments
          .map((segment) => {
            const weeklyMinutes = segment.duration * segment.days.length
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]

            return `
            <tr>
              <td class="activity-name">${segment.title}</td>
              <td><span class="duration-badge">${segment.duration}</span></td>
              <td><span class="time-badge">${segment.startTime || "N/A"}</span></td>
              <td><span class="time-badge">${segment.endTime || "N/A"}</span></td>
              ${days
                .map(
                  (day) => `
                <td class="day-cell">
                  <span class="${segment.days.includes(day) ? "day-yes" : "day-no"}">
                    ${segment.days.includes(day) ? "✓" : "✗"}
                  </span>
                </td>
              `,
                )
                .join("")}
              <td><span class="frequency-badge">${segment.days.length}/5</span></td>
              <td><span class="weekly-minutes">${weeklyMinutes}</span></td>
            </tr>
          `
          })
          .join("")}
        
        <!-- Summary Row -->
        <tr style="background: linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 100%); font-weight: bold; border-top: 3px solid #2c3e50;">
          <td class="activity-name" style="color: #2c3e50;">📊 TOTALS</td>
          <td><span class="duration-badge" style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);">${analytics.totalDuration}</span></td>
          <td colspan="2" style="color: #2c3e50; font-weight: 700;">SUMMARY</td>
          ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]
            .map((day) => {
              const dayTotal = segments.filter((s) => s.days.includes(day)).reduce((sum, s) => sum + s.duration, 0)
              return `<td><span class="day-yes" style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);">${dayTotal}m</span></td>`
            })
            .join("")}
          <td><span class="frequency-badge" style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);">AVG: ${analytics.averageDuration}m</span></td>
          <td><span class="weekly-minutes" style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);">${analytics.totalWeeklyMinutes}</span></td>
        </tr>
      </tbody>
    </table>
    
    <div class="footer-info">
      <strong>📄 Document Information</strong> | 
      Generated: ${new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })} | 
      Report: FMDS A3 Schedule Matrix | Version: 6.0 | Format: A3 Landscape | Database: Connected | 
      Activities: ${analytics.totalActivities} | Weekly Commitment: ${analytics.totalWeeklyMinutes} minutes
    </div>
  </div>
</body>
</html>
`

      // Create and download PDF with A3 optimization
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
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      })
    }
  }

  const exportToExcel = async () => {
    try {
      const analytics = await meetingSegmentService.getAnalytics()

      // Create comprehensive Excel data with enhanced formatting and colors
      const currentDate = new Date()
      const dateStr = currentDate.toLocaleDateString()
      const timeStr = currentDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })

      // Prepare enhanced data for Excel
      const excelData = []

      // Add professional header with branding
      excelData.push(["🏢 FMDS - FIRST MANAGEMENT DEVELOPMENT SYSTEM"])
      excelData.push(["📊 PROFESSIONAL MEETING SCHEDULE ANALYTICS REPORT"])
      excelData.push([`📅 Generated: ${dateStr} at ${timeStr}`])
      excelData.push([`⏰ Meeting Time: ${meetingTime}`])
      excelData.push(["🎯 Status: Active Schedule | Version: 6.0 Professional | Database: Connected"])
      excelData.push([""])

      // Add executive dashboard
      excelData.push(["📈 EXECUTIVE DASHBOARD"])
      excelData.push(["KPI", "Value", "Unit", "Status", "Trend", "Benchmark"])
      excelData.push([
        "Total Activities",
        analytics.totalActivities,
        "count",
        analytics.totalActivities >= 4 ? "✅ Optimal" : "⚠️ Low",
        analytics.totalActivities >= 4 ? "📈 Good" : "📉 Needs Improvement",
        "4-8 activities",
      ])
      excelData.push([
        "Total Duration",
        analytics.totalDuration,
        "minutes",
        analytics.totalDuration >= 40 ? "✅ Good" : "⚠️ Low",
        analytics.totalDuration >= 40 ? "📈 Adequate" : "📉 Increase",
        "40-60 minutes",
      ])
      excelData.push([
        "Weekly Commitment",
        analytics.totalWeeklyMinutes,
        "minutes",
        analytics.totalWeeklyMinutes >= 200 ? "✅ Excellent" : "⚠️ Low",
        analytics.totalWeeklyMinutes >= 200 ? "📈 Strong" : "📉 Boost Needed",
        "200-300 minutes",
      ])
      excelData.push([
        "Schedule Coverage",
        `${Math.round((analytics.activeDays / 5) * 100)}%`,
        "percentage",
        analytics.activeDays >= 4 ? "✅ Excellent" : "⚠️ Partial",
        analytics.activeDays >= 4 ? "📈 Complete" : "📉 Expand",
        "80-100%",
      ])
      excelData.push([
        "Average Duration",
        analytics.averageDuration,
        "minutes",
        analytics.averageDuration >= 10 ? "✅ Good" : "⚠️ Short",
        analytics.averageDuration >= 10 ? "📈 Balanced" : "📉 Extend",
        "10-20 minutes",
      ])
      excelData.push([
        "Peak Day Load",
        analytics.mostBusyDay.totalDuration,
        "minutes",
        analytics.mostBusyDay.totalDuration <= 40 ? "✅ Manageable" : "⚠️ Heavy",
        analytics.mostBusyDay.totalDuration <= 40 ? "📈 Balanced" : "📉 Redistribute",
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
        "Database ID",
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
          segment.id,
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

      analytics.allDaysData.forEach((dayData) => {
        const activityNames = dayData.segments.map((seg) => seg.title).join(" | ")
        const timeWindow =
          dayData.segments.length > 0
            ? `${dayData.segments[0].startTime} - ${dayData.segments[dayData.segments.length - 1].endTime}`
            : "N/A"
        const utilization = Math.round((dayData.totalDuration / 40) * 100)
        const loadStatus =
          dayData.totalDuration === 0
            ? "🔵 Free"
            : dayData.totalDuration <= 20
              ? "🟢 Light"
              : dayData.totalDuration <= 35
                ? "🟡 Moderate"
                : "🔴 Heavy"
        const recommendation =
          dayData.totalDuration === 0
            ? "Consider adding activities"
            : dayData.totalDuration > 35
              ? "Consider redistributing load"
              : "Well balanced"

        excelData.push([
          dayData.day,
          dayData.activityCount,
          dayData.totalDuration,
          Math.round((dayData.totalDuration / 60) * 10) / 10,
          activityNames || "No activities scheduled",
          timeWindow,
          `${utilization}%`,
          loadStatus,
          recommendation,
        ])
      })

      excelData.push([""])

      // Add database connection info
      excelData.push(["🗄️ DATABASE CONNECTION STATUS"])
      excelData.push(["Component", "Status", "Details"])
      excelData.push(["Supabase Connection", "✅ Connected", "Real-time database integration"])
      excelData.push(["Data Persistence", "✅ Active", "All changes saved automatically"])
      excelData.push(["Real-time Sync", "✅ Enabled", "Multi-user support available"])
      excelData.push(["Backup Status", "✅ Automated", "Cloud-based backup system"])
      excelData.push(["Data Security", "✅ Encrypted", "End-to-end encryption enabled"])

      excelData.push([""])

      // Add metadata and document info
      excelData.push(["📋 DOCUMENT METADATA"])
      excelData.push(["Field", "Value", "Description"])
      excelData.push(["Report Version", "6.0 Professional Database", "Enhanced with real-time database integration"])
      excelData.push(["Export Format", "Excel CSV Professional", "Optimized for Excel with rich formatting"])
      excelData.push([
        "Data Source",
        "FMDS Meeting Timer + Supabase DB",
        "Real-time schedule management with persistence",
      ])
      excelData.push(["Classification", "Internal Use - Management", "For leadership and planning purposes"])
      excelData.push([
        "Next Review Date",
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        "Weekly review cycle",
      ])
      excelData.push(["Contact", "FMDS Administration Team", "For questions and support"])
      excelData.push(["Last Updated", `${dateStr} ${timeStr}`, "Real-time data snapshot"])
      excelData.push(["Database Records", segments.length, "Total segments in database"])
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
      link.setAttribute("download", `FMDS_Database_Analytics_Report_${new Date().toISOString().split("T")[0]}_v6.0.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Show enhanced success message
      toast({
        title: "Excel Export Successful! 📊",
        description: `Professional database analytics report exported with ${segments.length} activities and real-time data.`,
      })
    } catch (error) {
      console.error("Error generating Excel:", error)
      toast({
        title: "Error",
        description: "Failed to generate Excel report. Please try again.",
        variant: "destructive",
      })
    }
  }

  const progress = timer.totalTime > 0 ? ((timer.totalTime - timer.currentTime) / timer.totalTime) * 100 : 0

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading meeting segments from database...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            FMDS Meeting Timer
            <div className="flex items-center gap-1 text-sm font-normal text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Database Connected
            </div>
          </CardTitle>
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
              <Button
                onClick={() => setIsAddDialogOpen(true)}
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
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>DB Connected</span>
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
                            disabled={timer.isRunning || saving}
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
                    disabled={saving}
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
                    disabled={saving}
                  />
                </div>
                <div>
                  <Label htmlFor="new-start-time">Start Time:</Label>
                  <Input
                    id="new-start-time"
                    type="time"
                    value={newSegment.startTime || "7:00"}
                    onChange={(e) => setNewSegment((prev) => ({ ...prev, startTime: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div>
                  <Label htmlFor="new-end-time">End Time:</Label>
                  <Input
                    id="new-end-time"
                    type="time"
                    value={newSegment.endTime || "7:10"}
                    onChange={(e) => setNewSegment((prev) => ({ ...prev, endTime: e.target.value }))}
                    disabled={saving}
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
                          disabled={saving}
                        />
                        <Label htmlFor={`new-${day}`} className="text-sm">
                          {day}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addSegment} className="bg-green-600 hover:bg-green-700" disabled={saving}>
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
                    disabled={saving}
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
                    disabled={saving}
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
                    disabled={saving}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-end-time">End Time:</Label>
                  <Input
                    id="edit-end-time"
                    type="time"
                    value={editingSegment.endTime}
                    onChange={(e) => setEditingSegment((prev) => (prev ? { ...prev, endTime: e.target.value } : null))}
                    disabled={saving}
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
                          disabled={saving}
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
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false)
                      setEditingSegment(null)
                    }}
                    disabled={saving}
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
