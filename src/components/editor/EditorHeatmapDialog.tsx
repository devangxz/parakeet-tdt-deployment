import React from 'react'

import WaveformHeatmap from './WaveformHeatmap'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

interface EditorHeatmapDialogProps {
    isOpen: boolean
    onClose: () => void
    waveformUrl: string
    listenCount: number[]
    editedSegments: Set<number>
    duration: number
}

export default function EditorHeatmapDialog({
    isOpen,
    onClose,
    waveformUrl,
    listenCount,
    editedSegments,
    duration,
}: EditorHeatmapDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className='max-w-4xl'>
                <DialogHeader>
                    <DialogTitle>Waveform Heatmap</DialogTitle>
                </DialogHeader>
                <div className='py-4'>
                    <p className='text-sm text-gray-500 mb-2'>
                        Audio Playback Coverage
                    </p>
                    <WaveformHeatmap
                        waveformUrl={waveformUrl}
                        listenCount={listenCount}
                        editedSegments={editedSegments}
                        duration={duration}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}
