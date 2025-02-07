import {
  Type,
  Volume2,
  TimerReset,
  MousePointer2,
  Gauge,
  Keyboard,
} from 'lucide-react'
import React, { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'

import { updateEditorSettingsAction } from '@/app/actions/editor/settings'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { EditorSettings } from '@/types/editor'

interface SettingItemProps {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
}

const SettingItem = ({
  icon: Icon,
  title,
  description,
  children,
}: SettingItemProps) => (
  <div className='rounded-lg border border-customBorder p-3 flex items-center gap-4'>
    <div className='space-y-1 w-[80%]'>
      <div className='flex items-center gap-2'>
        <div className='flex h-6 w-6 items-center justify-center rounded-md bg-primary/10'>
          <Icon className='h-4 w-4 text-primary' />
        </div>
        <h3 className='font-medium tracking-tight'>{title}</h3>
      </div>
      <p className='text-sm text-muted-foreground'>{description}</p>
    </div>
    <div className='w-[20%] flex items-center justify-end'>{children}</div>
  </div>
)

interface NumberControlProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit?: string
}

const NumberControl = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: NumberControlProps) => (
  <div className='h-9 inline-flex items-center rounded-md border bg-background shadow-sm'>
    <div
      onClick={() => onChange(Math.max(min, value - step))}
      className='flex items-center justify-center cursor-pointer px-2 border-r h-full'
    >
      <span className='sr-only'>Decrease</span>
      <span className='text-sm font-medium text-muted-foreground'>−</span>
    </div>
    <div className='relative flex items-center justify-center pr-2 w-[70px]'>
      <input
        type='number'
        value={value}
        onChange={(e) =>
          onChange(Math.min(max, Math.max(min, Number(e.target.value))))
        }
        className='text-sm rounded-none text-center font-medium focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
        min={min}
        max={max}
        step={step}
      />
      {unit && (
        <span className='text-sm font-medium text-muted-foreground'>
          {unit}
        </span>
      )}
    </div>
    <div
      onClick={() => onChange(Math.min(max, value + step))}
      className='flex items-center justify-center cursor-pointer px-2 border-l h-full'
    >
      <span className='sr-only'>Increase</span>
      <span className='text-sm font-medium text-muted-foreground'>+</span>
    </div>
  </div>
)

interface ToggleControlProps {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

const ToggleControl = ({
  id,
  checked,
  onCheckedChange,
}: ToggleControlProps) => (
  <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
)

interface EditorSettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  initialSettings: EditorSettings
  onSettingsChange: (settings: EditorSettings) => void
}

export default function EditorSettingsDialog({
  isOpen,
  onClose,
  initialSettings,
  onSettingsChange,
}: EditorSettingsDialogProps) {
  const [localSettings, setLocalSettings] =
    useState<EditorSettings>(initialSettings)

  useEffect(() => {
    setLocalSettings(initialSettings)
  }, [initialSettings])

  const hasChanges = useMemo(() => JSON.stringify(localSettings) !== JSON.stringify(initialSettings), [localSettings, initialSettings])

  const handleSave = async () => {
    try {
      const response = await updateEditorSettingsAction(localSettings)
      if (response.success) {
        onSettingsChange(localSettings)
        toast.success('Settings saved successfully')
        onClose()
      } else {
        toast.error(response.error || 'Failed to save settings')
      }
    } catch (error) {
      toast.error('Failed to save settings')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl gap-0 p-0'>
        <DialogHeader className='p-6'>
          <DialogTitle className='text-2xl font-semibold'>Settings</DialogTitle>
        </DialogHeader>

        <ScrollArea className='h-[60vh] px-6'>
          <div className='space-y-4 pb-6'>
            <SettingItem
              icon={Keyboard}
              title='Word Highlighting'
              description='Enable word highlighting to improve focus and accuracy'
            >
              <ToggleControl
                id='wordHighlight'
                checked={localSettings.wordHighlight}
                onCheckedChange={(checked) =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    wordHighlight: checked,
                  }))
                }
              />
            </SettingItem>

            <SettingItem
              icon={Type}
              title='Font Size'
              description='Adjust the size of text in the editor for better readability'
            >
              <NumberControl
                value={localSettings.fontSize}
                onChange={(value) =>
                  setLocalSettings((prev) => ({ ...prev, fontSize: value }))
                }
                min={1}
                max={400}
                unit='px'
              />
            </SettingItem>

            <SettingItem
              icon={TimerReset}
              title='Rewind Duration'
              description='Set how many seconds to rewind when resuming playback'
            >
              <NumberControl
                value={localSettings.audioRewindSeconds}
                onChange={(value) =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    audioRewindSeconds: value,
                  }))
                }
                min={0}
                max={10}
                unit='s'
              />
            </SettingItem>

            <SettingItem
              icon={Volume2}
              title='Volume'
              description='Set the volume level for audio playback'
            >
              <NumberControl
                value={localSettings.volume}
                onChange={(value) =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    volume: value,
                  }))
                }
                min={0}
                max={500}
                step={10}
                unit='%'
              />
            </SettingItem>

            <SettingItem
              icon={Gauge}
              title='Playback Speed'
              description='Adjust the default speed of audio playback'
            >
              <NumberControl
                value={localSettings.playbackSpeed}
                onChange={(value) =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    playbackSpeed: value,
                  }))
                }
                min={10}
                max={300}
                step={10}
                unit='%'
              />
            </SettingItem>

            <SettingItem
              icon={MousePointer2}
              title='Context Menu'
              description='Enable native system context menu instead of custom menu'
            >
              <ToggleControl
                id='contextMenu'
                checked={localSettings.useNativeContextMenu}
                onCheckedChange={(checked) =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    useNativeContextMenu: checked,
                  }))
                }
              />
            </SettingItem>
          </div>
        </ScrollArea>

        <div className='flex items-center justify-end gap-2 border-t bg-muted/20 p-4'>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
