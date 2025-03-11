'use client'

import { subDays } from 'date-fns'
import { Loader2, Download } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { DateRange } from 'react-day-picker'

import { DataTableFacetedFilter } from './components/filter'
import { getOrgRevenue } from '@/app/actions/admin/revenue-dashboard/get-org-revenue'
import { DateRangePicker } from '@/components/date-range-picker'
import { RevenueDetailsModal } from '@/components/revenue-details-modal'
import { CreditsInfoModal } from '@/components/revenue-details-modal/credits-info-modal'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { REVENUE_DASHBOARD_EMAILS } from '@/constants'
import { exportToExcel } from '@/lib/excel-export'

type Organization = 'REMOTELEGAL' | 'ACR'

interface OrderData {
  orderId: string
  fileId: string
  fileName: string
  orderDate: string
  deliveryDate: string | null
  amount: number
  status: string
  duration: number
  pwer: number
  workers: {
    qc: string[]
    review: string[]
    cf: string[]
  }
  costs: {
    asr: number
    qc: number
    cf: number
    cfReview: number
    fileBonus: number
  }
  totalCost: number
  margin: number
  marginPercentage: number
  customerEmail: string
}

const statusOptions = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'TRANSCRIBED', label: 'Transcribed' },
  { value: 'QC_ASSIGNED', label: 'QC Assigned' },
  { value: 'QC_COMPLETED', label: 'QC Completed' },
  { value: 'FORMATTED', label: 'Formatted' },
  { value: 'REVIEWER_ASSIGNED', label: 'Reviewer Assigned' },
  { value: 'REVIEW_COMPLETED', label: 'Review Completed' },
  { value: 'FINALIZER_ASSIGNED', label: 'Finalizer Assigned' },
  { value: 'FINALIZING_COMPLETED', label: 'Finalizing Completed' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'PRE_DELIVERED', label: 'Pre-delivered' },
  { value: 'SUBMITTED_FOR_APPROVAL', label: 'Submitted for Approval' },
  { value: 'SUBMITTED_FOR_SCREENING', label: 'Submitted for Screening' },
]

export default function RevenueDashboard() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [metrics, setMetrics] = useState<OrderData[]>([])
  const [filteredMetrics, setFilteredMetrics] = useState<OrderData[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const [selectedOrg, setSelectedOrg] = useState<Organization>('REMOTELEGAL')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: subDays(new Date(), 10),
    to: new Date(),
  }))
  const [selectedDates, setSelectedDates] = useState<{
    startDate: Date | null
    endDate: Date | null
  }>({ startDate: null, endDate: null })
  const [revenueModalOpen, setRevenueModalOpen] = useState(false)
  const [creditsModalOpen, setCreditsModalOpen] = useState(false)

  async function loadRevenueData(from: Date, to: Date) {
    setIsLoading(true)
    try {
      const data = await getOrgRevenue(from, to, selectedOrg)
      setMetrics(data)
      setFilteredMetrics(data)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to load revenue data',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRevenueData(dateRange.from ?? new Date(), dateRange.to ?? new Date())
  }, [selectedOrg])

  useEffect(() => {
    if (selectedStatuses.length === 0) {
      setFilteredMetrics(metrics)
    } else {
      setFilteredMetrics(
        metrics.filter((order) => selectedStatuses.includes(order.status))
      )
    }
  }, [selectedStatuses, metrics])

  async function handleLoadMore() {
    if (metrics.length === 0 || isLoadingMore) return

    setIsLoadingMore(true)
    const endDate = dateRange.from ?? new Date()
    const newFrom = subDays(endDate, 10)

    try {
      const newData = await getOrgRevenue(newFrom, endDate, selectedOrg)
      setMetrics((prev) => [...prev, ...newData])
      setDateRange((prev) => ({
        from: newFrom,
        to: prev.to ?? new Date(),
      }))
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load more data',
      })
    } finally {
      setIsLoadingMore(false)
    }
  }

  function handleDownloadExcel() {
    const exportData = filteredMetrics.map((order) => ({
      'Customer Email': order.customerEmail,
      'File ID': order.fileId,
      'File Name': order.fileName,
      'Order Date': order.orderDate,
      'Delivery Date': order.deliveryDate || '',
      Status: order.status,
      'Duration (hours)': (order.duration / 3600).toFixed(2),
      PWER: order.pwer,
      QC: order.workers.qc.join(', '),
      'CF Review': order.workers.review.join(', '),
      'CF Finalize': order.workers.cf.join(', '),
      'ASR Cost': order.costs.asr,
      'QC Cost': order.costs.qc,
      'Review Cost': order.costs.cfReview,
      'CF Cost': order.costs.cf,
      'File Bonus': order.costs.fileBonus,
      Amount: order.amount,
      'Total Cost': order.totalCost,
      Margin: order.margin,
      'Margin %': order.marginPercentage,
    }))

    exportToExcel(exportData, `${selectedOrg.toLowerCase()}-revenue`)
  }

  return (
    <>
      {session?.user?.role !== 'ADMIN' ||
      !REVENUE_DASHBOARD_EMAILS.includes(session?.user?.email ?? '') ? (
        <>
          <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex'>
            <h1 className='text-lg font-semibold md:text-lg'>
              You are not authorized to access this page
            </h1>
          </div>
        </>
      ) : (
        <div className='h-full flex-1 flex-col space-y-8 p-5 md:flex'>
          <h1 className='text-lg font-semibold md:text-lg'>
            Organization Revenue Dashboard
          </h1>
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div className='flex gap-2 items-center'>
              <Select
                value={selectedOrg}
                onValueChange={(value) => setSelectedOrg(value as Organization)}
              >
                <SelectTrigger className='w-[180px]'>
                  <SelectValue placeholder='Select Organization' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='REMOTELEGAL'>REMOTELEGAL</SelectItem>
                  <SelectItem value='ACR'>ACR</SelectItem>
                </SelectContent>
              </Select>

              <DataTableFacetedFilter
                title='Status'
                options={statusOptions}
                value={selectedStatuses}
                onChange={setSelectedStatuses}
              />

              <Button
                variant='order'
                size='lg'
                onClick={handleDownloadExcel}
                disabled={isLoading || filteredMetrics.length === 0}
                className='not-rounded'
              >
                <Download className='h-4 w-4 mr-2' />
                Download Excel
              </Button>
            </div>
            <DateRangePicker
              value={dateRange}
              onChange={(value) => {
                setDateRange(value ?? { from: new Date(), to: new Date() })
                loadRevenueData(
                  value?.from ?? new Date(),
                  value?.to ?? new Date()
                )
              }}
              onUpdate={() => {}}
            />
          </div>

          <div className='rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Customer Email</TableHead>
                  <TableHead>File ID</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>PWER</TableHead>
                  <TableHead>QC</TableHead>
                  <TableHead>CF Review</TableHead>
                  <TableHead>CF Finalize</TableHead>
                  <TableHead>ASR Cost</TableHead>
                  <TableHead>QC Cost</TableHead>
                  <TableHead>Review Cost</TableHead>
                  <TableHead>CF Cost</TableHead>
                  <TableHead>File Bonus</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={20} className='text-center py-8'>
                      <Loader2 className='h-8 w-8 animate-spin mx-auto' />
                    </TableCell>
                  </TableRow>
                ) : filteredMetrics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={20} className='text-center py-8'>
                      No data available for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMetrics.map((order, index) => (
                    <TableRow key={order.orderId}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{order.customerEmail}</TableCell>
                      <TableCell>{order.fileId}</TableCell>
                      <TableCell
                        className='max-w-[200px] truncate'
                        title={order.fileName}
                      >
                        {order.fileName}
                      </TableCell>
                      <TableCell>{order.orderDate}</TableCell>
                      <TableCell>{order.deliveryDate || '-'}</TableCell>
                      <TableCell>{order.status}</TableCell>
                      <TableCell>
                        {(order.duration / 3600).toFixed(2)}
                      </TableCell>
                      <TableCell>{order.pwer}</TableCell>
                      <TableCell
                        className='max-w-[150px] truncate'
                        title={order.workers.qc.join(', ')}
                      >
                        {order.workers.qc.join(', ') || '-'}
                      </TableCell>
                      <TableCell
                        className='max-w-[150px] truncate'
                        title={order.workers.review.join(', ')}
                      >
                        {order.workers.review.join(', ') || '-'}
                      </TableCell>
                      <TableCell
                        className='max-w-[150px] truncate'
                        title={order.workers.cf.join(', ')}
                      >
                        {order.workers.cf.join(', ') || '-'}
                      </TableCell>
                      <TableCell>${order.costs.asr.toFixed(2)}</TableCell>
                      <TableCell>${order.costs.qc.toFixed(2)}</TableCell>
                      <TableCell>${order.costs.cfReview.toFixed(2)}</TableCell>
                      <TableCell>${order.costs.cf.toFixed(2)}</TableCell>
                      <TableCell>${order.costs.fileBonus.toFixed(2)}</TableCell>
                      <TableCell>${order.amount.toFixed(2)}</TableCell>
                      <TableCell>${order.totalCost.toFixed(2)}</TableCell>
                      <TableCell>${order.margin.toFixed(2)}</TableCell>
                      <TableCell>
                        {order.marginPercentage.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className='flex justify-center mt-4'>
            <Button
              onClick={handleLoadMore}
              variant='order'
              disabled={isLoadingMore || metrics.length === 0}
              className='not-rounded'
            >
              {isLoadingMore ? (
                <Loader2 className='h-4 w-4 animate-spin mr-2' />
              ) : null}
              Load More
            </Button>
          </div>
        </div>
      )}

      {selectedDates.startDate && selectedDates.endDate && (
        <RevenueDetailsModal
          isOpen={revenueModalOpen}
          onClose={() => {
            setSelectedDates({ startDate: null, endDate: null })
            setRevenueModalOpen(false)
          }}
          startDate={selectedDates.startDate}
          endDate={selectedDates.endDate}
        />
      )}
      {selectedDates.startDate && selectedDates.endDate && (
        <CreditsInfoModal
          isOpen={creditsModalOpen}
          onClose={() => {
            setSelectedDates({ startDate: null, endDate: null })
            setCreditsModalOpen(false)
          }}
          startDate={selectedDates.startDate}
          endDate={selectedDates.endDate}
        />
      )}
    </>
  )
}
