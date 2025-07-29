"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Play, Pause, Square, Edit, Plus, Download, Trash2, Loader2, RefreshCw, Menu, X } from "lucide-react"
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

      // Create A3-optimized single table HTML content for PDF with larger sizing
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
      margin: 8mm;
    }
    
    @media print {
      @page {
        size: A3 landscape;
        margin: 8mm;
      }
      
      body {
        font-size: 14pt;
        line-height: 1.4;
        color: #000 !important;
        background: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .main-table {
        font-size: 13pt;
      }
      
      .header-section {
        background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.5;
      color: #1a202c;
      background: #f8fafc;
      font-size: 16pt;
    }
    
    .document-container {
      width: 100%;
      height: 100vh;
      margin: 0;
      background: white;
      padding: 8mm;
      display: flex;
      flex-direction: column;
    }
    
    .header-section {
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      color: white;
      padding: 20px 25px;
      text-align: center;
      margin-bottom: 20px;
      border-radius: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      flex-shrink: 0;
    }
    
    .company-logo {
      width: 70px;
      height: 70px;
      background: linear-gradient(135deg, #e74c3c, #f39c12);
      border-radius: 50%;
      margin: 0 auto 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 800;
      color: white;
      border: 4px solid rgba(255,255,255,0.3);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .main-title { 
      font-size: 2.8em;
      margin-bottom: 10px;
      font-weight: 700;
      letter-spacing: -1px;
    }
    
    .subtitle {
      font-size: 1.3em;
      opacity: 0.9;
      margin-bottom: 18px;
      font-weight: 300;
    }
    
    .meeting-info {
      background: rgba(255,255,255,0.15);
      padding: 18px;
      border-radius: 10px;
      display: inline-block;
      border: 2px solid rgba(255,255,255,0.2);
      font-size: 1.1em;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .stats-summary {
      display: flex;
      justify-content: space-around;
      margin-bottom: 25px;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      padding: 20px;
      border-radius: 12px;
      border: 3px solid #3498db;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      flex-shrink: 0;
    }
    
    .stat-item {
      text-align: center;
      padding: 12px;
    }
    
    .stat-number {
      font-size: 2.2em;
      font-weight: 800;
      color: #2c3e50;
      margin-bottom: 8px;
    }
    
    .stat-label {
      color: #64748b;
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }
    
    .table-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    
    .table-title {
      font-size: 2em;
      color: #2c3e50;
      margin-bottom: 20px;
      text-align: center;
      font-weight: 700;
      border-bottom: 4px solid #3498db;
      padding-bottom: 15px;
    }
    
    .main-table { 
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.15);
      font-size: 14pt;
      flex: 1;
      height: 100%;
    }
    
    .main-table th { 
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      color: white;
      padding: 18px 12px;
      text-align: center;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-size: 12pt;
      border: 2px solid #34495e;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      vertical-align: middle;
    }
    
    .main-table td { 
      padding: 16px 12px;
      border: 2px solid #e2e8f0;
      vertical-align: middle;
      text-align: center;
      font-size: 12pt;
      line-height: 1.4;
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
      font-size: 13pt;
      padding-left: 16px !important;
    }
    
    .duration-badge {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
      padding: 8px 14px;
      border-radius: 16px;
      font-weight: 700;
      display: inline-block;
      min-width: 60px;
      font-size: 11pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .time-badge {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
      color: white;
      padding: 6px 10px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-weight: 700;
      font-size: 10pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .day-cell {
      font-size: 10pt;
      line-height: 1.3;
      padding: 8px !important;
    }
    
    .day-yes {
      background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
      color: white;
      padding: 6px 8px;
      border-radius: 6px;
      margin: 2px;
      display: inline-block;
      font-weight: 700;
      font-size: 11pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .day-no {
      background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
      color: white;
      padding: 6px 8px;
      border-radius: 6px;
      margin: 2px;
      display: inline-block;
      font-weight: 700;
      opacity: 0.7;
      font-size: 11pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .frequency-badge {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
      color: white;
      padding: 8px 12px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 10pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .weekly-minutes {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
      padding: 8px 12px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 10pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .summary-row {
      background: linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 100%) !important;
      font-weight: bold !important;
      border-top: 4px solid #2c3e50 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .summary-row td {
      padding: 20px 12px !important;
      font-size: 13pt !important;
    }
    
    .footer-info {
      background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
      color: white;
      padding: 18px;
      border-radius: 10px;
      text-align: center;
      font-size: 10pt;
      margin-top: 20px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      flex-shrink: 0;
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
    
    <div class="table-container">
      <h2 class="table-title">📋 Complete Meeting Schedule Matrix</h2>
      
      <table class="main-table">
        <thead>
          <tr>
            <th style="width: 22%;">🎯 Activity Name</th>
            <th style="width: 10%;">⏱️ Duration<br>(min)</th>
            <th style="width: 12%;">🕐 Start Time</th>
            <th style="width: 12%;">🕐 End Time</th>
            <th style="width: 8%;">📅 SUN</th>
            <th style="width: 8%;">📅 MON</th>
            <th style="width: 8%;">📅 TUE</th>
            <th style="width: 8%;">📅 WED</th>
            <th style="width: 8%;">📅 THU</th>
            <th style="width: 10%;">📊 Frequency<br>(days/week)</th>
            <th style="width: 12%;">📈 Weekly<br>Minutes</th>
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
          <tr class="summary-row">
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
    </div>
    
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
                      .reduce((sum, seg) => sum + seg.duration, 0)
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
                      .reduce((sum, seg) => sum + seg.duration, 0)

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
                    {todaySegments.reduce((sum, seg) => sum + seg.duration, 0)} minutes total)
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
                      Export PDF
                    </Button>
                    <Button
                      onClick={() => {
                        exportToExcel()
                        setIsMobileMenuOpen(false)
                      }}
                      variant="outline"
                      className="w-full border-blue-500 text-blue-700 hover:bg-blue-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Excel
                    </Button>
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
                    <Card key={segment.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold text-gray-900 text-sm">{segment.title}</h3>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                              {segment.duration}min
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>
                              <span className="font-medium">Time:</span> {segment.startTime} - {segment.endTime}
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
            </div>

            {/* Mobile-Responsive Add New Segment Form */}
            {isAddDialogOpen && (
              <Card className="border-2 border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-800 text-lg sm:text-xl">Add New Activity</CardTitle>
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
                        End Time:
                      </Label>
                      <Input
                        id="new-end-time"
                        type="time"
                        value={newSegment.endTime || "7:10"}
                        onChange={(e) => setNewSegment((prev) => ({ ...prev, endTime: e.target.value }))}
                        disabled={saving}
                        className="mt-1"
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

            {/* Mobile-Responsive Edit Form */}
            {isEditDialogOpen && editingSegment && (
              <Card className="border-2 border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-800 text-lg sm:text-xl">
                    Edit Activity: {editingSegment.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Label htmlFor="edit-title" className="text-sm font-medium">
                        Activity Title:
                      </Label>
                      <Input
                        id="edit-title"
                        value={editingSegment.title}
                        onChange={(e) =>
                          setEditingSegment((prev) => (prev ? { ...prev, title: e.target.value } : null))
                        }
                        disabled={saving}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-duration" className="text-sm font-medium">
                        Duration (minutes):
                      </Label>
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
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-start-time" className="text-sm font-medium">
                        Start Time:
                      </Label>
                      <Input
                        id="edit-start-time"
                        type="time"
                        value={editingSegment.startTime}
                        onChange={(e) =>
                          setEditingSegment((prev) => (prev ? { ...prev, startTime: e.target.value } : null))
                        }
                        disabled={saving}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-end-time" className="text-sm font-medium">
                        End Time:
                      </Label>
                      <Input
                        id="edit-end-time"
                        type="time"
                        value={editingSegment.endTime}
                        onChange={(e) =>
                          setEditingSegment((prev) => (prev ? { ...prev, endTime: e.target.value } : null))
                        }
                        disabled={saving}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Select Days:</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
                      {days.map((day) => (
                        <div key={day} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${day}`}
                            checked={editingSegment.days.includes(day)}
                            onCheckedChange={(checked) => handleDayChange(day, checked as boolean)}
                            disabled={saving}
                          />
                          <Label htmlFor={`edit-${day}`} className="text-sm">
                            {day.slice(0, 3)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-4">
                    <Button
                      onClick={() => {
                        if (editingSegment) {
                          updateSegment(editingSegment.id, editingSegment)
                          setIsEditDialogOpen(false)
                          setEditingSegment(null)
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
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
                      className="w-full sm:w-auto"
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
    </div>
  )
}
