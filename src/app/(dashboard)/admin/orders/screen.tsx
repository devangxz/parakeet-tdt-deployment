'use client'
import { ChevronDownIcon, ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { DataTable } from './components/data-table'
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { fetchScreeningOrders } from '@/app/actions/om/fetch-screening-orders'
import AcceptRejectScreenFileDialog from '@/components/admin-components/accept-reject-screen-file'
import AssignQcDialog from '@/components/admin-components/assign-qc-dialog'
import AudioWaveformPlayer, { AudioProvider, RowPlayButton } from '@/components/admin-components/audio-waveform-player'
import OpenDiffDialog from '@/components/admin-components/diff-dialog'
import FlagHighDifficulyDialog from '@/components/admin-components/flag-high-difficulty-dialog'
import RevertToAssemblyAITranscriptDialog from '@/components/admin-components/revert-to-assembly-ai-transcript-dialog'
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
import { HIGH_PWER, LOW_PWER } from '@/constants'
import { FileCost } from '@/types/files'
import formatDateTime from '@/utils/formatDateTime'
import formatDuration from '@/utils/formatDuration'

const reportReasonMap = {
  HIGH_ERROR_RATE: 'High Error Rate',
  INCOMPLETE: 'Incomplete',
  INCORRECT_PARAGRAPH_BREAKS: 'Incorrect Paragraph Breaks',
  DOES_NOT_MATCH_AUDIO: 'Does Not Match Audio',
  HIGH_DIFFICULTY: 'High Difficulty',
  NETWORK_ERROR: 'Network Error',
  NO_SPOKEN_AUDIO: 'No Spoken Audio',
  GUIDELINE_VIOLATIONS: 'Guideline Violations',
  ONLY_BACKGROUND_CONVERSATION: 'Only Background Conversation',
  ONLY_MUSIC: 'Only Music',
  OTHER: 'Other',
  AUTO_PWER_ABOVE_THRESHOLD: 'PWER Above Threshold',
  AUTO_DIFF_BELOW_THRESHOLD: 'Diff Below Threshold',
  NOT_PICKED_UP: 'Not Picked Up',
  EMPTY_ASR_TRANSCRIPT: 'Empty ASR Transcript',
}

type ReportReasonMap = typeof reportReasonMap
type ReportReasonKey = keyof ReportReasonMap

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
  reportOption: ReportReasonKey
  reportMode: string
  reportComment: string
  fileCost: FileCost
  rateBonus: number
  type: string
  screenCount: number
}

interface ScreenPageProps {
  onActionComplete?: () => Promise<void>
}

export default function ScreenPage({ onActionComplete }: ScreenPageProps) {
  const [screeningFiles, setScreeningFiles] = useState<File[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string>('')
  const [orderData, setOrderData] = useState<{ fileId: string; orderId: number; currentPwer: number } | null>(null)
  const [selectedFileId, setSelectedFileId] = useState<string>('')
  const [openDialog, setOpenDialog] = useState(false)
  const [isAccept, setIsAccept] = useState(true)
  const [highDifficultyDialog, setHighDifficultyDialog] = useState(false)
  const [isRevertDialogOpen, setIsRevertDialogOpen] = useState(false)
  const [openAssignQcDialog, setAssignQcDialog] = useState(false)
  const [waveformUrls, setWaveformUrls] = useState<Record<string, string>>({})
  const [diffDialogOpen, setDiffDialogOpen] = useState(false)
  const [fileId, setFileId] = useState('')

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

  const getScreeningOrders = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }
    try {
      const response = await fetchScreeningOrders()

      if (response.success && response.details) {
        const orders = response.details.map((order, index: number) => {
          const qcNames = order.Assignment.filter(
            (a) =>
              a.status === 'ACCEPTED' ||
              a.status === 'COMPLETED' ||
              a.status === 'SUBMITTED_FOR_APPROVAL'
          )
            .map((a) => `${a.user.firstname} ${a.user.lastname}`)
            .join(', ')

          fetchWaveformUrl(order.fileId)

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
            reportOption: order.reportOption,
            reportMode: order.reportMode,
            reportComment: order.reportComment,
            fileCost: order.fileCost,
            rateBonus: order.rateBonus,
            type: order.orderType,
            screenCount: order.screenCount,
          }
        }) as unknown as File[]
        setScreeningFiles(orders ?? [])
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
    getScreeningOrders(true)
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
        <div className='font-medium flex items-center gap-2'>
          <span>{row.getValue('index')}</span>
          {waveformUrls[row.original.fileId] && (
            <RowPlayButton 
              fileId={row.original.fileId} 
            />
          )}
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
            {row.original.screenCount > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant='outline'
                    className='font-semibold text-[10px] text-green-600'
                  >
                    {row.original.screenCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Screen Count</p>
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
      accessorKey: 'reportOption',
      header: 'Reason',
      cell: ({ row }) => (
        <div className='capitalize font-medium' style={{ minWidth: '200px', maxWidth: '200px' }}>
          {reportReasonMap[row.original.reportOption] || row.original.reportComment ? (
            <>
              {reportReasonMap[row.original.reportOption] && reportReasonMap[row.original.reportOption]}
              {row.original.reportComment && (
                <div className='text-xs text-gray-500 mt-1 italic'>
                  ({row.original.reportComment})
                </div>
              )}
            </>
          ) : (
            '-'
          )}
        </div>
      ),
    },
    {
      accessorKey: 'reportMode',
      header: 'Reported By',
      cell: ({ row }) => (
        <div className='capitalize font-medium'>{row.original.reportMode}</div>
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
      accessorKey: 'pwer',
      header: 'PWER',
      cell: ({ row }) => (
        <div className='font-medium'>
          {row.getValue('pwer')}
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
            onClick={() => {
              setOrderId(row.original.orderId.toString())
              setIsAccept(true)
              setOpenDialog(true)
            }}
          >
            Accept
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
                  setFileId(row.original.fileId)
                  setDiffDialogOpen(true)
                }}
              >
                Generate Diff
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedFileId(row.original.fileId)
                  setAssignQcDialog(true)
                }}
              >
                Assign Editor
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setOrderId(row.original.orderId.toString())
                  setHighDifficultyDialog(true)
                }}
              >
                Flag High Difficulty
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setOrderData({
                    fileId: row.original.fileId,
                    orderId: row.original.orderId,
                    currentPwer: row.original.pwer,
                  })
                  setIsRevertDialogOpen(true)
                }}
              >
                Revert to AssemblyAI Transcript
              </DropdownMenuItem>
              <DropdownMenuItem
                className='text-red-500'
                onClick={() => {
                  setOrderId(row.original.orderId.toString())
                  setIsAccept(false)
                  setOpenDialog(true)
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

  const renderWaveform = (row: File) => {
    if (!('fileId' in row)) return null
    const fileId = row.fileId as string
    if (!waveformUrls[fileId]) return null
    
    return (
      <AudioWaveformPlayer 
        fileId={fileId}
        waveformUrl={waveformUrls[fileId]}
        duration={row.duration}
      />
    )
  }

  return (
    <AudioProvider>
      <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex'>
        <div className='flex items-center justify-between space-y-2'>
          <div>
            <h1 className='text-lg font-semibold md:text-lg'>
              Available Screening Orders ({screeningFiles?.length})
            </h1>
          </div>
        </div>

        <DataTable
          data={screeningFiles ?? []}
          columns={columns}
          renderWaveform={renderWaveform}
        />
      </div>
      <AcceptRejectScreenFileDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        orderId={orderId || ''}
        refetch={() => getScreeningOrders()}
        isAccept={isAccept}
      />
      <FlagHighDifficulyDialog
        open={highDifficultyDialog}
        onClose={() => setHighDifficultyDialog(false)}
        orderId={orderId || ''}
        refetch={() => getScreeningOrders()}
      />
      <AssignQcDialog
        open={openAssignQcDialog}
        onClose={() => setAssignQcDialog(false)}
        fileId={selectedFileId || ''}
        refetch={() => getScreeningOrders()}
      />
      <RevertToAssemblyAITranscriptDialog
        open={isRevertDialogOpen}
        onClose={() => setIsRevertDialogOpen(false)}
        orderData={orderData}
        refetch={() => getScreeningOrders()}
      />
      <OpenDiffDialog
        open={diffDialogOpen}
        onClose={() => setDiffDialogOpen(false)}
        fileId={fileId || ''}
        isScreeningFile={true}
      />
    </AudioProvider>
  )
}