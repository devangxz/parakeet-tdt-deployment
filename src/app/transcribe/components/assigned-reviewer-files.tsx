/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { ChevronDownIcon, ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

import { DataTable } from './data-table'
import { unassignmentHandler } from './unassignmentHandler'
import { determinePwerLevel } from './utils'
import { getAssignedFiles } from '@/app/actions/cf/assigned-files'
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
  cf_cost: number
  cf_rate: number
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
  const pathname = usePathname()
  const isLegalPage = pathname === '/transcribe/legal-cf-reviewer'

  useEffect(() => {
    const fileId = Object.keys(playing)[0]
    if (!fileId) return
    setCurrentlyPlayingFileUrl({ [fileId]: `/api/editor/get-audio/${fileId}` })
  }, [playing])

  const fetchFiles = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }
    try {
      const type = isLegalPage ? 'legal' : 'general'
      const response = await getAssignedFiles(type)

      if (!response.success) {
        throw new Error('An error occurred')
      }

      if (response.data) {
        const orders = response.data.map((assignment: any, index: number) => {
          const diff = determinePwerLevel(assignment.order.pwer)

          const { timeString, dateString } = getFormattedTimeStrings(
            assignment.acceptedTs
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
            cf_cost: assignment.order.cf_cost,
            duration: assignment.order.File.duration,
            qc: '-',
            deliveryTs: assignment.order.deliveryTs,
            hd: assignment.order.highDifficulty,
            orderType: assignment.order.orderType,
            rateBonus: assignment.order.rateBonus,
            timeString,
            dateString,
            diff,
            rate: assignment.order.cf_rate,
            instructions: assignment.order.instructions,
          }
        })
        setAssginedFiles((orders as any) ?? [])
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
            ${row.original.cf_cost.toFixed(2)} (
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
        <div className='flex items-center gap-4'>
          <Button
            variant='order'
            className='w-[140px] format-button'
            onClick={() => {
              window.open(`/editor/${row.original.fileId}`, '_blank')
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
                  window.open(
                    `/editor/${row.original.fileId}`,
                    '_blank',
                    'toolbar=no,location=no,menubar=no,width=' +
                      window.screen.width +
                      ',height=' +
                      window.screen.height +
                      ',left=0,top=0'
                  )
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
                  onClick={() =>
                    unassignmentHandler({
                      id: row.original.orderId,
                      setLoadingFileOrder,
                      changeTab,
                      type: 'CF',
                    })
                  }
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
    </>
  )
}
