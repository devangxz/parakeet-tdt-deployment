'use client'

import { useEffect, useRef, createContext, useContext, useState } from 'react'

import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { PlaybackButton } from '@/components/admin-components/playback-button'
import Waveform from '@/components/editor/Waveform'

// Create a context to manage which file is currently playing
interface AudioContextType {
  playingFile: string | null;
  setPlayingFile: (fileId: string | null) => void;
}

const AudioContext = createContext<AudioContextType>({
  playingFile: null,
  setPlayingFile: () => {},
});

export const AudioProvider = ({ children }: { children: React.ReactNode }) => {
  const [playingFile, setPlayingFile] = useState<string | null>(null);
  
  return (
    <AudioContext.Provider value={{ playingFile, setPlayingFile }}>
      {children}
    </AudioContext.Provider>
  );
};

// Row Play Button Component
interface RowPlayButtonProps {
  fileId: string;
  isLoading?: boolean;
}

export function RowPlayButton({ fileId, isLoading = false }: RowPlayButtonProps) {
  const { playingFile, setPlayingFile } = useContext(AudioContext);
  const isPlaying = playingFile === fileId;
  
  const togglePlayback = () => {
    if (isPlaying) {
      setPlayingFile(null);
    } else {
      setPlayingFile(fileId);
    }
  };
  
  return (
    <PlaybackButton
      isPlaying={isPlaying}
      isLoading={isLoading}
      onClick={togglePlayback}
      className=""
    />
  );
}

// Modified AudioWaveformPlayer Component
interface AudioWaveformPlayerProps {
  fileId: string;
  waveformUrl: string;
  duration: number;
}

export default function AudioWaveformPlayer({
  fileId,
  waveformUrl,
  duration,
}: AudioWaveformPlayerProps) {
  const { playingFile, setPlayingFile } = useContext(AudioContext);
  const isPlaying = playingFile === fileId;
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load audio URL when needed
  useEffect(() => {
    if (isPlaying && !audioUrl) {
      getSignedUrlAction(`${fileId}.mp3`, 3600).then((res) => {
        if (res.success && res.signedUrl) {
          setAudioUrl(res.signedUrl);
        }
      });
    }
  }, [fileId, isPlaying, audioUrl]);

  // Handle play/pause when audio URL changes or play state changes
  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.error('Failed to play audio:', err);
        setPlayingFile(null);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, audioUrl, setPlayingFile]);

  // Reset playing state when audio ends
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setPlayingFile(null);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [setPlayingFile]);

  return (
    <div className="w-full cursor-pointer flex flex-col gap-2 relative">
      <audio ref={audioRef} src={audioUrl || undefined} />
      <div className="w-full h-full border rounded-md z-50">
        <Waveform
          waveformUrl={waveformUrl}
          audioDuration={duration}
          audioPlayer={audioRef}
          isScreenMode={true}
          showCurrentTimeLabel={true}
          showDurationLabel={true}
          onClick={(e, time) => {
            if (audioRef.current) {
              audioRef.current.currentTime = time;
              if (!isPlaying) {
                setPlayingFile(fileId);
              }
            }
          }}
        />
      </div>
    </div>
  );
}