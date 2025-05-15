'use client'

import { Play, Pause } from 'lucide-react'

interface PlaybackButtonProps {
  isPlaying: boolean
  isLoading: boolean
  onClick: () => void
  className?: string
}

export function PlaybackButton({
  isPlaying,
  isLoading,
  onClick,
  className = "",
}: PlaybackButtonProps) {
  return (
    <button
      className={`w-8 h-8 p-0 rounded-full flex items-center justify-center border ${className}`}
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="10" />
        </svg>
      ) : isPlaying ? (
        <Pause className="h-4 w-4" />
      ) : (
        <Play className="h-4 w-4" />
      )}
    </button>
  )
} 