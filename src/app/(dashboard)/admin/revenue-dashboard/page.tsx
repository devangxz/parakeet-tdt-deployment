'use client'

import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { DateRange } from 'react-day-picker'

import { getRevenue } from '@/app/actions/admin/revenue-dashboard/get-revenue'
import { DateRangePicker } from '@/components/date-range-picker'
import { RevenueDetailsModal } from '@/components/revenue-details-modal'
import { CreditsInfoModal } from '@/components/revenue-details-modal/credits-info-modal'
import { Button } from '@/components/ui/button'
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

type TimeFrame = 'daily' | 'weekly' | 'monthly'

export default function RevenueDashboard() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [metrics, setMetrics] = useState<
    Awaited<ReturnType<typeof getRevenue>>
  >([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const [timeFrame, setTimeFrame] = useState<TimeFrame>('daily')

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

  async function loadRevenueData(from: Date, to: Date, timeFrame: TimeFrame) {
    setIsLoading(true)
    try {
      const data = await getRevenue(from, to, timeFrame)
      setMetrics(data.reverse())
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
    loadRevenueData(
      dateRange.from ?? new Date(),
      dateRange.to ?? new Date(),
      timeFrame
    )
  }, [])

  function handleTimeFrameChange(value: TimeFrame) {
    const today = new Date()
    let from: Date
    switch (value) {
      case 'monthly':
        from = subMonths(today, 10)
        break
      case 'weekly':
        from = subWeeks(today, 10)
        break
      default:
        from = subDays(today, 10)
    }
    setDateRange({ from, to: today })
    setTimeFrame(value)
    loadRevenueData(from, today, value)
  }

  async function handleLoadMore() {
    if (metrics.length === 0 || isLoadingMore) return

    setIsLoadingMore(true)
    const oldestDate = new Date(metrics[metrics.length - 1].date)
    const dayBeforeOldest = subDays(oldestDate, 1)
    let newFrom: Date
    switch (timeFrame) {
      case 'monthly':
        newFrom = subMonths(dayBeforeOldest, 10)
        break
      case 'weekly':
        newFrom = subWeeks(dayBeforeOldest, 10)
        break
      default:
        newFrom = subDays(dayBeforeOldest, 10)
    }

    try {
      const newData = await getRevenue(newFrom, dayBeforeOldest, timeFrame)
      setMetrics((prev) => [...prev, ...newData.reverse()])
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

  const handleRevenueClick = (date: string, isRevenue: boolean) => {
    let startDate: Date, endDate: Date

    if (timeFrame === 'daily') {
      startDate = new Date(date)
      endDate = new Date(date)
    } else if (timeFrame === 'weekly') {
      startDate = startOfWeek(new Date(date))
      endDate = endOfWeek(new Date(date))
    } else {
      startDate = startOfMonth(new Date(date))
      endDate = endOfMonth(new Date(date))
    }

    setSelectedDates({ startDate, endDate })
    if (isRevenue) {
      setRevenueModalOpen(true)
    } else {
      setCreditsModalOpen(true)
    }
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
            Revenue Dashboard
          </h1>
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div className='flex gap-2'>
              <Button
                variant={timeFrame === 'daily' ? 'default' : 'order'}
                onClick={() => handleTimeFrameChange('daily')}
                className='not-rounded'
              >
                Daily
              </Button>
              <Button
                variant={timeFrame === 'weekly' ? 'default' : 'order'}
                onClick={() => handleTimeFrameChange('weekly')}
                className='not-rounded'
              >
                Weekly
              </Button>
              <Button
                variant={timeFrame === 'monthly' ? 'default' : 'order'}
                onClick={() => handleTimeFrameChange('monthly')}
                className='not-rounded'
              >
                Monthly
              </Button>
            </div>
            <DateRangePicker
              value={dateRange}
              onChange={(value) => {
                setDateRange(value ?? { from: new Date(), to: new Date() })
                loadRevenueData(
                  value?.from ?? new Date(),
                  value?.to ?? new Date(),
                  'daily'
                )
              }}
              onUpdate={() => {}}
            />
          </div>

          <div className='rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Day of Week</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>New Customers</TableHead>
                  <TableHead>Credits Added</TableHead>
                  <TableHead>QC Hours</TableHead>
                  <TableHead>CF Hours</TableHead>
                  <TableHead className='text-right'>ASR Cost</TableHead>
                  <TableHead className='text-right'>QC Cost</TableHead>
                  <TableHead className='text-right'>Review Cost</TableHead>
                  <TableHead className='text-right'>CF Cost</TableHead>
                  <TableHead className='text-right'>Daily Bonus</TableHead>
                  <TableHead className='text-right'>Other Bonus</TableHead>
                  <TableHead className='text-right'>Total Cost</TableHead>
                  <TableHead className='text-right'>Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={13} className='text-center py-8'>
                      <Loader2 className='h-8 w-8 animate-spin mx-auto' />
                    </TableCell>
                  </TableRow>
                ) : metrics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className='text-center py-8'>
                      No data available for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.map((metric) => (
                    <TableRow key={metric.date}>
                      <TableCell>
                        {format(new Date(metric.date), 'PP')}
                      </TableCell>
                      <TableCell>{metric.dayOfWeek}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleRevenueClick(metric.date, true)}
                          className='text-primary hover:underline'
                        >
                          {formatCurrency(metric.revenue)}
                        </button>
                      </TableCell>
                      <TableCell>{metric.orderCount}</TableCell>
                      <TableCell>{metric.newCustomers}</TableCell>
                      <TableCell>
                        <TableCell>
                          <button
                            onClick={() =>
                              handleRevenueClick(metric.date, false)
                            }
                            className='text-primary hover:underline'
                          >
                            {formatCurrency(metric.totalCreditsAdded)}
                          </button>
                        </TableCell>
                      </TableCell>
                      <TableCell>{metric.hours.qc.toFixed(2)}</TableCell>
                      <TableCell>
                        {(metric.hours.review + metric.hours.cf).toFixed(2)}
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(metric.costs.asr)}
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(metric.costs.qc)}
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(metric.costs.cfReview)}
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(metric.costs.cf)}
                      </TableCell>

                      <TableCell className='text-right'>
                        {formatCurrency(metric.bonus.daily)}
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(metric.bonus.other)}
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(metric.totalCost)}
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(metric.margin)} (
                        {metric.marginPercentage.toFixed(2)}%)
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
