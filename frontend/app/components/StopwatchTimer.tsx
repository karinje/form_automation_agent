"use client"

import { useState, useEffect } from 'react'

interface StopwatchTimerProps {
  isRunning: boolean
  estimatedTime: string
}

export function StopwatchTimer({ isRunning, estimatedTime }: StopwatchTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isRunning) {
      // Reset timer when it starts running
      setElapsedTime(0)
      
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning])
  
  // Format elapsed time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
    const secs = (seconds % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }
  
  return (
    <div className="mt-1 text-sm text-gray-500 text-center">
      <div className="font-mono">{formatTime(elapsedTime)}</div>
      <div className="text-xs italic">Estimated time: {estimatedTime}</div>
    </div>
  )
} 