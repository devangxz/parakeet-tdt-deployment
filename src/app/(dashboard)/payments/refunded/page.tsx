'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

import { DataTable } from './components/data-table'
import PaymentsDetailsModal from '@/components/payment-details-modal'
import { Button } from '@/components/ui/button'
import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'
import formatDateTime from '@/utils/formatDateTime'

interface Invoice {
  id: string
  amount: number
  date: string
}

const Invoice = () => {
  const { data: session } = useSession()
  const [refundedInvoices, setRefundedInvoices] = useState<Invoice[] | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')

  useEffect(() => {
    const fetchRefundedInvoices = async () => {
      setIsLoading(true)
      try {
        const response = await axiosInstance.get(
          `${BACKEND_URL}/invoices-history?refunds=1`
        )

        const invoices = response.data.data.map(
          (invoice: { id: string; amt: number; ts: string }) => ({
            id: invoice.id,
            amount: invoice.amt,
            date: invoice.ts,
          })
        )
        setRefundedInvoices(invoices ?? [])
        setError(null)
      } catch (err) {
        setError('an error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRefundedInvoices()
  }, [])

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: 'id',
      header: 'Invoice ID',
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('id')}</div>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <div className='font-medium'>
          {formatDateTime(row.getValue('date'))}
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <div className='font-medium'>${row.getValue('amount')}</div>
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
            className='not-rounded'
            onClick={() => details(row.original.id)}
          >
            Details
          </Button>
        </div>
      ),
    },
  ]

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
          height: '80vh',
        }}
      >
        <p>An Error Occured</p>
      </div>
    )
  }

  const details = (id: string) => {
    setSelectedInvoiceId(id)
    setOpenDetailsDialog(true)
  }

  return (
    <>
      <div className='space-y-6'>
        <div>
          <h1 className='text-lg font-semibold md:text-lg'>
            Refunded Invoices
          </h1>
        </div>
        <DataTable data={refundedInvoices || []} columns={columns} />
      </div>
      <PaymentsDetailsModal
        open={openDetailsDialog}
        onClose={() => setOpenDetailsDialog(false)}
        selectedInvoiceId={selectedInvoiceId}
        session={session!}
      />
    </>
  )
}

export default Invoice
