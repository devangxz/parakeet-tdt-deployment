'use client'

import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { DatePicker } from './components/date-picker'
import { DeliveriesChart } from './components/deliveries-chart'
import { fetchQCStats } from '@/app/actions/admin/qc-stats'
import { Button } from '@/components/ui/button'

interface QCStats {
  t: [number, number][]
  d: [number, string][]
  a: { t: number }
}

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState<Date>(
    new Date(new Date().setDate(new Date().getDate() - 10))
  )
  const [toDate, setToDate] = useState<Date>(new Date())

  const [stats, setStats] = useState<QCStats | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFetchStats = async () => {
    setLoading(true)
    try {
      const formattedFromDate = format(fromDate, 'yyyy-MM-dd')
      const formattedToDate = format(toDate, 'yyyy-MM-dd')
      const result = await fetchQCStats(formattedFromDate, formattedToDate)
      setStats(result)
    } catch (error) {
      console.error('Failed to fetch QC stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='h-full flex-1 flex-col space-y-8 p-5 md:flex'>
      <h1 className='text-lg font-semibold md:text-lg'>Reports</h1>
      <div className='flex justify-center items-center w-full'>
        <div className='max-w-md w-full'>
          <div className='flex flex-col space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <div>
                <label
                  htmlFor='from-date'
                  className='text-sm font-medium mb-1 block'
                >
                  From
                </label>
                <DatePicker
                  date={fromDate}
                  setDate={setFromDate}
                  placeholder='From date'
                />
              </div>
              <div>
                <label
                  htmlFor='to-date'
                  className='text-sm font-medium mb-1 block'
                >
                  To
                </label>
                <DatePicker
                  date={toDate}
                  setDate={setToDate}
                  placeholder='To date'
                />
              </div>
            </div>

            <div className='flex justify-center'>
              <Button
                onClick={handleFetchStats}
                disabled={loading}
                className='w-full md:w-full not-rounded'
              >
                {loading ? (
                  <Loader2 className='h-4 w-4 animate-spin mr-2' />
                ) : null}
                {loading ? 'Loading...' : 'Deliveries'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className='rounded-lg border'>
        {stats && (
          <div className='mt-6 text-center'>
            <p className='text-lg text-muted-foreground mb-2'>
              Total:{' '}
              <span className='font-medium'>{stats.a.t.toFixed(2)} Hours</span>{' '}
              <span className='text-sm'>
                ({(stats.a.t / stats.t.length).toFixed(2)} Hours/day)
              </span>
            </p>
            <DeliveriesChart data={stats} />
          </div>
        )}
      </div>
    </div>
  )
}
