/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { ChevronDownIcon, ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { DataTable } from './data-table'
import { unassignmentHandler } from './unassignmentHandler'
import { determinePwerLevel } from './utils'
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { getAssignedQCFiles } from '@/app/actions/qc/assigned-files'
import { CancellationModal } from '@/components/cancellation-modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import FileAudioPlayer from '@/components/utils/FileAudioPlayer'
import { BaseTranscriberFile } from '@/types/files'
import formatDuration from '@/utils/formatDuration'
import { getFormattedTimeStrings } from '@/utils/getFormattedTimeStrings'

interface File extends BaseTranscriberFile {
  qc_cost: number
  jobType: string
  orgName: string
  testFile: boolean
  containsMp4: boolean
  customFormatOption: string
}

interface Props {
  changeTab: (tabName: string) => void
}

export default function AssignedFilesPage({ changeTab }: Props) {
  const [assignedFiles, setAssginedFiles] = useState<File[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState<Record<string, boolean>>({})
  const [currentlyPlayingFileUrl, setCurrentlyPlayingFileUrl] = useState<{
    [key: string]: string
  }>({})
  const [loadingFileOrder, setLoadingFileOrder] = useState<
    Record<string, boolean>
  >({})
  const [showCancellationModal, setShowCancellationModal] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const pathname = usePathname()
  const isLegalQCPage = pathname === '/transcribe/legal-qc'

  const handleCancellation = (reason: string, comment: string) => {
    if (selectedOrderId) {
      unassignmentHandler({
        id: selectedOrderId,
        setLoadingFileOrder,
        changeTab,
        type: 'QC',
        reason,
        comment,
      })
      setShowCancellationModal(false)
      setSelectedOrderId(null)
    }
  }

  const setAudioUrl = async () => {
    const fileId = Object.keys(playing)[0]
    if (!fileId) return
    const res = await getSignedUrlAction(`${fileId}.mp3`, 3600)
    if (res.success && res.signedUrl) {
      setCurrentlyPlayingFileUrl({ [fileId]: res.signedUrl })
    }
  }

  useEffect(() => {
    setAudioUrl()
  }, [playing])

  const fetchFiles = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }
    try {
      const type = isLegalQCPage ? 'legal' : 'general'
      const response = await getAssignedQCFiles(type)

      if (!response.success) {
        throw new Error(response.error)
      }

      if (response.data) {
        const orders = response.data.map((assignment: any, index: number) => {
          const diff = determinePwerLevel(assignment.order.pwer)

          const { timeString, dateString } = getFormattedTimeStrings(
            assignment.acceptedTs?.toISOString()
          )

          return {
            index: index + 1,
            orderId: assignment.order.id,
            fileId: assignment.order.fileId,
            filename: assignment.order.File.filename,
            orderTs: assignment.order.orderTs,
            pwer: assignment.order.pwer,
            status: assignment.order.status,
            priority: assignment.order.priority,
            qc_cost: assignment.order.qc_cost,
            duration: assignment.order.File.duration,
            qc: '-',
            deliveryTs: assignment.order.deliveryTs,
            hd: assignment.order.highDifficulty,
            orderType: assignment.order.orderType,
            rateBonus: assignment.order.rateBonus,
            timeString,
            dateString,
            diff,
            rate: assignment.order.rate,
            instructions: assignment.order.instructions,
            jobType: assignment.type,
            orgName: assignment.order.orgName,
            testFile: assignment.order.isTestCustomer,
            containsMp4:
              assignment.order.File.fileKey?.split('.').pop().toLowerCase() ===
              'mp4',
            customFormatOption: assignment.order.customFormatOption,
          }
        })
        setAssginedFiles(orders ?? [])
        setError(null)
      }
    } catch (err) {
      setError('an error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles(true)
  }, [])

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
        }}
      >
        <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
        <p>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '20vh',
        }}
      >
        <p>An Error Occured</p>
      </div>
    )
  }

  const columns: ColumnDef<File>[] = [
    {
      accessorKey: 'index',
      header: 'Audio',
      cell: ({ row }) => (
        <div className='font-medium flex items-center gap-5'>
          <FileAudioPlayer
            fileId={row.original.fileId}
            playing={playing}
            setPlaying={setPlaying}
            url={currentlyPlayingFileUrl[row.original.fileId]}
          />
        </div>
      ),
    },
    {
      accessorKey: 'id',
      header: 'Details',
      cell: ({ row }) => (
        <div>
          <div className='mb-2 font-medium'>{row.original.fileId}</div>
          <div className='mb-2 font-medium'>{row.original.filename}</div>
          <div className='flex gap-2'>
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  variant='outline'
                  className='font-semibold text-[10px] text-green-600'
                >
                  {row.original.diff}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Difficulty</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  variant='outline'
                  className='font-semibold text-[10px] text-blue-800'
                >
                  GB, NA
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Spellings</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  variant='outline'
                  className='font-semibold text-[10px] text-green-600'
                >
                  {row.original.pwer ? row.original.pwer.toFixed(2) : '-'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>PWER</p>
              </TooltipContent>
            </Tooltip>
            {row.original.priority === 1 && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant='outline'
                    className='font-semibold text-[10px] text-green-600'
                  >
                    PRIORITY
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Priority File</p>
                </TooltipContent>
              </Tooltip>
            )}
            {row.original.jobType === 'REVIEW' && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant='outline'
                    className='font-semibold text-[10px] text-green-600'
                  >
                    CF
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Custom Formatting</p>
                </TooltipContent>
              </Tooltip>
            )}
            {row.original.orgName.length > 0 && (
              <Badge
                variant='outline'
                className='font-semibold text-[10px] text-green-600'
              >
                {row.original.orgName}
              </Badge>
            )}
            {row.original.customFormatOption.length > 0 && (
              <Badge
                variant='outline'
                className='font-semibold text-[10px] text-green-600'
              >
                {row.original.customFormatOption}
              </Badge>
            )}
            {row.original.testFile && (
              <Badge
                variant='outline'
                className='font-semibold text-[10px] text-green-600'
              >
                Test File
              </Badge>
            )}
            {row.original.containsMp4 && (
              <Badge
                variant='outline'
                className='font-semibold text-[10px] text-green-600'
              >
                Contains Video
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'duration',
      header: 'Price/Duration',
      cell: ({ row }) => (
        <div>
          <p>
            ${row.original.qc_cost.toFixed(2)} (
            {formatDuration(row.getValue('duration'))})
          </p>
          <p>
            (${row.original.rate}/ah + ${row.original.rateBonus}/ah)
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Date',
      cell: ({ row }) => (
        <div>
          <p>{row.original.timeString},</p>
          <p>{row.original.dateString}</p>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableHiding: false,
      cell: ({ row }) => (
        <div className='flex items-center'>
          <Button
            variant='order'
            className='w-[140px] format-button'
            onClick={() => {
              if (
                row.original.status === 'QC_COMPLETED' &&
                row.original.jobType === 'REVIEW'
              ) {
                toast.error(
                  'LLM formatting is currently processing this file. Please wait for a while before starting the file.'
                )
              } else {
                window.open(`/editor/${row.original.fileId}`, '_blank')
              }
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
              <DropdownMenuItem
                onClick={() => {
                  if (
                    row.original.status === 'QC_COMPLETED' &&
                    row.original.jobType === 'REVIEW'
                  ) {
                    toast.error(
                      'LLM formatting is currently processing this file. Please wait for a while before starting the file.'
                    )
                  } else {
                    window.open(
                      `/editor/${row.original.fileId}`,
                      '_blank',
                      'toolbar=no,location=no,menubar=no,width=' +
                        window.screen.width +
                        ',height=' +
                        window.screen.height +
                        ',left=0,top=0'
                    )
                  }
                }}
              >
                Open in new window
              </DropdownMenuItem>

              {loadingFileOrder[row.original.orderId] ? (
                <DropdownMenuItem disabled>
                  Please wait
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className='text-destructive'
                  onClick={() => {
                    setSelectedOrderId(row.original.orderId)
                    setShowCancellationModal(true)
                  }}
                >
                  Cancel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable
        data={assignedFiles ?? []}
        columns={columns}
        renderRowSubComponent={({ row }: { row: any }) =>
          row.original.instructions ? (
            <div className='p-2'>
              <strong>Customer Instructions:</strong>
              <p>{row.original.instructions}</p>
            </div>
          ) : null
        }
      />
      <CancellationModal
        isOpen={showCancellationModal}
        onClose={() => {
          setShowCancellationModal(false)
          setSelectedOrderId(null)
        }}
        onConfirm={handleCancellation}
      />
    </>
  )
}
