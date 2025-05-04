/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { ColumnDef } from '@tanstack/react-table'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'

import { DataTable } from './data-table'
import { determinePwerLevel } from './utils'
import { getHistoryFiles } from '@/app/actions/cf/history'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import formatDuration from '@/utils/formatDuration'
import { getFormattedTimeStrings } from '@/utils/getFormattedTimeStrings'

interface File {
  jobId: number
  index: number
  orderId: number
  fileId: string
  filename: string
  orderTs: string
  pwer: number
  status: string
  priority: number | string
  qc_cost: number
  duration: number
  deliveryTs: string
  hd: boolean
  orderType: string
  rateBonus: number
  timeString: string
  dateString: string
  diff: string
  rate: number
  instructions: string | null
  orgName: string
  customFormatOption: string
  comment?: string
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

export default function HistoryFilesPage() {
  const [assignedFiles, setAssginedFiles] = useState<File[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()
  const isLegalPage = pathname === '/transcribe/legal-cf-reviewer'

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(
    null
  )

  // Cache state - store already loaded pages
  const cachedDataRef = useRef<CachedData>({})

  const getCacheKey = useCallback(
    (pageNum: number, size: number) => {
      return `${isLegalPage ? 'legal' : 'general'}_${pageNum}_${size}`
    },
    [isLegalPage]
  )

  const fetchFiles = useCallback(
    async (pageNum: number, size: number, forceRefresh = false) => {
      const cacheKey = getCacheKey(pageNum, size)

      // Check if data exists in cache and is not being force refreshed
      if (!forceRefresh && cachedDataRef.current[cacheKey]) {
        setAssginedFiles(cachedDataRef.current[cacheKey].data)
        setPaginationMeta(cachedDataRef.current[cacheKey].pagination)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const response = await getHistoryFiles(
          isLegalPage ? 'legal' : 'general',
          pageNum,
          size
        )

        if (response.success && response.data) {
          const orders = response.data.map((assignment: any, index: number) => {
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
            } as File
          })

          // Store in cache
          cachedDataRef.current[cacheKey] = {
            data: orders,
            pagination: response.pagination,
          }

          setAssginedFiles(orders)
          setPaginationMeta(response.pagination)
          setError(null)
        }
      } catch (err) {
        setError('an error occurred')
      } finally {
        setIsLoading(false)
      }
    },
    [isLegalPage, getCacheKey]
  )

  useEffect(() => {
    fetchFiles(page, pageSize)
  }, [fetchFiles, page, pageSize])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    // When changing page size, we need to reset to page 1 and potentially refetch data
    setPageSize(newPageSize)
    setPage(1)
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
        isLoading={isLoading}
        pagination={{
          currentPage: page,
          pageCount: paginationMeta?.pageCount || 1,
          pageSize: pageSize,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
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
