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

    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>FMDS Meeting Schedule</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; text-align: center; margin-bottom: 30px; }
          .meeting-info { text-align: center; margin-bottom: 30px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .day-header { background-color: #e8f5e8; font-weight: bold; }
          .total-row { background-color: #f0f8f0; font-weight: bold; }
          .no-meetings { color: #999; font-style: italic; }
        </style>
      </head>
      <body>
        <h1>FMDS Meeting Schedule</h1>
        <div class="meeting-info">
          <p>Daily Meeting Time: ${meetingTime}</p>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th>Activity</th>
              <th>Duration (min)</th>
              <th>Start Time</th>
              <th>End Time</th>
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
                    <td ${index === 0 ? 'class="day-header"' : ""}>${index === 0 ? dayData.day : ""}</td>
                    <td>${segment.title}</td>
                    <td>${segment.duration}</td>
                    <td>${segment.startTime || "N/A"}</td>
                    <td>${segment.endTime || "N/A"}</td>
                  </tr>
                `,
                  )
                  .join("")}
                <tr class="total-row">
                  <td></td>
                  <td><strong>Total for ${dayData.day}</strong></td>
                  <td><strong>${dayData.totalDuration}</strong></td>
                  <td></td>
                  <td></td>
                </tr>
              `
                  : `
                <tr>
                  <td class="day-header">${dayData.day}</td>
                  <td class="no-meetings" colspan="4">No meetings scheduled</td>
                </tr>
              `
              }
            `,
              )
              .join("")}
          </tbody>
        </table>
        
        <div style="margin-top: 30px;">
          <h3>Summary</h3>
          <p>Total Activities: ${segments.length}</p>
          <p>Days with Meetings: ${allDaysData.filter((d) => d.segments.length > 0).length}</p>
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
      }, 250)
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
