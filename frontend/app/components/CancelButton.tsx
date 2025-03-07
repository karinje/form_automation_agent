"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface CancelButtonProps {
  onCancel: () => void
  className?: string
}

export function CancelButton({ onCancel, className = "" }: CancelButtonProps) {
  return (
    <Button 
      type="button"
      variant="outline"
      size="sm"
      onClick={onCancel}
      className={`text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 ${className}`}
    >
      <X className="h-4 w-4 mr-1" />
      Cancel
    </Button>
  )
} 