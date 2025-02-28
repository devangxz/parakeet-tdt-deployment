'use client'

import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { getCreditsInfo } from '@/app/actions/admin/revenue-dashboard/get-credits-info'
import {
  Dialog,
  DialogContent,
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

interface CreditsInfoModalProps {
  isOpen: boolean
  onClose: () => void
  startDate: Date
  endDate: Date
}

interface CreditData {
  id: string
  customerEmail: string
  amount: number
  date: string
  type: string
}

export function CreditsInfoModal({
  isOpen,
  onClose,
  startDate,
  endDate,
}: CreditsInfoModalProps) {
  const [credits, setCredits] = useState<CreditData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  async function loadCredits() {
    try {
      setIsLoading(true)
      const data = await getCreditsInfo(startDate, endDate)
      setCredits(data)
    } catch (error) {
      toast.error('Failed to load credits')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadCredits()
    }
  }, [isOpen, startDate, endDate])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl'>
        <DialogHeader>
          <DialogTitle>
            Credits Details ({format(startDate, 'MMM dd, yyyy')} -{' '}
            {format(endDate, 'MMM dd, yyyy')})
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className='text-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin mx-auto' />
          </div>
        ) : credits.length === 0 ? (
          <div className='text-center py-8 text-muted-foreground'>
            No credits found for the selected date range
          </div>
        ) : (
          <div className='max-h-[80vh] overflow-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Customer Email</TableHead>
                  <TableHead>Credit ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credits.map((credit, index) => (
                  <TableRow key={credit.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{credit.customerEmail}</TableCell>
                    <TableCell>{credit.id}</TableCell>
                    <TableCell>{credit.date}</TableCell>
                    <TableCell>
                      {credit.type === 'ADD_CREDITS'
                        ? 'Added Credits'
                        : 'Free Credits'}
                    </TableCell>
                    <TableCell>${credit.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
