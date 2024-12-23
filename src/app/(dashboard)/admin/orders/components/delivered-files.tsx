'use client'
import { CalendarIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'

import { DataTable } from './data-table'
import { fetchDeliveredOrders } from '@/app/actions/om/fetch-delivered-orders'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { HIGH_PWER, LOW_PWER } from '@/constants'
import { cn } from '@/lib/utils'
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
}

export default function DeliveredSection() {
  const [deliveredOrders, setDeliveredOrders] = useState<File[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const today = new Date()
  const [date, setDate] = useState<Date>(today)

  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getDeliveredOrders = async () => {
    try {
      const response = await fetchDeliveredOrders(formatDate(date))

      if (response.success && response.details) {
        const orders = response.details.map((order, index: number) => {
          const qcNames = order.Assignment.filter(
            (a) => a.status === 'ACCEPTED' || a.status === 'COMPLETED'
          )
            .map((a) => `${a.user.firstname} ${a.user.lastname}`)
            .join(', ')

          return {
            index: index + 1,
            orderId: order.id,
            fileId: order.fileId,
            filename: order.File?.filename || '-',
            orderTs: order.orderTs.toISOString(),
            pwer: order.pwer || 0,
            status: order.status,
            priority: order.priority,
            duration: order.File?.duration || 0,
            qc: qcNames || '-',
            deliveryTs: order.deliveryTs.toISOString(),
            hd: order.highDifficulty ?? false,
          }
        })
        setDeliveredOrders(orders ?? [])
        setError(null)
      } else {
        setError(response.message || 'An error occurred')
      }
    } catch (err) {
      setError('An error occurred')
    }
  }

  useEffect(() => {
    getDeliveredOrders()
  }, [date])

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
        <div className='font-medium'>{row.getValue('index')}</div>
      ),
    },
    {
      accessorKey: 'fileId',
      header: 'File Id',
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('fileId')}</div>
      ),
    },
    {
      accessorKey: 'id',
      header: 'Filename',
      cell: ({ row }) => (
        <div>
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
                  className='font-semibold text-[10px] text-green-600'
                >
                  {row.original.pwer ? row.original.pwer.toFixed(2) : '-'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>PWER</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ row }) => (
        <div className='font-medium'>
          {formatDuration(row.getValue('duration'))}
        </div>
      ),
    },
    {
      accessorKey: 'qc',
      header: 'Delivered By',
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
  ]

  const handleDateSelection = (date: Date | undefined) => {
    if (date) {
      setDate(date)
    }
  }

  return (
    <>
      <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex'>
        <div className='flex items-center justify-between space-y-2'>
          <div>
            <h1 className='text-lg font-semibold md:text-lg'>
              Delivered Orders ({deliveredOrders?.length})
            </h1>
          </div>
          <div className='flex items-center space-x-2'>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-[220px] justify-start text-left font-normal not-rounded',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='single'
                  selected={date}
                  onSelect={handleDateSelection}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DataTable data={deliveredOrders ?? []} columns={columns} />
      </div>
    </>
  )
}
