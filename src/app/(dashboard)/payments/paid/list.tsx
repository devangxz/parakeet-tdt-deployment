'use client'

import { ColumnDef } from '@tanstack/react-table'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

import { DataTable } from './components/data-table'
import ConsolidatedInvoiceModal from '@/components/consolidated-invoice-modal'
import PaymentsDetailsModal from '@/components/payment-details-modal'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import formatDateTime from '@/utils/formatDateTime'

interface Invoice {
  id: string
  amount: number
  date: string
}

const Invoice = ({ invoices }: { invoices: Invoice[] }) => {
  const { data: session } = useSession()
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')
  const [selectedInvoices, setSelectedInvoices] = useState<Invoice[]>([])
  const [openConsolidatedDialog, setOpenConsolidatedDialog] = useState(false)

  const columns: ColumnDef<Invoice>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Select row'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
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

  const details = (id: string) => {
    setSelectedInvoiceId(id)
    setOpenDetailsDialog(true)
  }

  const handleConsolidatedInvoice = () => {
    if (selectedInvoices.length === 0) {
      return
    }
    setOpenConsolidatedDialog(true)
  }

  return (
    <>
      <div className='h-full flex-1 flex-col p-4 md:flex space-y-3'>
        <div className='flex justify-between items-center'>
          <h1 className='text-lg font-semibold md:text-lg'>Paid Invoices</h1>
          <Button
            variant='order'
            className='not-rounded'
            onClick={handleConsolidatedInvoice}
            disabled={selectedInvoices.length === 0}
          >
            Consolidate
          </Button>
        </div>
        <DataTable
          data={invoices || []}
          columns={columns}
          onSelectedRowsChange={setSelectedInvoices}
        />
      </div>
      <PaymentsDetailsModal
        open={openDetailsDialog}
        onClose={() => setOpenDetailsDialog(false)}
        selectedInvoiceId={selectedInvoiceId}
        session={session!}
      />
      <ConsolidatedInvoiceModal
        open={openConsolidatedDialog}
        onClose={() => setOpenConsolidatedDialog(false)}
        selectedInvoiceIds={selectedInvoices.map((invoice) => invoice.id)}
        session={session!}
      />
    </>
  )
}

export default Invoice
