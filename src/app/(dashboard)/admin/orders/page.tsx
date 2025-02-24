/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { CancellationStatus } from '@prisma/client'
import {
  ReloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import ApprovalPage from './approvals'
import ComparePage from './compare'
import { DataTableColumnHeader } from './components/column-header'
import { DataTable } from './components/data-table'
import DeliveredSection from './components/delivered-files'
import PreDeliveryPage from './pre-delivery'
import ReReviewPage from './re-review'
import ScreenPage from './screen'
const StatusPage = dynamic(() => import('./status'), {
  ssr: false,
  loading: () => <div>Loading...</div>,
})
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { changeDeliveryDate } from '@/app/actions/om/change-delivery-date'
import { fetchPendingOrders } from '@/app/actions/om/fetch-pending-orders'
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
  qc: string
  deliveryTs: string
  hd: boolean
  fileCost: FileCost
  rateBonus: number
  type: string
  orgName: string
  specialInstructions: string
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

  const getPendingOrders = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }

    try {
      const response = await fetchPendingOrders()

      if (response.success && response.details) {
        const orders = response.details.map((order, index) => {
          const qcNames = order.Assignment.filter(
            (a) =>
              a.status === 'ACCEPTED' ||
              a.status === 'COMPLETED' ||
              a.status === 'SUBMITTED_FOR_APPROVAL'
          )
            .map((a) => `${a.user.firstname} ${a.user.lastname}`)
            .join(', ')

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
            qc: qcNames || '-',
            deliveryTs: order.deliveryTs.toISOString(),
            hd: order.highDifficulty ?? false,
            fileCost: order.fileCost,
            rateBonus: order.rateBonus,
            type: order.orderType,
            orgName: order.orgName,
            specialInstructions: order.specialInstructions,
            cancellations: order.cancellations,
          }
        })
        setPendingOrders(orders ?? [])
        setError(null)
      } else {
        setError(response.message ?? 'Unknown error')
      }
    } catch (err) {
      setError('an error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    getPendingOrders(true)
  }, [])

  const handleDeliveryDateChanged = async (orderId: number, day: number) => {
    try {
      const response = await changeDeliveryDate(orderId, day)
      if (response.success) {
        toast.success('Delivery date changed successfully')
        getPendingOrders()
      } else {
        toast.error(response.message)
      }
    } catch (err) {
      toast.error('An error occurred')
    }
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
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
          height: '80vh',
        }}
      >
        <p>An Error Occured</p>
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
            {row.original.orgName.length > 0 && (
              <Badge
                variant='outline'
                className='font-semibold text-[10px] text-green-600'
              >
                {row.original.orgName}
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
                /ah ($
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
                /ah ($
                {row.original.fileCost.transcriptionRate}/ah + $
                {row.original.rateBonus}/ah)
              </p>
              {row.original.type === 'TRANSCRIPTION_FORMATTING' && (
                <p className='mt-1'>
                  Review cost: <br /> ${row.original.fileCost.customFormatCost}
                  /ah ($
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
      accessorKey: 'qc',
      header: 'Editor',
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('qc')}</div>
      ),
    },
    {
      accessorKey: 'deliveryTs',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Delivery Date' />
      ),
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
        onValueChange={(value) => setActiveTab(value)}
      >
        <TabsList className='grid grid-cols-7 mt-5 ml-8 w-[900px]'>
          <TabsTrigger value='orders'>Orders</TabsTrigger>
          <TabsTrigger value='status'>Status</TabsTrigger>
          <TabsTrigger value='screen'>Screen</TabsTrigger>
          <TabsTrigger value='pre-delivery'>Pre Delivery</TabsTrigger>
          <TabsTrigger value='approval'>Approval</TabsTrigger>
          <TabsTrigger value='re-review'>Re-Review</TabsTrigger>
          <TabsTrigger value='compare'>Compare</TabsTrigger>
        </TabsList>
        <TabsContent value='orders'>
          <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex'>
            <div className='flex items-center justify-between space-y-2'>
              <div>
                <h1 className='text-lg font-semibold md:text-lg'>
                  Pending Orders ({pendingOrders?.length})
                </h1>
              </div>
            </div>
            <DataTable
              data={pendingOrders ?? []}
              columns={columns}
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
          <StatusPage selectedFileId={fileId} />
        </TabsContent>
        <TabsContent value='screen'>
          <ScreenPage />
        </TabsContent>
        <TabsContent value='pre-delivery'>
          <PreDeliveryPage />
        </TabsContent>
        <TabsContent value='approval'>
          <ApprovalPage />
        </TabsContent>
        <TabsContent value='re-review'>
          <ReReviewPage />
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
