/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { CancellationStatus } from '@prisma/client'
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'

import ApprovalPage from './approvals'
import ComparePage from './compare'
import { DataTableColumnHeader } from './components/column-header'
import { DataTable } from './components/data-table'
import DeliveredSection from './components/delivered-files'
import PreDeliveryPage from './pre-delivery'
import ReReviewPage from './re-review'
import ScreenPage from './screen'
import YouTubeImportsPage from './youtube-imports'
const StatusPage = dynamic(() => import('./status'), {
  ssr: false,
  loading: () => <div>Loading...</div>,
})
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { changeDeliveryDate } from '@/app/actions/om/change-delivery-date'
import { fetchPendingOrders } from '@/app/actions/om/fetch-pending-orders'
import { fetchTabCounts } from '@/app/actions/om/fetch-tab-counts'
import { fetchYoutubeFilesForImport } from '@/app/actions/om/fetch-youtube-files'
import { CancellationDetailsModal } from '@/components/cancellation-details-modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import FileAudioPlayer from '@/components/utils/FileAudioPlayer'
import { HIGH_PWER, LOW_PWER } from '@/constants'
import { FileCost } from '@/types/files'
import formatDateTime from '@/utils/formatDateTime'
import formatDuration from '@/utils/formatDuration'
// eslint-disable-next-line import/order
import QCLink from './components/qc-link'

interface QCDetail {
  name: string
  email: string
  id: string
}

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
  qc: QCDetail[]
  deliveryTs: string
  hd: boolean
  fileCost: FileCost
  rateBonus: number
  type: string
  orgName: string
  specialInstructions: string
  containsMp4: boolean
  cancellations: {
    user: {
      firstname: string | null
      lastname: string | null
      email: string
    }
    id: number
    userId: number
    fileId: string
    reason: string
    createdAt: Date
    comment: string | null
    status: CancellationStatus
  }[]
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

export default function OrdersPage() {
  const [pendingOrders, setPendingOrders] = useState<File[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('orders')
  const [fileId, setFileId] = useState<string>('')
  const [playing, setPlaying] = useState<Record<string, boolean>>({})
  const [currentlyPlayingFileUrl, setCurrentlyPlayingFileUrl] = useState<{
    [key: string]: string
  }>({})
  const [isCancellationsModalOpen, setIsCancellationsModalOpen] =
    useState(false)
  const [selectedCancellations, setSelectedCancellations] = useState<
    {
      user: {
        firstname: string | null
        lastname: string | null
        email: string
      }
      id: number
      userId: number
      fileId: string
      reason: string
      createdAt: Date
      comment: string | null
      status: CancellationStatus
    }[]
  >([])
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [screenFilesCount, setScreenFilesCount] = useState<number>(0)
  const [preDeliveryFilesCount, setPreDeliveryFilesCount] = useState<number>(0)
  const [approvalFilesCount, setApprovalFilesCount] = useState<number>(0)
  const [reReviewFilesCount, setReReviewFilesCount] = useState<number>(0)
  const [youtubeImportsCount, setYoutubeImportsCount] = useState<number>(0)

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(
    null
  )

  // Cache state - store already loaded pages
  const cachedDataRef = useRef<CachedData>({})

  const getCacheKey = useCallback((pageNum: number, size: number) => {
    return `orders_${pageNum}_${size}`
  }, [])

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

  const getPendingOrders = useCallback(
    async (pageNum: number, size: number, forceRefresh = false) => {
      const cacheKey = getCacheKey(pageNum, size)

      // Check if data exists in cache and is not being force refreshed
      if (!forceRefresh && cachedDataRef.current[cacheKey]) {
        setPendingOrders(cachedDataRef.current[cacheKey].data)
        setPaginationMeta(cachedDataRef.current[cacheKey].pagination)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const response = await fetchPendingOrders(pageNum, size)

        if (response.success && response.details) {
          const orders = response.details.map((order, index) => {
            const qcAssignments = order.Assignment.filter(
              (a) =>
                a.status === 'ACCEPTED' ||
                a.status === 'COMPLETED' ||
                a.status === 'SUBMITTED_FOR_APPROVAL'
            ).map((a) => ({
              name: `${a.user.firstname} ${a.user.lastname}`,
              email: a.user.email,
              id: a.user.id.toString(),
            }))

            return {
              index: index + 1,
              orderId: order.id,
              fileId: order.fileId,
              filename: order.File?.filename ?? '',
              orderTs: order.orderTs.toISOString(),
              pwer: order.pwer ?? 0,
              status: order.status,
              priority: order.priority,
              duration: order.File?.duration ?? 0,
              qc: qcAssignments,
              deliveryTs: order.deliveryTs.toISOString(),
              hd: order.highDifficulty ?? false,
              fileCost: order.fileCost,
              rateBonus: order.rateBonus,
              type: order.orderType,
              orgName: order.orgName,
              specialInstructions: order.specialInstructions,
              cancellations: order.cancellations,
              containsMp4:
                order.File?.fileKey?.split('.')?.pop()?.toLowerCase() === 'mp4',
            }
          })

          // Sort orders so that overdue files from yesterday are placed on top
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const yesterday = new Date(today)
          yesterday.setDate(today.getDate() - 1)

          orders.sort((a, b) => {
            const aDelivery = new Date(a.deliveryTs)
            aDelivery.setHours(0, 0, 0, 0)
            const bDelivery = new Date(b.deliveryTs)
            bDelivery.setHours(0, 0, 0, 0)

            const aOverdue = aDelivery.getTime() === yesterday.getTime()
            const bOverdue = bDelivery.getTime() === yesterday.getTime()

            if (aOverdue && !bOverdue) return -1
            if (!aOverdue && bOverdue) return 1
            return a.index - b.index
          })

          // Store in cache
          cachedDataRef.current[cacheKey] = {
            data: orders,
            pagination: response.pagination,
          }

          setPendingOrders(orders ?? [])
          setPendingCount(response.pagination.totalCount)
          setPaginationMeta(response.pagination)
          setError(null)
        } else {
          setError(response.message ?? 'Unknown error')
        }
      } catch (err) {
        setError('an error occurred')
      } finally {
        setIsLoading(false)
      }
    },
    [getCacheKey]
  )

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    // When changing page size, we need to reset to page 1
    setPageSize(newPageSize)
    setPage(1)
  }

  const fetchAllTabCounts = async () => {
    try {
      const response = await fetchTabCounts()

      if (response.success && response.counts) {
        const {
          screenCount,
          preDeliveryCount,
          approvalCount,
          reReviewCount,
          pendingCount,
        } = response.counts

        setScreenFilesCount(screenCount)
        setPreDeliveryFilesCount(preDeliveryCount)
        setApprovalFilesCount(approvalCount)
        setReReviewFilesCount(reReviewCount)

        if (!pendingOrders) {
          setPendingCount(pendingCount)
        }

        const youtubeResponse = await fetchYoutubeFilesForImport()
        if (youtubeResponse.success && youtubeResponse.files) {
          setYoutubeImportsCount(youtubeResponse.files.length)
        }
      } else {
        console.error('Failed to fetch tab counts:', response.message)
      }
    } catch (error) {
      console.error('Error fetching tab counts:', error)
    }
  }

  useEffect(() => {
    getPendingOrders(page, pageSize)
    fetchAllTabCounts()
  }, [page, pageSize, getPendingOrders])

  const handleDeliveryDateChanged = async (orderId: number, day: number) => {
    try {
      const response = await changeDeliveryDate(orderId, day)
      if (response.success) {
        toast.success('Delivery date changed successfully')
        // Force refresh
        getPendingOrders(page, pageSize, true)
      } else {
        toast.error(response.message)
      }
    } catch (err) {
      toast.error('An error occurred')
    }
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
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
          />
        </div>
      ),
    },
    {
      accessorKey: 'fileId',
      header: 'Details',
      cell: ({ row }) => (
        <div>
          <div className='mb-2 font-medium'>
            <Button
              variant='link'
              className='p-0 m-0'
              onClick={() => {
                setFileId(row.original.fileId)
                setActiveTab('status')
              }}
            >
              {row.original.fileId}
            </Button>
          </div>
          <div className='mb-2 font-medium'>
            {row.original.filename}
            {row.original.cancellations.length > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <button
                    className='inline-flex items-center justify-center w-5 h-5 bg-red-500 text-primary-foreground rounded-full text-xs font-medium ml-2 cursor-pointer'
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedCancellations(row.original.cancellations)
                      setIsCancellationsModalOpen(true)
                    }}
                  >
                    {row.original.cancellations.length}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View cancellation history</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
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
            {row.original.orgName.length > 0 && (
              <Badge
                variant='outline'
                className='font-semibold text-[10px] text-green-600'
              >
                {row.original.orgName}
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
      accessorKey: 'orgName',
      header: 'Organization',
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'duration',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Duration' />
      ),
      cell: ({ row }) => (
        <div
          className='font-medium'
          style={{ minWidth: '250px', maxWidth: '250px' }}
        >
          {formatDuration(row.getValue('duration'))}
          {row.original.type === 'FORMATTING' ? (
            <>
              <p>
                Formatting cost: <br /> $
                {row.original.fileCost.customFormatCost}
                ($
                {row.original.fileCost.customFormatRate}/ah + $
                {row.original.rateBonus}/ah)
              </p>
            </>
          ) : (
            <>
              {' '}
              <p>
                Transcription cost: <br /> $
                {row.original.fileCost.transcriptionCost}
                ($
                {row.original.fileCost.transcriptionRate}/ah + $
                {row.original.rateBonus}/ah)
              </p>
              {row.original.type === 'TRANSCRIPTION_FORMATTING' && (
                <p className='mt-1'>
                  Review cost: <br /> ${row.original.fileCost.customFormatCost}
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
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      cell: ({ row }) => (
        <div className='capitalize font-medium'>{row.getValue('status')}</div>
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Order Type' />
      ),
      cell: ({ row }) => (
        <div className='capitalize font-medium'>{row.getValue('type')}</div>
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'qc',
      header: 'Editor',
      cell: ({ row }) => {
        const qcArray = row.original.qc
        if (!Array.isArray(qcArray) || qcArray.length === 0) {
          return <div className='font-medium'>-</div>
        }
        return (
          <div className='font-medium flex flex-wrap gap-2'>
            {qcArray.map(
              (
                qc: { name: string; email: string; id: string },
                index: number
              ) => (
                <QCLink user={qc} key={index} />
              )
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'deliveryTs',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Delivery Date' />
      ),
      filterFn: (row, id, value: [string, string]) => {
        if (!value || !value[0] || !value[1]) return true

        const cellDate = new Date(row.getValue(id))
        const [start, end] = value.map((str) => new Date(str))

        // Check if the date is within the range
        return cellDate >= start && cellDate <= end
      },
      cell: ({ row }) => (
        <div className='flex gap-3 items-center'>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant='outline'
                className='h-5 w-5'
                size='icon'
                onClick={() =>
                  handleDeliveryDateChanged(row.original.orderId, -1)
                }
              >
                <span className='sr-only'>Move Date</span>
                <ChevronLeftIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Prepone one day</p>
            </TooltipContent>
          </Tooltip>

          <div className='font-medium'>
            {formatDateTime(row.getValue('deliveryTs'))}
          </div>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant='outline'
                className='h-5 w-5'
                size='icon'
                onClick={() =>
                  handleDeliveryDateChanged(row.original.orderId, 1)
                }
              >
                <span className='sr-only'>Move Date</span>
                <ChevronRightIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Postpone one day</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ]

  return (
    <>
      <Tabs
        defaultValue='orders'
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value)
          fetchAllTabCounts()
        }}
      >
        <TabsList className='grid grid-cols-8 mt-5 ml-8 w-[1150px]'>
          <TabsTrigger value='orders' className='relative'>
            Orders
            {pendingCount > 0 && (
              <span className='absolute -top-2 -right-2 inline-flex items-center justify-center min-w-5 h-5 px-1 bg-red-500 text-white rounded-full text-xs font-medium'>
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value='status' className='relative ml-3'>
            Status
          </TabsTrigger>
          <TabsTrigger value='screen' className='relative ml-3'>
            <span>Screen</span>
            {screenFilesCount > 0 && (
              <span className='absolute -top-2 -right-2 inline-flex items-center justify-center min-w-5 h-5 px-1 bg-red-500 text-white rounded-full text-xs font-medium'>
                {screenFilesCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value='pre-delivery' className='relative ml-3'>
            <span>Pre Delivery</span>
            {preDeliveryFilesCount > 0 && (
              <span className='absolute -top-2 -right-2 inline-flex items-center justify-center min-w-5 h-5 px-1 bg-red-500 text-white rounded-full text-xs font-medium'>
                {preDeliveryFilesCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value='approval' className='relative ml-3'>
            <span>Approval</span>
            {approvalFilesCount > 0 && (
              <span className='absolute -top-2 -right-2 inline-flex items-center justify-center min-w-5 h-5 px-1 bg-red-500 text-white rounded-full text-xs font-medium'>
                {approvalFilesCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value='re-review' className='relative ml-3'>
            <span>Re-Review</span>
            {reReviewFilesCount > 0 && (
              <span className='absolute -top-2 -right-2 inline-flex items-center justify-center min-w-5 h-5 px-1 bg-red-500 text-white rounded-full text-xs font-medium'>
                {reReviewFilesCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value='compare' className='relative ml-3'>
            <span>Compare</span>
          </TabsTrigger>
          <TabsTrigger value='youtube-imports' className='relative ml-3'>
            <span>YouTube Import</span>
            {youtubeImportsCount > 0 && (
              <span className='absolute -top-2 -right-2 inline-flex items-center justify-center min-w-5 h-5 px-1 bg-red-500 text-white rounded-full text-xs font-medium'>
                {youtubeImportsCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value='orders'>
          <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex'>
            <div className='flex items-center justify-between space-y-2'>
              <div>
                <h1 className='text-lg font-semibold md:text-lg'>
                  Pending Orders ({pendingCount})
                </h1>
              </div>
            </div>
            <DataTable
              data={pendingOrders ?? []}
              columns={columns}
              isLoading={isLoading}
              pagination={{
                currentPage: page,
                pageCount: paginationMeta?.pageCount || 1,
                pageSize: pageSize,
                onPageChange: handlePageChange,
                onPageSizeChange: handlePageSizeChange,
              }}
              renderRowSubComponent={({ row }: { row: any }) =>
                row.original.specialInstructions ? (
                  <div className='p-2 flex gap-1'>
                    <strong>Special Instructions:</strong>
                    <p>{row.original.specialInstructions}</p>
                  </div>
                ) : null
              }
            />
          </div>
          <div className='bg-muted/40'>
            <Separator className='mb-5' />
          </div>
          <DeliveredSection />
        </TabsContent>
        <TabsContent value='status'>
          <StatusPage
            selectedFileId={fileId}
            refetchPendingOrders={() => getPendingOrders(page, pageSize, true)}
          />
        </TabsContent>
        <TabsContent value='screen'>
          <ScreenPage onActionComplete={fetchAllTabCounts} />
        </TabsContent>
        <TabsContent value='pre-delivery'>
          <PreDeliveryPage onActionComplete={fetchAllTabCounts} />
        </TabsContent>
        <TabsContent value='approval'>
          <ApprovalPage onActionComplete={fetchAllTabCounts} />
        </TabsContent>
        <TabsContent value='re-review'>
          <ReReviewPage onActionComplete={fetchAllTabCounts} />
        </TabsContent>
        <TabsContent value='youtube-imports'>
          <YouTubeImportsPage />
        </TabsContent>
        <TabsContent value='compare'>
          <ComparePage />
        </TabsContent>
      </Tabs>
      <CancellationDetailsModal
        isOpen={isCancellationsModalOpen}
        onClose={() => setIsCancellationsModalOpen(false)}
        cancellations={selectedCancellations}
      />
    </>
  )
}
