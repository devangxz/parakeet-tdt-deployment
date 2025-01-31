/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { diffWords } from 'diff'
import { ChevronDownIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { DataTable } from './data-table'
import { determinePwerLevel, determineRate } from './utils'
import { getFinalizerComments } from '@/app/actions/cf/finalizeComment'
import { getCompareFiles } from '@/app/actions/om/get-compare-files'
import { getHistoryQCFiles } from '@/app/actions/qc/history'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { LEGAL_QC_TRANSCRIBER_RATE } from '@/constants'
import { BaseTranscriberFile } from '@/types/files'
import formatDuration from '@/utils/formatDuration'
import { getFormattedTimeStrings } from '@/utils/getFormattedTimeStrings'

interface File extends BaseTranscriberFile {
  qc_cost: number
  jobId: number
  jobType: string
  orgName: string
}

export default function HistoryFilesPage() {
  const [assignedFiles, setAssginedFiles] = useState<File[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingFileOrder, setLoadingFileOrder] = useState<
    Record<number, boolean>
  >({})
  const [diff, setDiff] = useState('')
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false)
  const [finalizerComments, setFinalizerComments] = useState('')
  const [docxDiff, setDocxDiff] = useState<{ operation: string, text: string }[]>([])
  const [finalizerCommentModalOpen, setFinalizerCommentModalOpen] = useState(false)
  const pathname = usePathname()
  const isLegalQCPage = pathname === '/transcribe/legal-qc'

  const fetchFiles = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }
    try {
      const response = await getHistoryQCFiles(
        isLegalQCPage ? 'legal' : 'general'
      )

      if (response.success && response.data) {
        const orders = response.data
          .map((assignment: any, index: number) => {
            const diff = determinePwerLevel(assignment.order.pwer)
            const rate = determineRate(
              assignment.order.pwer,
              LEGAL_QC_TRANSCRIBER_RATE
            )

            const { timeString, dateString } = getFormattedTimeStrings(
              assignment.status === 'COMPLETED'
                ? assignment.completedTs?.toISOString()
                : assignment.status === 'ACCEPTED'
                  ? assignment.acceptedTs?.toISOString()
                  : assignment.cancelledTs?.toISOString()
            )

            return {
              jobId: assignment.id,
              index: index + 1,
              orderId: assignment.order.id,
              fileId: assignment.order.fileId,
              filename: assignment.order.File.filename,
              orderTs: assignment.order.orderTs,
              pwer: assignment.order.pwer,
              status: assignment.status,
              priority: assignment.order.priority,
              qc_cost: assignment.earnings,
              duration: assignment.order.File.duration,
              deliveryTs: assignment.order.deliveryTs,
              hd: assignment.order.highDifficulty,
              orderType: assignment.order.orderType,
              rateBonus: assignment.order.rateBonus,
              timeString,
              dateString,
              diff,
              rate,
              instructions: null,
              jobType: assignment.type,
              orgName: assignment.orgName,
            }
          })
          .sort(
            (a: { jobId: number }, b: { jobId: number }) => b.jobId - a.jobId
          )
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
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'duration',
      header: 'Price/Duration',
      cell: ({ row }) => (
        <div>
          <p>${row.original.qc_cost.toFixed(2)} </p>
          <p>{formatDuration(row.getValue('duration'))}</p>
        </div>
      ),
    },
    {
      accessorKey: 'dateString',
      header: 'Submitted On',
      cell: ({ row }) => (
        <div>
          <p>{row.original.timeString},</p>
          <p>{row.original.dateString}</p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div>
          <Badge
            variant='outline'
            className='font-semibold text-[12px] text-green-600'
          >
            {row.original.status}
          </Badge>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableHiding: false,
      cell: ({ row }) => (
        <div className='flex items-center'>
          {loadingFileOrder[row.original.index] ? (
            <Button
              disabled
              variant='order'
              className='format-button w-[140px]'
            >
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <>
              <Button
                className={`not-rounded w-[140px] ${row.original.jobType === 'REVIEW' ? 'format-button' : ''}`}
                variant='order'
                style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                onClick={() =>
                  diffHandler(row.original.fileId, row.original.index)
                }
              >
                Diff
              </Button>
              {row.original.jobType === 'REVIEW' && <DropdownMenu>
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
                  <DropdownMenuItem onClick={() => finalizerCommentHandler(row.original.fileId)}>
                    Finalizer Comments
                  </DropdownMenuItem>

                </DropdownMenuContent>
              </DropdownMenu>}
            </>
          )}
        </div>
      ),
    },
  ]

  function diffParagraphs(asrText: string, qcText: string) {
    // Split the texts into paragraphs
    const asrParagraphs = asrText.split('\n\n')
    const qcParagraphs = qcText.split('\n\n')
    // Find the maximum number of paragraphs
    const maxLength = Math.max(asrParagraphs.length, qcParagraphs.length)
    let diffResult = ''

    for (let i = 0; i < maxLength; i++) {
      const asrParagraph = asrParagraphs[i] || ''
      const qcParagraph = qcParagraphs[i] || ''
      const diffArray = diffWords(asrParagraph, qcParagraph)

      diffArray.forEach((part) => {
        const color = part.added ? 'added' : part.removed ? 'removed' : ''
        diffResult += `<span class="${color}">${part.value}</span>`
      })
      diffResult += '<br><br>'
    }

    return diffResult
  }

  const diffHandler = async (fileId: string, index: number) => {
    setLoadingFileOrder((prev) => ({ ...prev, [index]: true }))
    try {
      const res = await getCompareFiles('asr', 'qc', fileId)
      if (!res.success) {
        toast.error(res.message)
        return
      }
      const { reviewFile, verificationFile } = res
      const diff = diffParagraphs(reviewFile ?? '', verificationFile ?? '')
      setDiff(diff)
      setIsDiffModalOpen(true)
      toast.success('Diff loaded successfully')
    } catch (error) {
      toast.error('Failed to load diff')
    } finally {
      setLoadingFileOrder((prev) => ({ ...prev, [index]: false }))
    }
  }

  const finalizerCommentHandler = async (fileId: string) => {
    const res = await getFinalizerComments(fileId)
    if (res.success && res.finalizerComment) {
      setFinalizerComments(res.finalizerComment)
      setFinalizerCommentModalOpen(true)
      if (res.diffData) setDocxDiff(res.diffData)
    } else if (res.success && !res.finalizerComment) {
      toast.error('No finalizer comment found.')
    } else if (!res.success) {
      toast.error('Failed to fetch finalizer comment.')
    }
  }

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
      <Dialog open={isDiffModalOpen} onOpenChange={setIsDiffModalOpen}>
        <DialogContent className='sm:max-w-[792px]'>
          <DialogHeader>
            <DialogTitle>Diff Between ASR and QC</DialogTitle>
            <DialogDescription className='pt-10'>
              <div dangerouslySetInnerHTML={{ __html: diff }} />
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={finalizerCommentModalOpen} onOpenChange={setFinalizerCommentModalOpen}>
        <DialogContent className='sm:max-w-[792px]'>
          <DialogHeader>
            <DialogTitle>Finalizer feedback</DialogTitle>
            <DialogDescription>Comments from the finalizer on your file.</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500 mb-2">Comments made by finalizer:</p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{finalizerComments}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500 mb-2">Changes made by finalizer:</p>
            <div className="max-h-[400px] overflow-y-auto rounded-lg border border-gray-200 p-4">
              <pre className="whitespace-pre-wrap break-words text-sm">
                {docxDiff.map((diff, index) => (
                  <span
                    key={index}
                    className={
                      diff.operation === 'removed'
                        ? 'bg-red-100 line-through'
                        : diff.operation === 'added'
                          ? 'bg-green-100'
                          : ''
                    }
                  >
                    {diff.text}
                  </span>
                ))}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
