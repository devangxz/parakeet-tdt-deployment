'use client'

import { Pause, Play } from 'lucide-react'
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'

const FileAudioPlayer = ({
  fileId,
  playing,
  setPlaying,
  url,
}: {
  fileId: string
  playing: Record<string, boolean>
  setPlaying: Dispatch<SetStateAction<Record<string, boolean>>>
  url: string
}) => {
  const [isAudioPlaying, setIsAudioPlaying] = useState(playing[fileId] || false)

  const toggleAudio = async (fileId: string) => {
    if (isAudioPlaying) {
      setPlaying({})
    } else {
      setPlaying({ [fileId]: true })
    }
  }

  useEffect(() => {
    setIsAudioPlaying(playing[fileId])
  }, [playing])

  return (
    <button
      onClick={() => toggleAudio(fileId)}
      className='rounded-full border p-1.5 text-primary'
    >
      {!isAudioPlaying && <Play className='h-4 w-4' />}
      {isAudioPlaying && <Pause className='h-4 w-4' />}
      {isAudioPlaying && (
        <audio src={url} autoPlay id='audio-player' className='hidden'></audio>
      )}
    </button>
  )
}

export default FileAudioPlayer
