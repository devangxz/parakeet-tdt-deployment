'use client'
import { ChevronDownIcon, ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { DataTable } from './components/data-table'
import { fetchReReviewOrders } from '@/app/actions/om/fetch-re-review-orders'
import DeliveryPreDeliveryFile from '@/components/admin-components/deliver-pre-delivery-file'
import ReassignFinalizer from '@/components/admin-components/re-assign-finalizer-dialog'
import ReassignPreDeliveryFile from '@/components/admin-components/re-assign-pre-delivery-file'
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
import { BACKEND_URL, HIGH_PWER, LOW_PWER } from '@/constants'
import { FileCost } from '@/types/files'
import axiosInstance from '@/utils/axios'
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
  orderType: string
  fileCost: FileCost
  rateBonus: number
}

export default function ReReviewPage() {
  const [reReviewFiles, setReReviewFiles] = useState<File[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string>('')
  const [openDialog, setOpenDialog] = useState(false)
  const [openReassignDialog, setOpenReassignDialog] = useState(false)
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false)
  const [playing, setPlaying] = useState<Record<string, boolean>>({})
  const [currentlyPlayingFileUrl, setCurrentlyPlayingFileUrl] = useState<{
    [key: string]: string
  }>({})

  const getAudioUrl = async (fileId: string) => {
    try {
      const response = await axiosInstance.get(
        `${BACKEND_URL}/get-audio/${fileId}`,
        { responseType: 'blob' }
      )
      const url = URL.createObjectURL(response.data)
      return url
    } catch (error) {
      toast.error('Failed to play audio.')
    }
  }

  useEffect(() => {
    const fileId = Object.keys(playing)[0]
    if (!fileId) return
    getAudioUrl(fileId).then((url) => {
      if (url) {
        setCurrentlyPlayingFileUrl({ [fileId]: url })
      }
    })
  }, [playing])

  const getReReviewOrders = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }
    try {
      const response = await fetchReReviewOrders()

      if (response.success && response.details) {
        const orders = response.details.map((order, index) => {
          const qcNames = order.Assignment.filter(
            (a) => a.status === 'ACCEPTED' || a.status === 'COMPLETED'
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
            orderType: order.orderType,
            fileCost: order.fileCost,
            rateBonus: order.rateBonus,
          }
        })
        setReReviewFiles(orders ?? [])
        setError(null)
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
    getReReviewOrders(true)
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
      accessorKey: 'id',
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
          <p>
            Transcription cost: <br /> $
            {row.original.fileCost.transcriptionCost}
            /ah ($
            {row.original.fileCost.transcriptionRate}/ah + $
            {row.original.rateBonus}/ah)
          </p>
          {row.original.orderType === 'TRANSCRIPTION_FORMATTING' && (
            <p className='mt-1'>
              Review cost: <br /> ${row.original.fileCost.customFormatCost}/ah
              ($
              {row.original.fileCost.customFormatRate}/ah + $
              {row.original.rateBonus}/ah)
            </p>
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
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('qc')}</div>
      ),
    },
    {
      accessorKey: 'deliveryTs',
      header: 'Delivery Date',
      cell: ({ row }) => (
        <div className='font-medium'>
          {formatDateTime(row.getValue('deliveryTs'))}
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
            className='format-button'
            onClick={() =>
              window.open(
                `/editor/${row.original.orderId}`,
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
              {row.original.orderType === 'TRANSCRIPTION_FORMATTING' && (
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
              Available Re-Review Orders ({reReviewFiles?.length})
            </h1>
          </div>
        </div>
        <DataTable data={reReviewFiles ?? []} columns={columns} />
      </div>
      <DeliveryPreDeliveryFile
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        orderId={orderId || ''}
        refetch={() => getReReviewOrders()}
        isReReview={true}
      />
      <ReassignPreDeliveryFile
        open={openReassignDialog}
        onClose={() => setOpenReassignDialog(false)}
        orderId={orderId || ''}
        refetch={() => getReReviewOrders()}
      />
      <ReassignFinalizer
        open={reassignDialogOpen}
        onClose={() => setReassignDialogOpen(false)}
        orderId={orderId || ''}
        refetch={() => getReReviewOrders()}
        isCompleted={true}
      />
    </>
  )
}
