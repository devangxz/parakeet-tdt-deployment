'use client'

import { useState, KeyboardEvent } from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import {
  formatShortcutKey,
  formatAction,
} from '@/components/editor/ShortcutsReferenceDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import DefaultShortcuts from '@/utils/editorAudioPlayerShortcuts'

interface ConfigureShortcutsDialogProps {
  isConfigureShortcutsModalOpen: boolean
  setIsConfigureShortcutsModalOpen: React.Dispatch<
    React.SetStateAction<boolean>
  >
  shortcuts: {
    key: string
    shortcut: string
  }[]
  updateShortcut: (
    action: keyof DefaultShortcuts,
    newShortcut: string
  ) => void
}

const ConfigureShortcutsDialog = ({
  isConfigureShortcutsModalOpen,
  setIsConfigureShortcutsModalOpen,
  shortcuts,
  updateShortcut,
}: ConfigureShortcutsDialogProps) => {
  const [selectedAction, setSelectedAction] = useState<
    keyof DefaultShortcuts | ''
  >('')
  const [newShortcut, setNewShortcut] = useState<string>('')
  const [shortcutInputError, setShortcutInputError] = useState<string | null>(
    null
  )

  const handleConfigureShortcutKeyDown = (
    e: KeyboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault()

    const { key, ctrlKey, shiftKey, altKey, metaKey } = e

    const keyMap: { [key: string]: string } = {
      ctrl: 'Control',
      arrowup: 'ArrowUp',
      arrowdown: 'ArrowDown',
      arrowleft: 'ArrowLeft',
      arrowright: 'ArrowRight',
    }

    const combination = []
    if (ctrlKey) combination.push('Control')
    if (shiftKey) combination.push('Shift')
    if (altKey) combination.push('Alt')
    if (metaKey) combination.push('Command')
    if (
      key !== 'Control' &&
      key !== 'Shift' &&
      key !== 'Alt' &&
      key !== 'Meta'
    ) {
      combination.push(keyMap[key.toLowerCase()] || key)
    }

    const shortcut = combination
      .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
      .join('+')

    // Check if shortcut is already assigned
    const existingAction = shortcuts.find(
      (item) => item.shortcut === shortcut && item.key !== selectedAction
    )

    if (existingAction) {
      setShortcutInputError(
        `The shortcut is currently assigned to "${formatAction(
          existingAction.key
        )}". Proceeding will reassign it to the new action.`
      )
    } else {
      setShortcutInputError(null)
    }

    setNewShortcut(shortcut)
  }

  const handleConfigureShortcutSave = () => {
    if (selectedAction === '' || newShortcut === '') {
      toast.error(
        selectedAction === ''
          ? 'Please select an action'
          : 'Please enter a shortcut'
      )
      return
    }

    // Find any existing action using this shortcut
    const existingAction = shortcuts.find(
      (item) => item.shortcut === newShortcut
    )
    if (existingAction) {
      // Remove shortcut from the existing action
      updateShortcut(existingAction.key as keyof DefaultShortcuts, '')
    }

    updateShortcut(selectedAction, newShortcut)
    setIsConfigureShortcutsModalOpen(false)
    setSelectedAction('')
    setNewShortcut('')
    setShortcutInputError(null)
    toast.success(
      `Shortcut for "${String(
        selectedAction
      )}" successfully configured to "${formatShortcutKey(newShortcut)}"`
    )
  }

  return (
    <Dialog
      open={isConfigureShortcutsModalOpen}
      onOpenChange={setIsConfigureShortcutsModalOpen}
    >
      <DialogContent className='p-0 gap-0'>
        <DialogHeader className='p-4'>
          <DialogTitle>Configure Shortcuts</DialogTitle>
          <DialogDescription>Configure all your shortcuts.</DialogDescription>
        </DialogHeader>
        <div className='p-4 pt-1 space-y-4'>
          <Select
            value={selectedAction}
            onValueChange={(value: string) =>
              setSelectedAction(value as keyof DefaultShortcuts)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder='Select an action' />
            </SelectTrigger>
            <SelectContent
              position='popper'
              sideOffset={5}
              className='max-h-[300px] overflow-y-auto'
            >
              <SelectGroup>
                <SelectLabel>Actions</SelectLabel>
                {shortcuts.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {formatAction(item.key)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className='space-y-2'>
            <Input
              value={formatShortcutKey(newShortcut)}
              onKeyDown={handleConfigureShortcutKeyDown}
              type='text'
              data-shortcut-input='true'
              placeholder='Enter a shortcut'
              className={cn(
                shortcutInputError &&
                  'border-destructive focus-visible:ring-destructive'
              )}
            />
            {shortcutInputError && (
              <p className='text-sm text-destructive'>{shortcutInputError}</p>
            )}
          </div>
          <Button onClick={handleConfigureShortcutSave} className='w-full'>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ConfigureShortcutsDialog
