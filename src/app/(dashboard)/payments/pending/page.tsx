'use client'

import { ChevronDownIcon, ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { DataTable } from './components/data-table'
import AddCreditsDialog from '@/components/pay-add-credits'
import AdditionalProofreadingDialog from '@/components/pay-additional-charge-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import formatDateTime from '@/utils/formatDateTime'

interface Invoice {
  id: string
  amount: number
  date: string
  type: string
}

const Invoice = () => {
  const { data: session } = useSession()
  const [pendingInvoices, setPendingInvoices] = useState<Invoice[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false)
  const [
    openAdditionalProofreadingDialog,
    setOpenAdditionalProofreadingDialog,
  ] = useState(false)
  const [clientToken, setClientToken] = useState<string | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [loadingFileOrder, setLoadingFileOrder] = useState<
    Record<string, boolean>
  >({})
  const fetchPendingInvoices = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(`/api/invoice/pending`)

      const invoices = response.data.data.map(
        (invoice: { id: string; amt: number; ts: string; t: string }) => ({
          id: invoice.id,
          amount: invoice.amt,
          date: invoice.ts,
          type: invoice.t,
        })
      )
      setPendingInvoices(invoices ?? [])
      setError(null)
    } catch (err) {
      setError('an error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingInvoices()
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
        <>
          {row.original.type === 'ADD_CREDITS' ? (
            <div className='flex items-center'>
              {loadingFileOrder[row.original.id] ? (
                <Button
                  disabled
                  variant='order'
                  className='format-button  w-[140px]'
                >
                  Please wait
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                </Button>
              ) : (
                <Button
                  variant='order'
                  className='format-button w-[140px]'
                  onClick={() => {
                    setSelectedInvoice(row.original)
                    payAddCredits(row.original.id)
                  }}
                >
                  Pay Now
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='order'
                    className='h-9 w-8 p-0 format-icon-button'
                  >
                    <span className='sr-only'>Open menu</span>
                    <ChevronDownIcon className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem
                    onClick={() => deleteInvoice(row.original.id)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              {loadingFileOrder[row.original.id] ? (
                <Button
                  disabled
                  variant='order'
                  className='format-button  w-[140px]'
                >
                  Please wait
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                </Button>
              ) : (
                <Button
                  variant='order'
                  className='format-button w-[140px]'
                  onClick={() => {
                    setSelectedInvoice(row.original)
                    payAdditionalCharge(row.original.id)
                  }}
                >
                  Pay Now
                </Button>
              )}
            </>
          )}
        </>
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

  const payAddCredits = async (id: string) => {
    try {
      setLoadingFileOrder((prev) => ({ ...prev, [id]: true }))
      const tokenResponse = await axios.get(`/api/payment/client-token`)
      setClientToken(tokenResponse.data.clientToken)
      setLoadingFileOrder((prev) => ({ ...prev, [id]: false }))
      setOpenDetailsDialog(true)
    } catch (error) {
      setLoadingFileOrder((prev) => ({ ...prev, [id]: false }))
      toast.error(`Failed to pay: ${error}`)
    }
  }

  const payAdditionalCharge = async (id: string) => {
    try {
      setLoadingFileOrder((prev) => ({ ...prev, [id]: true }))
      const tokenResponse = await axios.get(`/api/payment/client-token`)
      setClientToken(tokenResponse.data.clientToken)
      setLoadingFileOrder((prev) => ({ ...prev, [id]: false }))
      setOpenAdditionalProofreadingDialog(true)
    } catch (error) {
      setLoadingFileOrder((prev) => ({ ...prev, [id]: false }))
      toast.error(`Failed to pay: ${error}`)
    }
  }

  const deleteInvoice = async (id: string) => {
    try {
      const response = await axios.post(`/api/invoice/delete`, {
        invoiceId: id,
      })
      if (response.status === 200) {
        const tId = toast.success(response.data.s)
        toast.dismiss(tId)
        fetchPendingInvoices()
      } else {
        toast.error('Failed to delete invoice. Please try again.')
      }
    } catch (error) {
      toast.error(`Failed to delete invoice: ${error}`)
    }
  }

  return (
    <>
      <div className='space-y-6'>
        <div>
          <h1 className='text-lg font-semibold md:text-lg'>Pending Invoices</h1>
        </div>
        <DataTable data={pendingInvoices || []} columns={columns} />
      </div>
      <AddCreditsDialog
        open={openDetailsDialog}
        onClose={() => {
          setOpenDetailsDialog(false)
          fetchPendingInvoices()
        }}
        clientToken={clientToken!}
        session={session!}
        invoiceId={selectedInvoice?.id as string}
        amount={selectedInvoice?.amount.toString() as string}
      />
      <AdditionalProofreadingDialog
        open={openAdditionalProofreadingDialog}
        onClose={() => {
          setOpenAdditionalProofreadingDialog(false)
          fetchPendingInvoices()
        }}
        clientToken={clientToken!}
        session={session!}
        invoiceId={selectedInvoice?.id as string}
        amount={selectedInvoice?.amount.toString() as string}
      />
    </>
  )
}

export default Invoice
