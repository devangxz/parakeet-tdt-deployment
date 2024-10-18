'use client'
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
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import WaveSurfer from 'wavesurfer.js'

import { PlayerControls } from '../../app/editor/[orderId]/page';
import 'rc-slider/assets/index.css';
import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'

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
      className='w-10 h-10 rounded-full bg-[#EEE9FF] flex items-center justify-center mx-1'
    >
      {icon}
    </button>
  )
}

export default function AudioPlayer({ getWaveSurfer, fileId, playerControls }: { getWaveSurfer?: (wavesurfer: WaveSurfer | null) => void, fileId: string, playerControls: PlayerControls }) {
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null)
  const [currentValue, setCurrentValue] = useState(0)
  const [currentTime, setCurrentTime] = useState('00:00')
  const [audioDuration, setAudioDuration] = useState(0)
  const waveformRef = useRef<HTMLDivElement>(null);
  const [audioUrl, setAudioUrl] = useState('')

  const fetchAudioFile = async () => {
    try {
      const response = await axiosInstance.get(`${BACKEND_URL}/get-audio/${fileId}`, { responseType: 'blob' }) // Replace with your file name
      const url = URL.createObjectURL(response.data)
      setAudioUrl(url)
    } catch (error) {
      toast.error('Failed to play audio.')
    }
  }

  useEffect(() => {
    if (!fileId) return
    fetchAudioFile()
  }, [fileId])

  useEffect(() => {
    if (!waveformRef.current) return
    waveformRef.current.innerHTML = ''
    const ws = WaveSurfer.create({
      container: '#waveform',
      waveColor: '#4F4A85',
      progressColor: '#383351',
      url: audioUrl,
      interact: false, // This makes the waveform unclickable
      height: 70,
    })

    setWavesurfer(ws)
    if (getWaveSurfer) getWaveSurfer(ws)
  }, [audioUrl])

  useEffect(() => {
    if (!wavesurfer) return;
    wavesurfer.on('ready', () => {
      setAudioDuration(wavesurfer.getDuration());
    })
  }, [wavesurfer])

  // useEffect(() => {
  //   bindShortcuts(playerControls)
  // }, [playerControls])

  const seekTo = (value: number) => {
    wavesurfer?.seekTo(value)
  }

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

  wavesurfer?.on('audioprocess', () => {
    const currentTime = formatTime(wavesurfer.getCurrentTime())
    setCurrentTime(currentTime)
    const playedPercentage =
      (wavesurfer.getCurrentTime() / wavesurfer.getDuration()) * 100
    setCurrentValue(playedPercentage)
  })

  return (
    <div className='mb-3 h-1/4'>
      <div className='h-1/2 bg-white rounded-t-2xl border border-gray-200 border-b-0 overflow-hidden'>
        <div id='waveform' ref={waveformRef}></div>
      </div>
      <div className='h-1/2 bg-white border border-gray-200 rounded-b-2xl px-3'>
        <div className='w-full h-10 mt-2'>
          <Slider
            step={0.01}
            min={0}
            max={100}
            value={currentValue}
            onChange={(value) => {
              setCurrentValue(value as number)
              seekTo((value as number) / 100)
            }}
            styles={{
              rail: { height: '7px' },
              track: { backgroundColor: '#6442ED', height: '7px' },
              handle: { display: 'none' },
            }}
          />
        </div>

        <div className='flex justify-between items-center -mt-3 mb-3'>
          <span className='text-[#8C8C8C] text-sm w-[100px]'>
            {currentTime}
          </span>
          <div className='flex items-center'>
            <PlayerButton
              icon={<Rewind />}
              tooltip='Go back 10 seconds'
              onClick={playerControls.seekBackward}
            />
            <PlayerButton
              icon={<Play />}
              tooltip='Play'
              onClick={playerControls.playPause}
            />
            <PlayerButton
              icon={<Pause />}
              tooltip='Pause'
              onClick={playerControls.playPause}
            />
            <PlayerButton
              icon={<FastForward />}
              tooltip='Go forward 10 seconds'
              onClick={playerControls.seekForward}
            />
            <PlayerButton
              icon={<ArrowBigUpDash />}
              tooltip='Fast forward'
              onClick={playerControls.increaseSpeed}
            />
            <PlayerButton
              icon={<ArrowBigDownDash />}
              tooltip='Rewind'
              onClick={playerControls.decreaseSpeed}
            />
            <PlayerButton
              icon={<Volume2 />}
              tooltip='Increase volume'
              onClick={playerControls.volumeUp}
            />
            <PlayerButton
              icon={<Volume1 />}
              tooltip='Decrease volume'
              onClick={playerControls.volumeDown}
            />
          </div>
          <span className='text-[#8C8C8C] text-sm w-[100px] text-right'>
            {formatTime(audioDuration)}
          </span>
        </div>
      </div>
    </div >
  )
}
