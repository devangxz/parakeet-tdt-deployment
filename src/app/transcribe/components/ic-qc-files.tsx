/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { DataTable } from './data-table'
import { determinePwerLevel } from './utils'
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { assignQC } from '@/app/actions/qc/assign'
import { getICQCFiles } from '@/app/actions/qc/ic-qc-files'
import { Alert, AlertTitle } from '@/components/ui/alert'
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
  orgName: string
  testFile: boolean
  containsMp4: boolean
  customFormatOption: string
  icqcCategory: string
  accentCode: string
}

interface Props {
  changeTab: (tabName: string) => void
}

export default function ICQCFilesPage({ changeTab }: Props) {
  const [icqcFiles, setIcqcFiles] = useState<File[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState<Record<string, boolean>>({})
  const [currentlyPlayingFileUrl, setCurrentlyPlayingFileUrl] = useState<{
    [key: string]: string
  }>({})
  const [isQCDisabled, setIsQCDisabled] = useState(false)
  const [loadingFileOrder, setLoadingFileOrder] = useState<
    Record<string, boolean>
  >({})

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

  const fetchICQCFiles = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }
    try {
      const response = await getICQCFiles()

      if (!response.success) {
        throw new Error(response.error || 'An error occurred')
      }

      if (response?.isQCDisabled) {
        setIsQCDisabled(true)
      }

      if (response.data) {
        const orders = response.data.map((order: any, index: number) => {
          const diff = determinePwerLevel(order.pwer)

          const { timeString, dateString } = getFormattedTimeStrings(
            order.orderTs.toISOString()
          )
          console.log(order.accentCode)
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
            orgName: order.orgName,
            testFile: order.isTestCustomer,
            containsMp4:
              order.File.fileKey?.split('.').pop().toLowerCase() === 'mp4',
            customFormatOption: order.customFormatOption,
            icqcCategory: order.icqcCategory,
            accentCode: order.accentCode,
          }
        })
        setIcqcFiles(orders ?? [])
        setError(null)
      }
    } catch (err) {
      setError('an error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchICQCFiles(true)
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
        <p>An Error Occurred</p>
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
      accessorKey: 'fileId',
      header: 'Details',
      cell: ({ row }) => (
        <div>
          <div className='mb-2 font-medium'>{row.original.fileId}</div>
          <div className='mb-2 font-medium'>{row.original.filename}</div>
          <div className='flex flex-wrap gap-2 mb-2'>
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
            {row.original.accentCode && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant='outline'
                    className='font-semibold text-[10px] text-green-600'
                  >
                    {row.original.accentCode}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Accent</p>
                </TooltipContent>
              </Tooltip>
            )}
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
          <Badge
            variant='outline'
            className='font-semibold text-[10px] text-orange-600'
          >
            {row.original.icqcCategory}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: 'icqcCategory',
      header: 'Category',
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'orgName',
      header: 'Organization',
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'diff',
      header: 'Difficulty',
      filterFn: (row, id, filterValues: string[]) => {
        const diffVal = row.getValue(id) as string
        if (!filterValues || filterValues.length === 0) return true
        return filterValues.includes(diffVal)
      },
      enableHiding: true,
    },
    {
      accessorKey: 'duration',
      header: 'Price/Duration',
      filterFn: (row, id, filterValues: string[]) => {
        const duration = row.getValue(id) as number
        if (!filterValues || filterValues.length === 0) return true
        if (filterValues.includes('lt2') && duration < 7200) return true
        if (
          filterValues.includes('2to3') &&
          duration >= 7200 &&
          duration < 10800
        )
          return true
        if (filterValues.includes('gt3') && duration >= 10800) return true
        return false
      },
      meta: {
        filterOptions: [
          { label: '<2 hours', value: 'lt2' },
          { label: '2-3 hours', value: '2to3' },
          { label: '>3 hours', value: 'gt3' },
        ],
      },
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
      accessorKey: 'timeString',
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
              onClick={() => assignmentHandler(row.original.orderId)}
            >
              Assign to Me
            </Button>
          )}
        </div>
      ),
    },
  ]

  const assignmentHandler = async (id: number) => {
    setLoadingFileOrder((prev) => ({ ...prev, [id]: true }))
    try {
      const response = await assignQC(id, true) // Pass true for isICQC
      if (!response.success) {
        throw new Error(response.error)
      }
      toast.success('File assigned successfully')
      changeTab('assigned')
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Error selecting file')
      }
    } finally {
      setLoadingFileOrder((prev) => ({ ...prev, [id]: false }))
    }
  }

  return (
    <>
      {isQCDisabled ? (
        <div className='mb-4 mt-4'>
          <Alert variant='destructive'>
            <AlertTitle>
              QC is disabled for you. Please wait till the new test system roll
              out.
            </AlertTitle>
          </Alert>
        </div>
      ) : (
        <DataTable
          showToolbar={true}
          data={icqcFiles ?? []}
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
      )}
    </>
  )
}
