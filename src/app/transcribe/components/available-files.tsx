/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import axios, { AxiosError } from 'axios'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { DataTable } from './data-table'
import { determinePwerLevel, getAudioUrl } from './utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
}

interface Props {
  changeTab: (tabName: string) => void
}

export default function AvailableFilesPage({ changeTab }: Props) {
  const [availableFiles, setAvailableFiles] = useState<File[] | null>(null)
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
  const isLegalQCPage = pathname === '/transcribe/legal-qc'

  useEffect(() => {
    const fileId = Object.keys(playing)[0]
    if (!fileId) return
    getAudioUrl({ fileId }).then((url) => {
      if (url) {
        setCurrentlyPlayingFileUrl({ [fileId]: url })
      }
    })
  }, [playing])

  const fetchAvailableFiles = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }
    try {
      const url = isLegalQCPage
        ? `/api/qc/available-files?type=legal`
        : `/api/qc/available-files?type=general`
      const response = await axios.get(url)

      if (response.data) {
        const orders = response.data.map(
          (
            order: {
              pwer: number
              orderTs: string
              id: string
              fileId: string
              File: { filename: string; duration: string }
              status: string
              priority: number
              qc_cost: number
              deliveryTs: string
              highDifficulty: boolean
              orderType: string
              rateBonus: number
              instructions: string | null
              rate: number
            },
            index: number
          ) => {
            const diff = determinePwerLevel(order.pwer)

            const { timeString, dateString } = getFormattedTimeStrings(
              order.orderTs
            )

            return {
              index: index + 1,
              orderId: order.id,
              fileId: order.fileId,
              filename: order.File.filename,
              orderTs: order.orderTs,
              pwer: order.pwer,
              status: order.status,
              priority: order.priority,
              qc_cost: order.qc_cost,
              duration: order.File.duration,
              qc: '-',
              deliveryTs: order.deliveryTs,
              hd: order.highDifficulty,
              orderType: order.orderType,
              rateBonus: order.rateBonus,
              timeString,
              dateString,
              diff,
              rate: order.rate,
              instructions: order.instructions,
            }
          }
        )
        setAvailableFiles(orders ?? [])
        setError(null)
      }
    } catch (err) {
      setError('an error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAvailableFiles(true)
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
            {row.original.status === 'FORMATTED' && (
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
          {loadingFileOrder[row.original.orderId] ? (
            <Button
              disabled
              variant='order'
              className='format-button w-[140px]'
            >
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button
              variant='order'
              className='not-rounded w-[140px]'
              onClick={() =>
                assignmentHandler(row.original.orderId, row.original.orderType)
              }
            >
              Assign to Me
            </Button>
          )}
        </div>
      ),
    },
  ]

  const assignmentHandler = async (id: number, orderType: string) => {
    setLoadingFileOrder((prev) => ({ ...prev, [id]: true }))
    try {
      await axios.post(`/api/qc/assign`, {
        orderId: id,
        orderType,
      })
      toast.success('File assigned successfully')
      changeTab('assigned')
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.error)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Error selecting file`)
      }
    } finally {
      setLoadingFileOrder((prev) => ({ ...prev, [id]: false }))
    }
  }

  return (
    <>
      <DataTable
        data={availableFiles ?? []}
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
