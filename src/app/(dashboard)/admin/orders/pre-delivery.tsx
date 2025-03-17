'use client'
import { ChevronDownIcon, ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { DataTableColumnHeader } from './components/column-header'
import { DataTable } from './components/data-table'
import QCLink from './components/qc-link'
import { getListenCountAndEditedSegmentAction } from '@/app/actions/admin/get-listen-count-and-edited-segment'
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { fetchPreDeliveryOrders } from '@/app/actions/om/fetch-pre-delivery-orders'
import DeliveryPreDeliveryFile from '@/components/admin-components/deliver-pre-delivery-file'
import ReassignFinalizer from '@/components/admin-components/re-assign-finalizer-dialog'
import ReassignPreDeliveryFile from '@/components/admin-components/re-assign-pre-delivery-file'
import RejectFileDialog from '@/components/admin-components/reject-file-dialog'
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
import { HIGH_PWER, LOW_PWER } from '@/constants'
import { FileCost } from '@/types/files'
import formatDateTime from '@/utils/formatDateTime'
import formatDuration from '@/utils/formatDuration'

interface QCUser {
  id: string
  name: string
  email: string
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
  qc: QCUser[]
  deliveryTs: string
  hd: boolean
  type: string
  fileCost: FileCost
  rateBonus: number
  waveformUrl?: string
  listenCount?: number[]
  editedSegments?: Set<number>
}

interface PreDeliveryPageProps {
  onActionComplete?: () => Promise<void>
}

export default function PreDeliveryPage({
  onActionComplete,
}: PreDeliveryPageProps) {
  const [preDeliveryFiles, setPreDelieryFiles] = useState<File[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string>('')
  const [openDialog, setOpenDialog] = useState(false)
  const [openReassignDialog, setOpenReassignDialog] = useState(false)
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [playing, setPlaying] = useState<Record<string, boolean>>({})
  const [currentlyPlayingFileUrl, setCurrentlyPlayingFileUrl] = useState<{
    [key: string]: string
  }>({})
  const [waveformUrls, setWaveformUrls] = useState<Record<string, string>>({})
  const [listenCounts, setListenCounts] = useState<Record<string, number[]>>({})
  const [editedSegments, setEditedSegments] = useState<
    Record<string, Set<number>>
  >({})

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

  const getPreDeliveryOrders = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }
    try {
      const response = await fetchPreDeliveryOrders()

      if (response.success && response.details) {
        const orders = response.details.map((order, index) => {
          const qcUsers: QCUser[] = order.Assignment.filter(
            (a) =>
              a.status === 'ACCEPTED' ||
              a.status === 'COMPLETED' ||
              a.status === 'SUBMITTED_FOR_APPROVAL'
          ).map((a) => ({
            id: a.user.id.toString(),
            name: `${a.user.firstname} ${a.user.lastname}`,
            email: a.user.email,
          }))

          fetchWaveformUrl(order.fileId)
          fetchEditorData(order.fileId)

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
            qc: qcUsers,
            deliveryTs: order.deliveryTs.toISOString(),
            hd: order.highDifficulty ?? false,
            type: order.orderType,
            fileCost: order.fileCost,
            rateBonus: order.rateBonus,
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

        setPreDelieryFiles(orders ?? [])
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
  }

  useEffect(() => {
    getPreDeliveryOrders(true)
  }, [])

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
      header: 'Duration',
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
      header: 'Status',
      cell: ({ row }) => (
        <div className='capitalize font-medium'>{row.getValue('status')}</div>
      ),
    },
    {
      accessorKey: 'qc',
      header: 'Editor',
      cell: ({ row }) => {
        const qcUsers = row.original.qc
        if (!qcUsers || qcUsers.length === 0) {
          return <div className='font-medium'>-</div>
        }
        return (
          <div className='font-medium flex flex-wrap gap-2'>
            {qcUsers.map((user) => (
              <QCLink key={user.id} user={user} />
            ))}
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
      filterFn: (row, id, value: [string, string]) => {
        if (!value || !value[0] || !value[1]) return true
        const cellDate = new Date(row.getValue(id))
        const [start, end] = value.map((str) => new Date(str))
        return cellDate >= start && cellDate <= end
      },
    },
    {
      accessorKey: 'type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Order Type' />
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
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
                }}
              >
                Deliver
              </DropdownMenuItem>
              <DropdownMenuItem
                className=''
                onClick={() => {
                  setOrderId(row.original.orderId.toString())
                  setOpenReassignDialog(true)
                }}
              >
                Re-assign Editor
              </DropdownMenuItem>
              {(row.original.type === 'TRANSCRIPTION_FORMATTING' ||
                row.original.type === 'FORMATTING') && (
                <DropdownMenuItem
                  className=''
                  onClick={() => {
                    setOrderId(row.original.orderId.toString())
                    setReassignDialogOpen(true)
                  }}
                >
                  Re-assign Finalizer
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className='text-red-500'
                onClick={() => {
                  setOrderId(row.original.orderId.toString())
                  setRejectDialogOpen(true)
                }}
              >
                Reject
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex'>
        <div className='flex items-center justify-between space-y-2'>
          <div>
            <h1 className='text-lg font-semibold md:text-lg'>
              Available Pre Delivery Orders ({preDeliveryFiles?.length})
            </h1>
          </div>
        </div>
        <DataTable
          data={preDeliveryFiles ?? []}
          columns={columns}
          renderWaveform={(row) => {
            if (!('fileId' in row)) return null
            const fileId = row.fileId as string
            if (!waveformUrls[fileId]) return null

            return (
              <WaveformHeatmap
                waveformUrl={waveformUrls[fileId]}
                listenCount={listenCounts[fileId] || []}
                editedSegments={editedSegments[fileId] || new Set()}
                duration={row.duration}
              />
            )
          }}
        />
      </div>
      <DeliveryPreDeliveryFile
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        orderId={orderId || ''}
        refetch={() => getPreDeliveryOrders()}
      />
      <ReassignPreDeliveryFile
        open={openReassignDialog}
        onClose={() => setOpenReassignDialog(false)}
        orderId={orderId || ''}
        refetch={() => getPreDeliveryOrders()}
      />
      <ReassignFinalizer
        open={reassignDialogOpen}
        onClose={() => setReassignDialogOpen(false)}
        orderId={orderId || ''}
        refetch={() => getPreDeliveryOrders()}
        isCompleted={true}
      />
      <RejectFileDialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        orderId={orderId || ''}
        refetch={() => getPreDeliveryOrders()}
      />
    </>
  )
}
