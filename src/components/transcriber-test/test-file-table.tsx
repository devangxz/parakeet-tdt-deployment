/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { ReloadIcon, ChevronDownIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { cancelTest } from '@/app/actions/transcriber/cancel-test'
import { startTest } from '@/app/actions/transcriber/start-test'
import { DataTable } from '@/app/transcribe/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import FileAudioPlayer from '@/components/utils/FileAudioPlayer'
import formatDuration from '@/utils/formatDuration'
import { getFormattedTimeStrings } from '@/utils/getFormattedTimeStrings'

import type {
  TestFile,
  TestAttempt,
} from '@/app/actions/transcriber/get-test-files'

interface TestFileTableProps {
  files: TestFile[] | TestAttempt[]
  userId: number
  type: 'available' | 'assigned' | 'history'
  onTestStarted?: () => void
}

export function TestFileTable({
  files,
  userId,
  type,
  onTestStarted,
}: TestFileTableProps) {
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [playing, setPlaying] = useState<Record<string, boolean>>({})
  const [currentlyPlayingFileUrl, setCurrentlyPlayingFileUrl] = useState<{
    [key: string]: string
  }>({})
  const [showCancellationModal, setShowCancellationModal] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const router = useRouter()

  const setAudioUrl = async (fileId: string) => {
    try {
      const res = await getSignedUrlAction(`${fileId}.mp3`, 3600)
      if (res.success && res.signedUrl) {
        setCurrentlyPlayingFileUrl({ [fileId]: res.signedUrl })
      }
    } catch (error) {
      console.error('Failed to get audio URL', error)
    }
  }

  const handleStartTest = async (fileId: string) => {
    try {
      setLoading((prev) => ({ ...prev, [fileId]: true }))

      const response = await startTest(userId, fileId)

      if (response.success) {
        router.refresh()
        toast.success('Test started')
        if (onTestStarted) {
          onTestStarted()
        }
      } else {
        toast.error(response.error || 'Failed to start test')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setLoading((prev) => ({ ...prev, [fileId]: false }))
    }
  }

  const handleCancelTest = async () => {
    if (!selectedOrderId) return

    try {
      setLoading((prev) => ({ ...prev, [`cancel-${selectedOrderId}`]: true }))

      const response = await cancelTest(userId, selectedOrderId)

      if (response.success) {
        toast.success('Test cancelled')
        router.refresh()
      } else {
        toast.error(response.error || 'Failed to cancel test')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setLoading((prev) => ({ ...prev, [`cancel-${selectedOrderId}`]: false }))
      setShowCancellationModal(false)
      setSelectedOrderId(null)
    }
  }

  const getColumns = (): ColumnDef<any>[] => {
    const baseColumns: ColumnDef<any>[] = [
      {
        accessorKey: 'audio',
        header: 'Audio',
        cell: ({ row }) => {
          const fileId = row.original.fileId
          return (
            <div className='font-medium flex items-center gap-5'>
              <FileAudioPlayer
                fileId={fileId}
                playing={playing}
                setPlaying={(state) => {
                  setPlaying(state)
                  if (Object.keys(state).length > 0) {
                    setAudioUrl(fileId)
                  }
                }}
                url={currentlyPlayingFileUrl[fileId]}
              />
            </div>
          )
        },
      },
      {
        accessorKey: 'details',
        header: 'Details',
        cell: ({ row }) => {
          const file = row.original

          return (
            <div>
              <div className='mb-2 font-medium'>{file.filename}</div>
            </div>
          )
        },
      },
      {
        accessorKey: 'duration',
        header: 'Duration',
        cell: ({ row }) => <div>{formatDuration(row.original.duration)}</div>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ row }) => {
          const date = new Date(
            row.original.completedAt || row.original.createdAt
          )
          const { timeString, dateString } = getFormattedTimeStrings(
            date.toISOString()
          )
          return (
            <div>
              <p>{timeString},</p>
              <p>{dateString}</p>
            </div>
          )
        },
      },
    ]

    if (type === 'available') {
      baseColumns.push({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const fileId = row.original.fileId
          return (
            <div className='flex items-center'>
              {loading[fileId] ? (
                <Button
                  disabled
                  variant='order'
                  className='format-button w-[140px]'
                >
                  Please wait
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                </Button>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant='order'
                        className='w-[140px] not-rounded'
                        onClick={() => handleStartTest(fileId)}
                      >
                        Start Test
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Start working on this test file</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )
        },
      })
    }
    if (type === 'assigned') {
      baseColumns.push({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const fileId = row.original.fileId
          const orderId = row.original.id
          return (
            <div className='flex items-center'>
              <Button
                variant='order'
                className='w-[140px] format-button'
                onClick={() => {
                  window.open(`/editor/${fileId}`, '_blank')
                }}
              >
                Open in new tab
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='order'
                    className='h-9 w-8 p-0 format-icon-button'
                  >
                    <span className='sr-only'>Open menu</span>
                    <ChevronDownIcon className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  {loading[`cancel-${orderId}`] ? (
                    <DropdownMenuItem disabled>
                      Please wait
                      <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className='text-destructive'
                      onClick={() => {
                        setSelectedOrderId(orderId)
                        setShowCancellationModal(true)
                      }}
                    >
                      Cancel
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      })
    }

    if (type === 'history') {
      baseColumns.push(
        {
          id: 'score',
          header: 'Score',
          cell: ({ row }) => <div>{row.original.score}</div>,
        },
        {
          id: 'result',
          header: 'Result',
          cell: ({ row }) => (
            <div>
              <Badge
                variant={row.original.passed ? 'secondary' : 'destructive'}
                className={`font-semibold text-[10px] ${
                  row.original.passed ? 'bg-green-100 text-green-800' : ''
                }`}
              >
                {row.original.passed ? 'Passed' : 'Failed'}
              </Badge>
            </div>
          ),
        }
      )
    }

    return baseColumns
  }

  const columns = getColumns()

  return (
    <>
      <DataTable showToolbar={false} data={files} columns={columns} />

      <Dialog
        open={showCancellationModal}
        onOpenChange={setShowCancellationModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Test Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this test? This will mark the test
              as failed and count towards your attempt limit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='secondary'
              onClick={() => setShowCancellationModal(false)}
            >
              No, keep assignment
            </Button>
            <Button
              variant='destructive'
              onClick={handleCancelTest}
              disabled={loading[`cancel-${selectedOrderId}`]}
            >
              {loading[`cancel-${selectedOrderId}`] ? (
                <>
                  Please wait
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                </>
              ) : (
                'Yes, cancel test'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
