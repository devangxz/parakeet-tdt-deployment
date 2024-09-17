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
import Image from 'next/image'
import Slider from 'rc-slider'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import 'rc-slider/assets/index.css';
import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'

type PlayerButtonProps = {
    icon: React.ReactNode
    tooltip: string
    onClick?: () => void
}

export type PlayerControls = {
    playPause: () => void
    seekForward: () => void
    seekBackward: () => void
    volumeDown: () => void
    volumeUp: () => void
    increaseSpeed: () => void
    decreaseSpeed: () => void
    playAt75Percent: () => void
    playAt100Percent: () => void
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

const initialPlayerControls: PlayerControls = {
    playPause: () => { },
    seekForward: () => { },
    seekBackward: () => { },
    volumeDown: () => { },
    volumeUp: () => { },
    increaseSpeed: () => { },
    decreaseSpeed: () => { },
    playAt75Percent: () => { },
    playAt100Percent: () => { },
}

export default function NewAudioPlayer({ fileId, getAudioPlayer }: { fileId: string, getAudioPlayer?: (audioPlayer: HTMLAudioElement | null) => void }) {
    const [currentValue, setCurrentValue] = useState(0)
    const [currentTime, setCurrentTime] = useState('00:00')
    const [audioDuration, setAudioDuration] = useState(0)
    const audioPlayer = useRef<HTMLAudioElement>(null);
    const [playerControls, setPlayerControls] = useState<PlayerControls>(initialPlayerControls)
    const [audioUrl, setAudioUrl] = useState('')
    const [waveformUrl, setWaveformUrl] = useState('')
    const [isPlayerLoaded, setIsPlayerLoaded] = useState(false)

    useEffect(() => {
        const playerFunctions = {
            playPause: () => {
                if (!audioPlayer.current) return;
                if (audioPlayer.current.paused) {
                    audioPlayer.current.play();
                } else {
                    audioPlayer.current.pause();
                }
            },
            seekForward: () => {
                if (!audioPlayer.current) return;
                audioPlayer.current.currentTime += 10;
            },
            seekBackward: () => {
                if (!audioPlayer.current) return;
                audioPlayer.current.currentTime -= 10;
            },
            volumeDown: () => {
                if (!audioPlayer.current) return;
                audioPlayer.current.volume = Math.max(0, audioPlayer.current.volume - 0.1);
            },
            volumeUp: () => {
                if (!audioPlayer.current) return;
                audioPlayer.current.volume = Math.min(1, audioPlayer.current.volume + 0.1);
            },
            increaseSpeed: () => {
                if (!audioPlayer.current) return;
                audioPlayer.current.playbackRate += 0.1;
            },
            decreaseSpeed: () => {
                if (!audioPlayer.current) return;
                audioPlayer.current.playbackRate -= 0.1;
            },
            playAt75Percent: () => {
                if (!audioPlayer.current) return;
                audioPlayer.current.playbackRate = 0.75;
            },
            playAt100Percent: () => {
                if (!audioPlayer.current) return;
                audioPlayer.current.playbackRate = 1.0;
            },
        };

        setPlayerControls(playerFunctions);

    }, [audioPlayer]);

    const fetchAudioFile = async () => {
        try {
            const response = await axiosInstance.get(`${BACKEND_URL}/get-audio/${fileId}`, { responseType: 'blob' })
            const url = URL.createObjectURL(response.data)
            setAudioUrl(url)
            const res = await axiosInstance.get(`${BACKEND_URL}/get-waveform/${fileId}`, { responseType: 'blob' })
            const waveformUrl = URL.createObjectURL(res.data)
            setWaveformUrl(waveformUrl)
            setIsPlayerLoaded(true)
        } catch (error) {
            toast.error('Failed to play audio.')
        }
    }

    useEffect(() => {
        if (!fileId) return
        fetchAudioFile()
    }, [fileId])

    useEffect(() => {
        const audio = audioPlayer.current;
        if (!audio) return;
        const handleLoadedMetadata = () => {
            setAudioDuration(audio.duration);
            if (getAudioPlayer) getAudioPlayer(audio);
        };
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, [audioPlayer]);

    // useEffect(() => {
    //   bindShortcuts(playerControls)
    // }, [playerControls])

    const seekTo = (value: number) => {
        if (!audioPlayer.current) return;
        const duration = audioPlayer.current.duration;
        if (duration) {
            const time = (value / 100) * duration;
            audioPlayer.current.currentTime = time;
        }
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

    const audio = audioPlayer.current;
    audio?.addEventListener('timeupdate', () => {
        const currentTime = formatTime(audio.currentTime)
        setCurrentTime(currentTime)
        const playedPercentage =
            (audio.currentTime / audio.duration) * 100
        setCurrentValue(playedPercentage)
    })

    return (
        <div className='mb-3 h-1/4 relative overflow-hidden'>
            {!isPlayerLoaded && (
                <div className='absolute inset-0 w-full h-full bg-white z-50 flex justify-center items-center rounded-2xl'>
                    <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                    <span>Loading...</span>
                </div>
            )}
            <div className='h-1/2 bg-white rounded-t-2xl border border-gray-200 border-b-0 overflow-hidden'>
                <div id='waveform' className='relative h-full'>
                    <Image src={waveformUrl} alt='waveform' layout='fill' objectFit='contain' />
                </div>
            </div>
            <div className='h-1/2 bg-white border border-gray-200 rounded-b-2xl px-3'>
                <div className='w-full h-10 mt-2'>
                    <audio ref={audioPlayer} className='hidden' src={audioUrl}></audio>
                    <Slider
                        step={0.01}
                        min={0}
                        max={100}
                        value={currentValue}
                        onChange={(value) => {
                            setCurrentValue(value as number)
                            seekTo(Number(value))
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
