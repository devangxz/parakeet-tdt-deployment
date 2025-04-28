/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

import { DataTable } from './data-table'
import { determinePwerLevel } from './utils'
import { getHistoryFiles } from '@/app/actions/cf/history'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { BaseTranscriberFile } from '@/types/files'
import formatDuration from '@/utils/formatDuration'
import { getFormattedTimeStrings } from '@/utils/getFormattedTimeStrings'

interface File extends BaseTranscriberFile {
  qc_cost: number
  jobId: number
  orgName: string
  customFormatOption: string
  comment?: string
}

export default function HistoryFilesPage() {
  const [assignedFiles, setAssginedFiles] = useState<File[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()
  const isLegalPage = pathname === '/transcribe/legal-cf-reviewer'

  const fetchFiles = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }
    try {
      const response = await getHistoryFiles(isLegalPage ? 'legal' : 'general')

      if (response.success && response.data) {
        const orders = response.data
          .map((assignment: any, index: number) => {
            const diff = determinePwerLevel(assignment.order.pwer)

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
              rate: assignment.earnings,
              instructions: null,
              orgName: assignment.orgName,
              customFormatOption: assignment.customFormatOption,
              comment: assignment.comment ?? '',
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
  ]

  return (
    <>
      <DataTable
        data={assignedFiles ?? []}
        columns={columns}
        renderRowSubComponent={({ row }: { row: any }) =>
          row.original.instructions || row.original.comment ? (
            <div className='p-2'>
              <>
                {row.original.instructions && (
                  <>
                    <strong>Customer Instructions:</strong>
                    <p>{row.original.instructions}</p>
                  </>
                )}
                {row.original.comment && (
                  <>
                    <strong className='mt-2 block'>Admin Comments:</strong>
                    <p>{row.original.comment}</p>
                  </>
                )}
              </>
            </div>
          ) : null
        }
      />
    </>
  )
}
