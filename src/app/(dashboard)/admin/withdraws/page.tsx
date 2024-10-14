'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import axios from 'axios'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { DataTable } from './components/data-table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import formatDateTime from '@/utils/formatDateTime'

interface Withdrawal {
  id: number
  userId: number
  amount: number
  fee: number
  invoiceId: string
  toPaypalId: string
  status: string
  requestedAt: string
}

export default function WithdrawalPage() {
  const [pendingWithdrawals, setPendingWithdrawals] = useState<
    Withdrawal[] | null
  >(null)
  const [initiatedWithdrawals, setInitiatedWithdrawals] = useState<
    Withdrawal[] | null
  >(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitiatedLoading, setIsInitiatedLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingInitiateWithdrawal, setLoadingInitiateWithdrawal] =
    useState(false)
  const [loadingCompleteWithdrawal, setLoadingCompleteWithdrawal] =
    useState(false)

  const fetchPendingWithdrawals = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }

    try {
      const response = await axios.get(`/api/admin/get-pending-withdrawals`)

      if (response.data.success) {
        const withdrawals = response.data.withdrawals.map(
          (withdrawal: {
            id: number
            userId: number
            amount: number
            fee: number
            invoiceId: string
            toPaypalId: string
            status: string
            requestedAt: string
          }) => ({
            id: withdrawal.id,
            userId: withdrawal.userId,
            amount: Number(
              withdrawal.amount ? withdrawal.amount.toFixed(2) : 0
            ),
            fee: Number(withdrawal.fee ? withdrawal.fee.toFixed(2) : 0),
            invoiceId: withdrawal.invoiceId,
            toPaypalId: withdrawal.toPaypalId,
            status: withdrawal.status,
            requestedAt: withdrawal.requestedAt,
          })
        )
        setPendingWithdrawals(withdrawals ?? [])
        setError(null)
      } else {
        toast.error(response.data.s)
        setError('an error occurred')
      }
    } catch (err) {
      setError('an error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchInitiatedWithdrawals = async (showLoader = false) => {
    if (showLoader) {
      setIsInitiatedLoading(true)
    } else {
      setIsInitiatedLoading(false)
    }

    try {
      const response = await axios.get(`/api/admin/get-initiated-withdrawals`)

      if (response.data.success) {
        const withdrawals = response.data.withdrawals.map(
          (withdrawal: {
            id: number
            userId: number
            amount: number
            fee: number
            invoiceId: string
            toPaypalId: string
            status: string
            requestedAt: string
          }) => ({
            id: withdrawal.id,
            userId: withdrawal.userId,
            amount: Number(
              withdrawal.amount ? withdrawal.amount.toFixed(2) : 0
            ),
            fee: Number(withdrawal.fee ? withdrawal.fee.toFixed(2) : 0),
            invoiceId: withdrawal.invoiceId,
            toPaypalId: withdrawal.toPaypalId,
            status: withdrawal.status,
            requestedAt: withdrawal.requestedAt,
          })
        )
        setInitiatedWithdrawals(withdrawals ?? [])
        setError(null)
      } else {
        toast.error(response.data.s)
        setError('an error occurred')
      }
    } catch (err) {
      setError('an error occurred')
    } finally {
      setIsInitiatedLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingWithdrawals(true)
    fetchInitiatedWithdrawals(true)
  }, [])

  const [selectedPendingWithdrawals, setSelectedPendingWithdrawals] = useState<
    string[]
  >([])

  const [selectedInitiatedWithdrawals, setSelectedInitiatedWithdrawals] =
    useState<string[]>([])

  const handleSelectedRowsChange = (selectedRowsData: Withdrawal[]) => {
    setSelectedPendingWithdrawals(
      selectedRowsData.map((withdrawal) => withdrawal.invoiceId)
    )
  }

  const handleSelectedInitiatedRowsChange = (
    selectedRowsData: Withdrawal[]
  ) => {
    setSelectedInitiatedWithdrawals(
      selectedRowsData.map((withdrawal) => withdrawal.invoiceId)
    )
  }

  if (isLoading || isInitiatedLoading) {
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

  const columns: ColumnDef<Withdrawal>[] = [
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
      accessorKey: 'toPaypalId',
      header: 'Paypal Id',
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('toPaypalId')}</div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <div className='capitalize font-medium'>${row.getValue('amount')}</div>
      ),
    },
    {
      accessorKey: 'fee',
      header: 'Fee',
      cell: ({ row }) => (
        <div className='capitalize font-medium'>${row.getValue('fee')}</div>
      ),
    },
    {
      accessorKey: 'requestedAt',
      header: 'Date',
      cell: ({ row }) => (
        <div className='font-medium'>
          {formatDateTime(row.getValue('requestedAt'))}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('status')}</div>
      ),
    },
  ]

  const initiatedColumns: ColumnDef<Withdrawal>[] = [
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
      accessorKey: 'toPaypalId',
      header: 'Paypal Id',
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('toPaypalId')}</div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <div className='capitalize font-medium'>${row.getValue('amount')}</div>
      ),
    },
    {
      accessorKey: 'fee',
      header: 'Fee',
      cell: ({ row }) => (
        <div className='capitalize font-medium'>${row.getValue('fee')}</div>
      ),
    },
    {
      accessorKey: 'requestedAt',
      header: 'Date',
      cell: ({ row }) => (
        <div className='font-medium'>
          {formatDateTime(row.getValue('requestedAt'))}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('status')}</div>
      ),
    },
  ]

  const handleInitiatePayment = async () => {
    if (selectedPendingWithdrawals.length === 0) {
      toast.error('Please select at least one withdrawal to initiate payment')
      return
    }
    try {
      setLoadingInitiateWithdrawal(true)
      const response = await axios.post(`/api/admin/initiate-withdrawal`, {
        invoiceIds: selectedPendingWithdrawals,
      })
      if (response.data.success) {
        toast.success('Successfully initiated withdrawal.')
        setLoadingInitiateWithdrawal(false)
        fetchPendingWithdrawals()
        fetchInitiatedWithdrawals()
      } else {
        toast.error(response.data.message || 'Failed to initiate withdrawal.')
        setLoadingInitiateWithdrawal(false)
      }
    } catch (error) {
      toast.error('Failed initiate withdrawal.')
      setLoadingInitiateWithdrawal(false)
    }
  }

  const handleCompletePayment = async () => {
    if (selectedInitiatedWithdrawals.length === 0) {
      toast.error('Please select at least one withdrawal to complete payment')
      return
    }
    try {
      setLoadingCompleteWithdrawal(true)
      const response = await axios.post(`/api/admin/complete-withdrawal`, {
        invoiceIds: selectedInitiatedWithdrawals,
      })
      if (response.data.success) {
        toast.success('Successfully completed withdrawal.')
        setLoadingCompleteWithdrawal(false)
        fetchInitiatedWithdrawals()
      } else {
        toast.error(response.data.message || 'Failed to complete withdrawal.')
        setLoadingCompleteWithdrawal(false)
      }
    } catch (error) {
      toast.error('Failed to complete withdrawal.')
      setLoadingCompleteWithdrawal(false)
    }
  }

  return (
    <>
      <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex bg-muted/40'>
        <div className='flex items-center justify-between space-y-2'>
          <div className='flex items-center gap-5'>
            <h1 className='text-lg font-semibold md:text-lg'>
              Pending Withdrawals ({pendingWithdrawals?.length})
            </h1>{' '}
            <br />
            <p>
              Total: $
              {pendingWithdrawals
                ?.reduce((sum, withdrawal) => sum + withdrawal.amount, 0)
                .toFixed(2) ?? 0}
            </p>
          </div>
          <div className='flex items-center space-x-2'>
            {loadingInitiateWithdrawal ? (
              <Button
                disabled
                variant='order'
                className='w-[160px] not-rounded'
              >
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </Button>
            ) : (
              <Button
                variant='order'
                className='not-rounded w-[160px]'
                onClick={() => {
                  handleInitiatePayment()
                }}
              >
                Initiated Payment
              </Button>
            )}
          </div>
        </div>
        <DataTable
          data={pendingWithdrawals ?? []}
          columns={columns}
          onSelectedRowsChange={handleSelectedRowsChange}
        />
      </div>
      <div className='bg-muted/40'>
        <Separator className='mb-5' />
      </div>
      <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex bg-muted/40'>
        <div className='flex items-center justify-between space-y-2'>
          <div className='flex items-center gap-5'>
            <h1 className='text-lg font-semibold md:text-lg'>
              Initiated Withdrawals ({initiatedWithdrawals?.length})
            </h1>{' '}
            <br />
            <p>
              Total: $
              {initiatedWithdrawals
                ?.reduce((sum, withdrawal) => sum + withdrawal.amount, 0)
                .toFixed(2) ?? 0}
            </p>
          </div>
          <div className='flex items-center space-x-2'>
            {loadingCompleteWithdrawal ? (
              <Button
                disabled
                variant='order'
                className='w-[160px] not-rounded'
              >
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </Button>
            ) : (
              <Button
                variant='order'
                className='not-rounded w-[160px]'
                onClick={() => {
                  handleCompletePayment()
                }}
              >
                Complete Payment
              </Button>
            )}
          </div>
        </div>
        <DataTable
          data={initiatedWithdrawals ?? []}
          columns={initiatedColumns}
          onSelectedRowsChange={handleSelectedInitiatedRowsChange}
        />
      </div>
    </>
  )
}
