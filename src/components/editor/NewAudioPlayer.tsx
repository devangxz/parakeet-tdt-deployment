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
import { useEffect, useRef, useState, useMemo } from 'react'
import { toast } from 'sonner'

import {
    TooltipProvider,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import 'rc-slider/assets/index.css';
import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'
import { ShortcutControls, useShortcuts } from '@/utils/editorAudioPlayerShortcuts'

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

const createShortcutControls = (audioPlayer: React.RefObject<HTMLAudioElement>): Partial<ShortcutControls> => ({
    togglePlay: () => {
        if (!audioPlayer.current) return;
        audioPlayer.current.paused ? audioPlayer.current.play() : audioPlayer.current.pause();
    },
    pause: () => {
        audioPlayer.current?.pause();
    },
    skipAudio: (seconds: number) => {
        if (audioPlayer.current) {
            audioPlayer.current.currentTime += seconds;
        }
    },
    increaseVolume: () => {
        if (audioPlayer.current) {
            audioPlayer.current.volume = Math.min(1, audioPlayer.current.volume + 0.1);
        }
    },
    decreaseVolume: () => {
        if (audioPlayer.current) {
            audioPlayer.current.volume = Math.max(0, audioPlayer.current.volume - 0.1);
        }
    },
    increasePlaybackSpeed: () => {
        if (audioPlayer.current) {
            audioPlayer.current.playbackRate += 0.1;
        }
    },
    decreasePlaybackSpeed: () => {
        if (audioPlayer.current) {
            audioPlayer.current.playbackRate -= 0.1;
        }
    },
});

export default function NewAudioPlayer({ fileId, getAudioPlayer }: { fileId: string, getAudioPlayer?: (audioPlayer: HTMLAudioElement | null) => void }) {
    const [currentValue, setCurrentValue] = useState(0)
    const [currentTime, setCurrentTime] = useState('00:00')
    const [audioDuration, setAudioDuration] = useState(0)
    const audioPlayer = useRef<HTMLAudioElement>(null);
    const [waveformUrl, setWaveformUrl] = useState('')
    const [isPlayerLoaded, setIsPlayerLoaded] = useState(false)

    const shortcutControls = useMemo(() => createShortcutControls(audioPlayer), [audioPlayer]);

    useShortcuts(shortcutControls as ShortcutControls);

    const fetchWaveform = async () => {
        try {
            const res = await axiosInstance.get(`${BACKEND_URL}/get-waveform/${fileId}`, { responseType: 'blob' })
            const waveformUrl = URL.createObjectURL(res.data)
            setWaveformUrl(waveformUrl)
            setIsPlayerLoaded(true)
        } catch (error) {
            toast.error('Failed to load waveform.')
        }
    }

    useEffect(() => {
        if (!fileId) return
        fetchWaveform()
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
    }, [audioPlayer, getAudioPlayer]);

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

    useEffect(() => {
        const audio = audioPlayer.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            const currentTime = formatTime(audio.currentTime)
            setCurrentTime(currentTime)
            const playedPercentage = (audio.currentTime / audio.duration) * 100
            setCurrentValue(playedPercentage)
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, []);

    return (
        <div className='mb-3 h-1/3 relative overflow-hidden'>
            {!isPlayerLoaded && (
                <div className='absolute inset-0 w-full h-full bg-white z-50 flex justify-center items-center rounded-2xl'>
                    <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                    <span>Loading...</span>
                </div>
            )}
            <div className='h-[45%] bg-white rounded-t-2xl border border-gray-200 border-b-0 overflow-hidden'>
                <div id='waveform' className='relative h-full'>
                    <Image src={waveformUrl} alt='waveform' layout='fill' objectFit='contain' />
                </div>
            </div>
            <div className='h-[55%] bg-white border border-gray-200 rounded-b-2xl px-3'>
                <div className='w-full mt-2'>
                    <audio ref={audioPlayer} className='hidden' src={`/api/editor/get-audio/${fileId}`}></audio>
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

                <div className='flex justify-between items-center mb-2 mt-3'>
                    <span className='text-[#8C8C8C] text-sm w-[100px]'>
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
                                        icon={<Play />}
                                        tooltip='Play'
                                        onClick={shortcutControls.togglePlay}
                                    />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Play</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger>
                                    <PlayerButton
                                        icon={<Pause />}
                                        tooltip='Pause'
                                        onClick={shortcutControls.pause}
                                    />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Pause</p>
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
                        {formatTime(audioDuration)}
                    </span>
                </div>
            </div>
        </div >
    )
}
