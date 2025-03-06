'use client'

import { format } from 'date-fns'
import { Loader2, Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { getOrgRevenue } from '@/app/actions/admin/revenue-dashboard/get-org-revenue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { exportToExcel } from '@/lib/excel-export'
import formatDuration from '@/utils/formatDuration'

interface RevenueDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  startDate: Date
  endDate: Date
}

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

export function RevenueDetailsModal({
  isOpen,
  onClose,
  startDate,
  endDate,
}: RevenueDetailsModalProps) {
  const [orders, setOrders] = useState<OrderData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  async function loadOrders() {
    try {
      setIsLoading(true)
      const data = await getOrgRevenue(startDate, endDate, 'No Organization')
      setOrders(data)
    } catch (error) {
      toast.error('Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadOrders()
    }
  }, [isOpen, startDate, endDate])

  function handleDownloadExcel() {
    const exportData = orders.map((order) => ({
      'Customer Email': order.customerEmail,
      'File ID': order.fileId,
      'File Name': order.fileName,
      'Order Date': order.orderDate,
      'Delivery Date': order.deliveryDate || '',
      Status: order.status,
      Duration: formatDuration(order.duration),
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

    exportToExcel(
      exportData,
      `revenue-details-${format(startDate, 'yyyy-MM-dd')}-to-${format(
        endDate,
        'yyyy-MM-dd'
      )}`
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-7xl'>
        <DialogHeader>
          <div className='flex flex-col gap-2'>
            <DialogTitle>
              Revenue Details ({format(startDate, 'MMM dd, yyyy')} -{' '}
              {format(endDate, 'MMM dd, yyyy')})
            </DialogTitle>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className='text-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin mx-auto' />
          </div>
        ) : orders.length === 0 ? (
          <div className='text-center py-8 text-muted-foreground'>
            No orders found for the selected date range
          </div>
        ) : (
          <div className='max-h-[80vh] overflow-auto'>
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
                {orders.map((order, index) => (
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
                    <TableCell>{formatDuration(order.duration)}</TableCell>
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
                    <TableCell>{order.marginPercentage.toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <DialogFooter>
          <Button
            variant='order'
            className='not-rounded'
            onClick={handleDownloadExcel}
          >
            <Download className='h-4 w-4 mr-2' />
            Download Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
