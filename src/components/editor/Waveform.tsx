'use client'

import { LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import formatDuration from '@/utils/formatDuration'

interface WaveformProps {
  waveformUrl: string
  audioPlayer?: React.RefObject<HTMLAudioElement>
  isLoading?: boolean
  currentValue?: number
  audioDuration?: number
  bufferedRanges?: { start: number; end: number }[]
  onClick?: (e: React.MouseEvent<HTMLDivElement>, time: number) => void
  onSeek?: (time: number) => void
  className?: string
  currentTime?: string
  showCurrentTimeLabel?: boolean
  showDurationLabel?: boolean
  backgroundSize?: string
  backgroundPosition?: string
  timeMarkerInterval?: number
  isScreenMode?: boolean
  onPause?: boolean
}

export default function Waveform({
  waveformUrl,
  audioPlayer,
  isLoading: externalLoading,
  currentValue: externalCurrentValue,
  audioDuration: externalAudioDuration,
  bufferedRanges: externalBufferedRanges,
  onClick,
  onSeek,
  onPause,
  className = '',
  currentTime: externalCurrentTime,
  showCurrentTimeLabel = false,
  showDurationLabel = false,
  backgroundSize = 'cover',
  backgroundPosition = 'center',
  timeMarkerInterval = 10, 
  isScreenMode = false,
}: WaveformProps) {
  // Internal state when not provided externally
  const [internalCurrentValue, setInternalCurrentValue] = useState(0)
  const [internalBufferedRanges, setInternalBufferedRanges] = useState<{ start: number; end: number }[]>([])
  const [internalAudioDuration, setInternalAudioDuration] = useState(0)
  const [internalCurrentTime, setInternalCurrentTime] = useState('00:00')
  const [internalLoading, setInternalLoading] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0, visible: false, text: '' })
  const [isPaused, setIsPaused] = useState(onPause)
  const currentValue = externalCurrentValue !== undefined ? externalCurrentValue : internalCurrentValue
  const bufferedRanges = externalBufferedRanges || internalBufferedRanges
  const audioDuration = externalAudioDuration || internalAudioDuration
  const currentTimeDisplay = externalCurrentTime || internalCurrentTime
  const isLoading = externalLoading !== undefined ? externalLoading : internalLoading

  useEffect(() => {
    setIsPaused(onPause);
  }, [onPause]);

  useEffect(() => {
    if (!audioPlayer?.current) return

    const audio = audioPlayer.current
    const handleTimeUpdate = () => {
      const playedPercentage = (audio.currentTime / audio.duration) * 100
      setInternalCurrentValue(playedPercentage)
      setInternalCurrentTime(formatDuration(audio.currentTime))
    }
    
    const handleLoadedMetadata = () => {
      setInternalAudioDuration(audio.duration)
    }
    
    const handleProgress = () => {
      const buffered = audio.buffered
      if (!buffered || !audio.duration) return
      
      const ranges = []
      for (let i = 0; i < buffered.length; i++) {
        const start = buffered.start(i)
        const end = buffered.end(i)
        ranges.push({
          start: (start / audio.duration) * 100,
          end: (end / audio.duration) * 100
        })
      }
      setInternalBufferedRanges(ranges)
    }
    
    const handleLoadingStart = () => setInternalLoading(true)
    const handleLoadingEnd = () => setInternalLoading(false)
    
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('progress', handleProgress)
    audio.addEventListener('seeking', handleLoadingStart)
    audio.addEventListener('seeked', handleLoadingEnd)
    audio.addEventListener('waiting', handleLoadingStart)
    audio.addEventListener('canplay', handleLoadingEnd)
    
    // Initial values
    if (audio.duration) {
      setInternalAudioDuration(audio.duration)
      handleProgress()
    }
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('progress', handleProgress)
      audio.removeEventListener('seeking', handleLoadingStart)
      audio.removeEventListener('seeked', handleLoadingEnd)
      audio.removeEventListener('waiting', handleLoadingStart)
      audio.removeEventListener('canplay', handleLoadingEnd)
    }
  }, [audioPlayer?.current])

  useEffect(() => {
    if (isPaused) {
      console.log('Resetting waveform due to pause');
      // Reset internal values
      setInternalBufferedRanges([])
      setInternalCurrentValue(0)
      setInternalCurrentTime('00:00')
      
      // If audio player exists, reset its current time
      if (audioPlayer?.current) {
        audioPlayer.current.currentTime = 0;
      }
      
      // If onSeek callback is provided, use it to notify about the reset
      if (onSeek) {
        onSeek(0);
      }
    }
  }, [isPaused, audioPlayer, onSeek])

  const getOptimalInterval = (duration: number): number => {
    const hours = duration / 3600;
    
    if (hours <= 0.5) return 300;     // 5 min intervals for <= 30 mins
    if (hours <= 1) return 600;       // 10 min intervals for <= 1 hour
    if (hours <= 2) return 900;       // 15 min intervals for <= 2 hours
    if (hours <= 3) return 1200;      // 20 min intervals for <= 3 hours
    if (hours <= 6) return 1800;      // 30 min intervals for <= 6 hours
    return 3600;                      // 1 hour intervals for > 6 hours
  };

  const timeMarkers = useMemo(() => {
    if (!audioDuration) return [];
    
    const markers = [];
    const intervalSeconds = getOptimalInterval(audioDuration);
    
    // Start from first interval (skip the 0 mark)
    for (let time = intervalSeconds; time < audioDuration; time += intervalSeconds) {
      const percentage = (time / audioDuration) * 100;
      markers.push({
        time,
        percentage,
        label: formatDuration(time)
      });
    }
    
    return markers;
  }, [audioDuration, timeMarkerInterval]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioDuration) return;
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = (x / rect.width) * 100
    const time = (percentage / 100) * audioDuration
    
    setTooltipPosition({
      x: e.clientX,
      y: e.clientY - 10,
      visible: true,
      text: formatDuration(time)
    })
  }
  
  const handleMouseLeave = () => {
    setTooltipPosition(prev => ({ ...prev, visible: false }))
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = (x / rect.width) * 100
    const time = (percentage / 100) * audioDuration
    
    // If an external onClick handler is provided, use it
    if (onClick) {
      onClick(e, time)
      return
    }
    
    // Otherwise handle internally if we have an audio player
    if (audioPlayer?.current) {
      audioPlayer.current.currentTime = time
      if (audioPlayer.current.paused) {
        audioPlayer.current.play()
      }
    }
    
    // If onSeek callback is provided, use it
    if (onSeek) {
      onSeek(time)
    }
  }

  return (
    <>
      <div 
        className={`relative cursor-pointer ${isScreenMode ? 'h-16' : 'h-full'} overflow-hidden ${className}`} 
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${waveformUrl})`, 
              backgroundSize,
              backgroundPosition,
              backgroundRepeat: 'no-repeat'
            }}
          />
        
        {/* Time markers at intervals */}
        {timeMarkers.map(marker => (
          <div 
            key={marker.time}
            className="absolute top-0 h-full pointer-events-none flex flex-col items-center"
            style={{ 
              left: `${marker.percentage}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="h-full bg-primary w-[2px]"></div>
            <span className="absolute top-0 bg-primary text-white px-1 py-0.5 rounded-sm text-[10px]">
              {marker.label}
            </span>
          </div>
        ))}
        
        {/* Current progress overlay */}
        <div 
          className="absolute top-0 left-0 h-full bg-primary/20 pointer-events-none z-10"
          style={{
            width: `${audioDuration ? (currentValue) : 0}%`,
            transition: 'width 0.1s linear',
          }}
        />
        
        {/* Buffered ranges */}
        {bufferedRanges.map((range, index) => (
          <div
            key={index}
            className="absolute bottom-0 h-1 bg-gray-400/50 dark:bg-gray-600/50 z-0"
            style={{
              left: `${range.start}%`,
              width: `${range.end - range.start}%`
            }}
          />
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-md">
            <LoaderCircle className="mr-2 h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* Current time and duration labels */}
        {showCurrentTimeLabel && (
          <span className='absolute top-0 left-0 bg-primary text-white px-1 py-0.5 rounded-md text-[11px]'>
            {currentTimeDisplay}
          </span>
        )}
        
        {showDurationLabel && audioDuration > 0 && (
          <span className='absolute top-0 right-0 bg-primary text-white px-1 py-0.5 rounded-md text-[11px]'>
            {formatDuration(audioDuration)}
          </span>
        )}
      </div>
      
      {/* Tooltip */}
      {tooltipPosition.visible && (
        <div 
          className="fixed z-50 bg-primary text-white px-1 py-0.5 rounded-md text-[11px] pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {tooltipPosition.text}
        </div>
      )}
    </>
  )
} 