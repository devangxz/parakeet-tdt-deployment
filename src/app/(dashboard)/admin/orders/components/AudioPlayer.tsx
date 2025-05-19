'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import {
  ArrowBigDownDash,
  ArrowBigUpDash,
  FastForward,
  Pause,
  Play,
  Rewind,
  Volume1,
  Volume2,
} from 'lucide-react'
import Slider from 'rc-slider'
import { useEffect, useRef, useState, useMemo } from 'react'
import { toast } from 'sonner'

import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import Waveform from '@/components/editor/Waveform'
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import 'rc-slider/assets/index.css'
import {
  ShortcutControls,
  useShortcuts,
} from '@/utils/editorAudioPlayerShortcuts'
import formatDuration from '@/utils/formatDuration'

type PlayerButtonProps = {
  icon: React.ReactNode
  tooltip: string
  onClick?: () => void
}

function PlayerButton({ icon, tooltip, onClick }: PlayerButtonProps) {
  return (
    <button
      aria-label={tooltip}
      onClick={onClick}
      className='w-10 h-10 rounded-full bg-[#EEE9FF] dark:bg-secondary flex items-center justify-center mx-1'
    >
      {icon}
    </button>
  )
}

const createShortcutControls = (
  audioPlayer: React.RefObject<HTMLAudioElement>
): Partial<ShortcutControls> => ({
  togglePlay: () => {
    if (!audioPlayer.current) return
    audioPlayer.current.paused
      ? audioPlayer.current.play()
      : audioPlayer.current.pause()
  },
  pause: () => {
    audioPlayer.current?.pause()
  },
  skipAudio: (seconds: number) => {
    if (audioPlayer.current) {
      audioPlayer.current.currentTime += seconds
    }
  },
  increaseVolume: () => {
    if (audioPlayer.current) {
      audioPlayer.current.volume = Math.min(1, audioPlayer.current.volume + 0.1)
    }
  },
  decreaseVolume: () => {
    if (audioPlayer.current) {
      audioPlayer.current.volume = Math.max(0, audioPlayer.current.volume - 0.1)
    }
  },
  increasePlaybackSpeed: () => {
    if (audioPlayer.current) {
      audioPlayer.current.playbackRate += 0.1
    }
  },
  decreasePlaybackSpeed: () => {
    if (audioPlayer.current) {
      audioPlayer.current.playbackRate -= 0.1 
    }
  },
  decreasePlaybackRateBy25: () => {
    if (audioPlayer.current) {
      audioPlayer.current.playbackRate = Math.max(0.1, audioPlayer.current.playbackRate - 0.25)
    }
  },
  increasePlaybackRateBy25: () => {
    if (audioPlayer.current) {
      audioPlayer.current.playbackRate += 0.25
    }
  },
})

export default function AudioPlayer({
  fileId,
  getAudioPlayer,
}: {
  fileId: string
  getAudioPlayer?: (audioPlayer: HTMLAudioElement | null) => void
}) {
  const [currentTime, setCurrentTime] = useState('00:00')
  const [currentValue, setCurrentValue] = useState(0)
  const audioPlayer = useRef<HTMLAudioElement>(null)
  const [waveformUrl, setWaveformUrl] = useState('')
  const [isPlayerLoaded, setIsPlayerLoaded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')

  const shortcutControls = useMemo(
    () => createShortcutControls(audioPlayer),
    [audioPlayer]
  )

  useShortcuts(shortcutControls as ShortcutControls)

  const fetchWaveform = async () => {
    try {
      const res = await getSignedUrlAction(`${fileId}_wf.png`, 300)
      if (res.success && res.signedUrl) {
        setWaveformUrl(res.signedUrl)
      } else {
        throw new Error('Failed to fetch waveform')
      }
      setIsPlayerLoaded(true)
    } catch (error) {
      toast.error('Failed to load waveform visualization')
      setIsPlayerLoaded(true)
    }
  }

  const fetchAudioUrl = async () => {
    try {
      const res = await getSignedUrlAction(`${fileId}.mp3`, 3600)
      if (res.success && res.signedUrl) {
        setAudioUrl(res.signedUrl)
      } else {
        throw new Error('Failed to fetch audio file')
      }
    } catch (error) {
      toast.error('Failed to fetch audio file')
    }
  }

  useEffect(() => {
    if (!fileId) return
    fetchWaveform()
    fetchAudioUrl()
  }, [fileId])

  useEffect(() => {
    const audio = audioPlayer.current
    if (!audio || !audioUrl) return
    
    // Initialize audio and set initial source if needed
    if (!audio.src || audio.src !== audioUrl) {
      audio.src = audioUrl
      audio.preload = 'auto'
    }
    
    const handleLoadedMetadata = () => {
      if (getAudioPlayer) getAudioPlayer(audio)
    }
    
    const handleTimeUpdate = () => {
      setCurrentTime(formatDuration(audio.currentTime))
      const playedPercentage = (audio.currentTime / audio.duration) * 100
      setCurrentValue(playedPercentage)
    }
    
    const handlePlayPause = () => {
      setIsPlaying(!audio.paused)
    }
    
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlayPause)
    audio.addEventListener('pause', handlePlayPause)
    
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlayPause)
      audio.removeEventListener('pause', handlePlayPause)
    }
  }, [audioUrl, getAudioPlayer])

  const formatTime = (seconds: number | undefined): string => {
    if (!seconds) return '00:00'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes
    const formattedSeconds =
      remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds

    if (hours > 0) {
      return `${hours}:${formattedMinutes}:${formattedSeconds}`
    } else {
      return `${formattedMinutes}:${formattedSeconds}`
    }
  }

  return (
    <div className='mb-3 h-60 relative overflow-hidden'>
      {!isPlayerLoaded && (
        <div className='absolute inset-0 w-full h-full bg-background z-50 flex justify-center items-center rounded-2xl'>
          <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
          <span>Loading...</span>
        </div>
      )}
      <div className='h-[45%] bg-background rounded-t-2xl border border-customBorder border-b-0 overflow-hidden'>
        <Waveform
          waveformUrl={waveformUrl}
          audioPlayer={audioPlayer}
          className="h-full"
        />
      </div>
      <div className='h-[55%] bg-background border border-customBorder rounded-b-2xl px-3'>
        <div className='w-full mt-2'>
          <audio ref={audioPlayer} className='hidden' src={audioUrl}></audio>
          <Slider
            step={0.01}
            min={0}
            max={100}
            value={currentValue}
            onChange={(value) => {
              setCurrentValue(value as number)
              if (audioPlayer.current) {
                const time = (Number(value) / 100) * audioPlayer.current.duration
                audioPlayer.current.currentTime = time
                audioPlayer.current.play()
                setIsPlaying(true)
              }
            }}
            className='cursor-pointer'
            styles={{
              rail: { height: '7px' },
              track: { backgroundColor: '#6442ED', height: '7px' },
              handle: { display: 'none' }
            }}
          />
        </div>

        <div className='flex justify-between items-center mb-2 mt-3'>
          <span className='text-sm w-[100px]'>
            {currentTime}
          </span>
          <div className='flex items-center'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <PlayerButton
                    icon={<Rewind />}
                    tooltip=''
                    onClick={() => shortcutControls.skipAudio?.(-10)}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Go back 10 seconds</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <PlayerButton
                    icon={isPlaying ? <Pause /> : <Play />}
                    tooltip={isPlaying ? 'Pause' : 'Play'}
                    onClick={() => {
                      shortcutControls.togglePlay?.()
                      setIsPlaying(!isPlaying)
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Play</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <PlayerButton
                    icon={<FastForward />}
                    tooltip='Go forward 10 seconds'
                    onClick={() => shortcutControls.skipAudio?.(10)}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Go forward 10 seconds</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <PlayerButton
                    icon={<ArrowBigUpDash />}
                    tooltip='Fast forward'
                    onClick={shortcutControls.increasePlaybackSpeed}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Increase playback speed</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <PlayerButton
                    icon={<ArrowBigDownDash />}
                    tooltip='Rewind'
                    onClick={shortcutControls.decreasePlaybackSpeed}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Decrease playback speed</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <PlayerButton
                    icon={<Volume2 />}
                    tooltip='Increase volume'
                    onClick={shortcutControls.increaseVolume}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Increase volume</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <PlayerButton
                    icon={<Volume1 />}
                    tooltip='Decrease volume'
                    onClick={shortcutControls.decreaseVolume}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Decrease volume</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className='text-[#8C8C8C] text-sm w-[100px] text-right'>
            {formatTime(audioPlayer.current?.duration)}
          </span>
        </div>
      </div>
    </div>
  )
}
