import { ReloadIcon } from '@radix-ui/react-icons'
import { format, formatDistanceToNow } from 'date-fns'
import React, { useState, useEffect } from 'react'
import ReactQuill from 'react-quill'
import { toast } from 'sonner'

import { fileCacheTokenAction } from '@/app/actions/auth/file-cache-token'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FILE_CACHE_URL } from '@/constants'
import { updateTranscript } from '@/utils/editorUtils'

interface Version {
  commitHash: string
  timestamp: string
  message: string
}

const RestoreVersionDialog = ({
  isOpen,
  onClose,
  fileId,
  quillRef,
}: {
  isOpen: boolean
  onClose: () => void
  fileId: string
  quillRef: React.RefObject<ReactQuill> | undefined
}) => {
  const [versions, setVersions] = useState<Version[]>([])
  const [selectedVersion, setSelectedVersion] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)
  const [isFetchingVersions, setIsFetchingVersions] = useState(false)

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        setIsFetchingVersions(true)
        const tokenRes = await fileCacheTokenAction()
        const res = await fetch(
          `${FILE_CACHE_URL}/get-user-versions/${fileId}`,
          {
            headers: { Authorization: `Bearer ${tokenRes.token}` },
          }
        )
        const data = await res.json()
        if (data.success) {
          setVersions(data.versions)
        }
      } catch (error) {
        setVersions([])
      } finally {
        setIsFetchingVersions(false)
      }
    }

    if (isOpen) {
      fetchVersions()
    }
  }, [isOpen, fileId])

  const handleRestore = async () => {
    try {
      setIsRestoring(true)
      const tokenRes = await fileCacheTokenAction()
      const res = await fetch(
        `${FILE_CACHE_URL}/rollback/${fileId}/${selectedVersion}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokenRes.token}` },
        }
      )
      const data = await res.json()
      if (data.success) {
        updateTranscript(quillRef, data.transcript)
        toast.success('Version restored successfully')
      } else {
        toast.error('Failed to restore version. Please try again.')
      }
    } catch (error) {
      toast.error('Failed to restore version. Please try again.')
    } finally {
      setIsRestoring(false)
      setSelectedVersion('')
      onClose()
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {
        setSelectedVersion('')
        onClose()
      }}
    >
      <DialogContent className='p-0 gap-0'>
        <DialogHeader className='p-4'>
          <DialogTitle>Restore Version</DialogTitle>
          <DialogDescription>
            Select a previous version to restore. This will replace your current
            changes.
          </DialogDescription>
        </DialogHeader>

        <div className='m-4 mt-1 rounded-md border'>
          {isFetchingVersions ? (
            <div className='flex justify-center items-center py-4'>
              <ReloadIcon className='h-4 w-4 animate-spin' />
              <span className='ml-2 text-sm text-muted-foreground'>Getting version history...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className='flex justify-center items-center p-4 text-sm text-muted-foreground'>
              No versions found
            </div>
          ) : (
            <RadioGroup
              value={selectedVersion}
              onValueChange={setSelectedVersion}
              className='p-4'
            >
              <div className='space-y-5'>
                {versions.map((version) => (
                  <div
                    key={version.commitHash}
                    className='flex flex-col'
                  >
                    <div className='flex items-center space-x-2'>
                      <RadioGroupItem
                        value={version.commitHash}
                        id={version.commitHash}
                      />
                      <Label
                        htmlFor={version.commitHash}
                        className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                      >
                        {format(new Date(version.timestamp), 'MMMM d, h:mm a')}
                      </Label>
                    </div>
                    <div className='pl-6'>
                      <span className='text-xs text-muted-foreground'>
                        {formatDistanceToNow(new Date(version.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}
        </div>

        <div className='flex justify-end items-center gap-x-2 m-4 mt-1'>
          <Button
            variant='outline'
            onClick={() => {
              setSelectedVersion('')
              onClose()
            }}
          >
            Close
          </Button>
          <Button
            onClick={handleRestore}
            disabled={
              isRestoring || isFetchingVersions || versions.length === 0
            }
          >
            {isRestoring && (
              <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
            )}
            Restore
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RestoreVersionDialog
