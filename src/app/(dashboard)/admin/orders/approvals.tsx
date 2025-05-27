'use client'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'

import { DataTable } from './components/data-table'
import QCLink from './components/qc-link'
import { ApprovalsTableFilters } from './page'
import { getListenCountAndEditedSegmentAction } from '@/app/actions/admin/get-listen-count-and-edited-segment'
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { fetchApprovalOrders } from '@/app/actions/om/fetch-approval-orders'
import AcceptRejectApprovalFileDialog from '@/components/admin-components/accept-reject-approval'
import OpenDiffDialog from '@/components/admin-components/diff-dialog'
import ReassignApprovalFile from '@/components/admin-components/re-assign-approval-file'
import WaveformHeatmap from '@/components/editor/WaveformHeatmap'
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
import { HIGH_PWER, LOW_PWER, QC_VALIDATION } from '@/constants'
import { QCValidation } from '@/types/editor'
import { FileCost } from '@/types/files'
import formatDateTime from '@/utils/formatDateTime'
import formatDuration from '@/utils/formatDuration'

interface File {
  index: number
  orderId: number
  fileId: string
  filename: string
  orderTs: string
  pwer: number
  status: string
  priority: number
  duration: number
  qc: { name: string; email: string; id: string }[]
  deliveryTs: string
  hd: boolean
  fileCost: FileCost
  rateBonus: number
  type: string
  transcriberWatch: boolean
  customerWatch: boolean
  qcValidationStats?: QCValidation
}

interface PaginationMeta {
  totalCount: number
  pageCount: number
  currentPage: number
  pageSize: number
}

interface CachedData {
  [key: string]: {
    data: File[]
    pagination: PaginationMeta
  }
}

interface ApprovalPageProps {
  onActionComplete?: () => Promise<void>
  initialFilters?: ApprovalsTableFilters
  onFiltersChange?: (filters: ApprovalsTableFilters) => void
}

export default function ApprovalPage({ onActionComplete, initialFilters, onFiltersChange }: ApprovalPageProps) {
  const [approvalFiles, setApprovalFiles] = useState<File[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string>('')
  const [openDialog, setOpenDialog] = useState(false)
  const [openReassignDialog, setOpenReassignDialog] = useState(false)
  const [isAccept, setIsAccept] = useState(true)
  const [diffDialogOpen, setDiffDialogOpen] = useState(false)
  const [fileId, setFileId] = useState('')
  const [playing, setPlaying] = useState<Record<string, boolean>>({})
  const audioPlayer = useRef<HTMLAudioElement>(null)
  const [currentlyPlayingFileUrl, setCurrentlyPlayingFileUrl] = useState<{
    [key: string]: string
  }>({})
  const [waveformUrls, setWaveformUrls] = useState<Record<string, string>>({})
  const [listenCounts, setListenCounts] = useState<Record<string, number[]>>({})
  const [editedSegments, setEditedSegments] = useState<
    Record<string, Set<number>>
  >({})
  const [customerWatchCount, setCustomerWatchCount] = useState(0)
  const [transcriberWatchCount, setTranscriberWatchCount] = useState(0)

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(
    null
  )
  const [totalCount, setTotalCount] = useState(0)

  // Cache state - store already loaded pages
  const cachedDataRef = useRef<CachedData>({})

  const getCacheKey = useCallback((pageNum: number, size: number) => {
    return `approvals_${pageNum}_${size}`
  }, [])

  const fetchWaveformUrl = async (fileId: string) => {
    try {
      const res = await getSignedUrlAction(`${fileId}_wf.png`, 300)
      if (res.success && res.signedUrl) {
        setWaveformUrls((prev) => ({
          ...prev,
          [fileId]: res.signedUrl,
        }))
      }
    } catch (error) {
      console.error('Failed to load waveform:', error)
    }
  }

  const fetchEditorData = async (fileId: string) => {
    try {
      const data = await getListenCountAndEditedSegmentAction(fileId)
      if (data?.listenCount) {
        setListenCounts((prev) => ({
          ...prev,
          [fileId]: data.listenCount as number[],
        }))
      }

      if (data?.editedSegments) {
        setEditedSegments((prev) => ({
          ...prev,
          [fileId]: new Set(data.editedSegments as number[]),
        }))
      }
    } catch (error) {
      console.error('Failed to load editor data:', error)
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

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    // When changing page size, we need to reset to page 1
    setPageSize(newPageSize)
    setPage(1)
  }

  const fetchOrders = useCallback(
    async (pageNum: number, size: number, forceRefresh = false) => {
      const cacheKey = getCacheKey(pageNum, size)

      // Check if data exists in cache and is not being force refreshed
      if (!forceRefresh && cachedDataRef.current[cacheKey]) {
        setApprovalFiles(cachedDataRef.current[cacheKey].data)
        setPaginationMeta(cachedDataRef.current[cacheKey].pagination)
        setTotalCount(cachedDataRef.current[cacheKey].pagination.totalCount)

        // Update watchlist counts from cached data
        const cachedData = cachedDataRef.current[cacheKey].data
        setCustomerWatchCount(
          cachedData.filter((file) => file.customerWatch).length
        )
        setTranscriberWatchCount(
          cachedData.filter((file) => file.transcriberWatch).length
        )

        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const response = await fetchApprovalOrders(pageNum, size)

        if (response.success && response.details) {
          const orders = response.details.map((order, index: number) => {
            const qcUsers = order.Assignment.filter(
              (a) =>
                a.status === 'ACCEPTED' ||
                a.status === 'COMPLETED' ||
                a.status === 'SUBMITTED_FOR_APPROVAL'
            ).map((a) => ({
              name: `${a.user.firstname} ${a.user.lastname}`,
              email: a.user.email,
              id: a.user.id.toString(),
            }))

            fetchWaveformUrl(order.fileId)
            fetchEditorData(order.fileId)

            return {
              index: index + 1,
              orderId: order.id,
              fileId: order.fileId,
              filename: order?.File?.filename ?? '',
              orderTs: order.orderTs.toISOString(),
              pwer: order.pwer ?? 0,
              status: order.status,
              priority: order.priority,
              duration: order?.File?.duration ?? 0,
              qc: qcUsers,
              deliveryTs: order.deliveryTs.toISOString(),
              hd: order.highDifficulty ?? false,
              fileCost: order.fileCost,
              rateBonus: order.rateBonus,
              type: order.orderType,
              transcriberWatch: order.watchList.transcriber,
              customerWatch: order.watchList.customer,
              qcValidationStats: order.qcValidationStats,
            } as File
          })

          // Sort orders so that overdue files are placed on top
          const now = new Date()

          orders.sort((a, b) => {
            const aDelivery = new Date(a.deliveryTs)
            const bDelivery = new Date(b.deliveryTs)

            const aOverdue = aDelivery < now
            const bOverdue = bDelivery < now

            if (aOverdue && !bOverdue) return -1
            if (!aOverdue && bOverdue) return 1
            return aDelivery.getTime() - bDelivery.getTime() // Sort by delivery date if both are overdue or not overdue
          })

          // Update watchlist counts
          setCustomerWatchCount(
            orders.filter((file) => file.customerWatch).length
          )
          setTranscriberWatchCount(
            orders.filter((file) => file.transcriberWatch).length
          )

          // Store in cache
          cachedDataRef.current[cacheKey] = {
            data: orders,
            pagination: response.pagination,
          }

          setApprovalFiles(orders ?? [])
          setPaginationMeta(response.pagination)
          setTotalCount(response.pagination.totalCount)
          setError(null)

          if (onActionComplete) {
            await onActionComplete()
          }
        } else {
          toast.error(response.message || 'An error occurred')
          setError(response.message || 'An error occurred')
        }
      } catch (err) {
        toast.error('An error occurred')
        setError('an error occurred')
      } finally {
        setIsLoading(false)
      }
    },
    [getCacheKey, onActionComplete]
  )

  useEffect(() => {
    fetchOrders(page, pageSize)
  }, [fetchOrders, page, pageSize])

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
      header: 'SL No.',
      cell: ({ row }) => (
        <div className='font-medium flex items-center gap-5'>
          {row.getValue('index')}
          <FileAudioPlayer
            fileId={row.original.fileId}
            playing={playing}
            setPlaying={setPlaying}
            url={currentlyPlayingFileUrl[row.original.fileId]}
            audioPlayer={audioPlayer}
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
          <div className='mb-2 font-medium'>
            {formatDateTime(row.original.orderTs)}
          </div>
          <div className='flex gap-2'>
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  variant='outline'
                  className='font-semibold text-[10px] text-green-600'
                >
                  {row.original.pwer > HIGH_PWER
                    ? 'HIGH'
                    : row.original.pwer < LOW_PWER
                    ? 'LOW'
                    : 'MEDIUM'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Difficulty</p>
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
      header: 'Duration',
      cell: ({ row }) => (
        <div className='font-medium' style={{ minWidth: '150px' }}>
          {formatDuration(row.getValue('duration'))}
          {row.original.type === 'FORMATTING' ? (
            <p>
              Formatting cost: <br /> ${row.original.fileCost.customFormatCost}{' '}
              ($
              {row.original.fileCost.customFormatRate}/ah + $
              {row.original.rateBonus}/ah)
            </p>
          ) : (
            <>
              <p>
                Transcription cost: <br /> $
                {row.original.fileCost.transcriptionCost} ($
                {row.original.fileCost.transcriptionRate}/ah + $
                {row.original.rateBonus}/ah)
              </p>
              {row.original.type === 'TRANSCRIPTION_FORMATTING' && (
                <p className='mt-1'>
                  Review cost: <br /> ${row.original.fileCost.customFormatCost}{' '}
                  ($
                  {row.original.fileCost.customFormatRate}/ah + $
                  {row.original.rateBonus}/ah)
                </p>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className='capitalize font-medium'>{row.getValue('status')}</div>
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'type',
      header: 'Order Type',
      cell: ({ row }) => (
        <div className='capitalize font-medium'>{row.getValue('type')}</div>
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'qc',
      header: 'Editor',
      cell: ({ row }) => {
        const qcUsers = row.original.qc
        return (
          <div className='font-medium'>
            {qcUsers && qcUsers.length > 0
              ? qcUsers.map(
                  (user: { name: string; email: string; id: string }) => (
                    <QCLink key={user.id} user={user} />
                  )
                )
              : '-'}
          </div>
        )
      },
    },
    {
      accessorKey: 'deliveryTs',
      header: 'Delivery Date',
      cell: ({ row }) => (
        <div className='font-medium'>
          {formatDateTime(row.getValue('deliveryTs'))}
        </div>
      ),
      filterFn: (row, id, value: { singleDate?: [string, string]; dateRange?: [string, string] } | [string, string]) => {
        if (!value) return true

        const cellDate = new Date(row.getValue(id))
        const dateRanges: [string, string][] = []
        
        if (Array.isArray(value)) {
          if (value[0] && value[1]) {
            dateRanges.push(value)
          }
        } else if (typeof value === 'object') {
          
          if (value.singleDate && value.singleDate[0] && value.singleDate[1]) {
            dateRanges.push(value.singleDate)
          }
          if (value.dateRange && value.dateRange[0] && value.dateRange[1]) {
            dateRanges.push(value.dateRange)
          }
        }

        if (dateRanges.length === 0) return true
        return dateRanges.some(([start, end]) => {
          const startDate = new Date(start)
          const endDate = new Date(end)
          return cellDate >= startDate && cellDate <= endDate
        })
      },
    },
    {
      accessorKey: 'transcriberWatch',
      header: 'Transcriber Watch',
      enableHiding: true,
    },
    {
      accessorKey: 'customerWatch',
      header: 'Customer Watch',
      enableHiding: true,
    },

    {
      accessorKey: 'qcStats',
      header: 'QC Stats',
      cell: ({ row }) => {
        const stats = row.original.qcValidationStats

        if (!stats) {
          return (
            <div className='font-medium' style={{ maxWidth: '125px' }}>
              No QC Stats
            </div>
          )
        }

        const getStatusClass = (value: number, isError: boolean) =>
          `inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
            isError
              ? 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-400/10 dark:text-red-400 dark:ring-red-400/20'
              : 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:ring-green-400/20'
          }`

        const pwerPercent = row.original.pwer * 100
        const marginPercentage = QC_VALIDATION.wer_threshold_margin_percentage
        const thresholdMin = Math.max(0, pwerPercent - marginPercentage)
        const thresholdMax = Math.min(100, pwerPercent + marginPercentage)

        const statsConfig = [
          {
            value: stats.playedPercentage,
            isError:
              stats.playedPercentage <
              QC_VALIDATION.min_audio_playback_percentage,
            tooltip: `Indicates percentage of audio file that was played by QC. Should be at least ${QC_VALIDATION.min_audio_playback_percentage}% to ensure thorough review.`,
          },
          {
            value: stats.werPercentage,
            isError:
              stats.werPercentage < thresholdMin ||
              stats.werPercentage > thresholdMax,
            tooltip: `Indicates percentage of transcript changes by QC. The acceptable range is ${thresholdMin}%–${thresholdMax}% (±${marginPercentage}% around the file's PWER of ${pwerPercent}%). Values outside this range may indicate insufficient or excessive review.`,
          },
          {
            value: stats.blankPercentage,
            isError: stats.blankPercentage > QC_VALIDATION.max_blank_percentage,
            tooltip: `Indicates percentage of inaudible/blank segments in the transcript added by QC. Should not exceed ${QC_VALIDATION.max_blank_percentage}% to maintain transcript quality.`,
          },
          {
            value: stats.editListenCorrelationPercentage,
            isError:
              stats.editListenCorrelationPercentage <
              QC_VALIDATION.min_edit_listen_correlation_percentage,
            tooltip: `Indicates correlation between edits and audio playback, showing if changes were made by QC while listening carefully. Should be at least ${QC_VALIDATION.min_edit_listen_correlation_percentage}% to ensure accurate corrections based on careful audio review.`,
          },
          {
            value: stats.speakerChangePercentage,
            isError:
              stats.speakerChangePercentage >
              QC_VALIDATION.max_speaker_change_percentage,
            tooltip: `Indicates percentage of speaker label changes made by QC. Should not exceed ${QC_VALIDATION.max_speaker_change_percentage}% to maintain speaker consistency.`,
          },
          {
            value: stats.blankPercentage,
            isError: stats.blankPercentage > QC_VALIDATION.max_blank_percentage,
            tooltip: `Indicates percentage of inaudible/blank segments in the transcript added by QC. Should not exceed ${QC_VALIDATION.max_blank_percentage}% to maintain transcript quality.`,
          },
        ]

        return (
          <div
            className='font-medium flex flex-wrap gap-0.5'
            style={{ maxWidth: '125px' }}
          >
            {statsConfig.map((stat, index) => (
              <Tooltip key={index}>
                <TooltipTrigger>
                  <div className={getStatusClass(stat.value, stat.isError)}>
                    {stat.value}%
                  </div>
                </TooltipTrigger>
                <TooltipContent className='max-w-[350px]'>
                  <p>{stat.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      enableHiding: false,
      cell: ({ row }) => (
        <div className='flex items-center'>
          <Button
            variant='order'
            className='format-button'
            onClick={() => {
              setFileId(row.original.fileId)
              setDiffDialogOpen(true)
            }}
          >
            Generate Diff
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
                className=''
                onClick={() => {
                  setOrderId(row.original.orderId.toString())
                  setOpenDialog(true)
                  setIsAccept(true)
                }}
              >
                Accept
              </DropdownMenuItem>
              <DropdownMenuItem
                className='text-red-500'
                onClick={() => {
                  setOrderId(row.original.orderId.toString())
                  setOpenDialog(true)
                  setIsAccept(false)
                }}
              >
                Reject
              </DropdownMenuItem>
              <DropdownMenuItem
                className=''
                onClick={() => {
                  setOrderId(row.original.orderId.toString())
                  setOpenReassignDialog(true)
                }}
              >
                Re-assign
              </DropdownMenuItem>
              <DropdownMenuItem
                className=''
                onClick={() =>
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
              >
                Open Editor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  const removeOrder = (orderId: string) => {
    // Remove the order from all caches
    Object.keys(cachedDataRef.current).forEach((key) => {
      const pageData = cachedDataRef.current[key]
      const updatedData = pageData.data.filter(
        (file) => file.orderId.toString() !== orderId
      )
      if (updatedData.length !== pageData.data.length) {
        const updatedPagination = {
          ...pageData.pagination,
          totalCount: pageData.pagination.totalCount - 1,
        }
        cachedDataRef.current[key] = {
          data: updatedData,
          pagination: updatedPagination,
        }
      }
    })

    // Update current view
    setApprovalFiles((prevFiles) =>
      prevFiles
        ? prevFiles.filter((file) => file.orderId.toString() !== orderId)
        : null
    )

    // Update total count
    setTotalCount((prev) => prev - 1)

    // If this was the last item on the page and not the first page, go back one page
    if (approvalFiles?.length === 1 && page > 1) {
      setPage((prevPage) => prevPage - 1)
    } else if (page > 1 && (page - 1) * pageSize >= totalCount - 1) {
      // If we've removed an item and now the current page would be empty, go back
      setPage((prevPage) => prevPage - 1)
    } else {
      // Otherwise just refresh current page data
      fetchOrders(page, pageSize, true)
    }
  }

  const renderWaveform = (row: File) => {
    if (!('fileId' in row)) return null
    const fileId = row.fileId as string
    if (!waveformUrls[fileId]) return null

    return (
      <div className='w-full h-full cursor-pointer'>
        <WaveformHeatmap
          waveformUrl={waveformUrls[fileId]}
          listenCount={listenCounts[fileId] || []}
          editedSegments={editedSegments[fileId] || new Set()}
          duration={row.duration}
        />
      </div>
    )
  }

  return (
    <>
      <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex'>
        <div className='flex items-center justify-between space-y-2'>
          <div>
            <h1 className='text-lg font-semibold md:text-lg'>
              Available Approval Orders ({totalCount})
              {(customerWatchCount > 0 || transcriberWatchCount > 0) && (
                <span className='ml-2 text-sm font-normal'>
                  {customerWatchCount > 0 && (
                    <Badge variant='outline' className='mr-2'>
                      Customer Watch: {customerWatchCount}
                    </Badge>
                  )}
                  {transcriberWatchCount > 0 && (
                    <Badge variant='outline'>
                      Transcriber Watch: {transcriberWatchCount}
                    </Badge>
                  )}
                </span>
              )}
            </h1>
          </div>
        </div>
        <DataTable
          data={approvalFiles ?? []}
          columns={columns}
          defaultColumnVisibility={{
            customerWatch: false,
            transcriberWatch: false,
            status: false,
          }}
          renderWaveform={renderWaveform}
          isLoading={isLoading}
          pagination={{
            currentPage: page,
            pageCount: paginationMeta?.pageCount || 1,
            pageSize: pageSize,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
          }}
          initialFilters={initialFilters}
          onFiltersChange={onFiltersChange}
          activeTab={'approval'}
        />
      </div>
      <ReassignApprovalFile
        open={openReassignDialog}
        onClose={() => setOpenReassignDialog(false)}
        orderId={orderId || ''}
        refetch={() => fetchOrders(page, pageSize, true)}
      />
      <AcceptRejectApprovalFileDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        orderId={orderId || ''}
        refetch={() => removeOrder(orderId)}
        isAccept={isAccept}
      />
      <OpenDiffDialog
        open={diffDialogOpen}
        onClose={() => setDiffDialogOpen(false)}
        fileId={fileId || ''}
      />
    </>
  )
}
