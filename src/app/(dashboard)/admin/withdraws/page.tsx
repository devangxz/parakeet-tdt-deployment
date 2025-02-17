'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { DataTable } from './components/data-table'
import { completeWithdrawalAction } from '@/app/actions/admin/complete-withdrawal'
import { fetchPaypalAmount } from '@/app/actions/admin/fetch-paypal-amount'
import { getInitiatedWithdrawalsAction } from '@/app/actions/admin/get-initiated-withdrawals'
import { getPendingWithdrawalsAction } from '@/app/actions/admin/get-pending-withdrawals'
import { initiateWithdrawalAction } from '@/app/actions/admin/initiate-withdrawal'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ADMIN_EMAILS } from '@/constants'

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

const formatDateTimePST = (dateString: string) => {
  const date = new Date(dateString)

  const time = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles', // PST timezone
  }).format(date)

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Los_Angeles', // PST timezone
  }).format(date)

  return `${time}, ${formattedDate}`
}

export default function WithdrawalPage() {
  const { data: session } = useSession()

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

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`
  })
  const [paypalAmount, setPaypalAmount] = useState<number | null>(null)
  const [loadingPaypalAmount, setLoadingPaypalAmount] = useState(false)

  const fetchPendingWithdrawals = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }

    try {
      const response = await getPendingWithdrawalsAction()

      if (response.success && response.withdrawals) {
        const withdrawals = response.withdrawals.map((withdrawal) => ({
          id: withdrawal.id,
          userId: withdrawal.userId,
          amount: Number(withdrawal.amount ? withdrawal.amount.toFixed(2) : 0),
          fee: Number(withdrawal.fee ? withdrawal.fee.toFixed(2) : 0),
          invoiceId: withdrawal.invoiceId ?? '',
          toPaypalId: withdrawal.toPaypalId ?? '',
          status: withdrawal.status,
          requestedAt: withdrawal.requestedAt.toISOString(),
        }))
        setPendingWithdrawals(withdrawals ?? [])
        setError(null)
      } else {
        toast.error(response.s)
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
      const response = await getInitiatedWithdrawalsAction()

      if (response.success && response.withdrawals) {
        const withdrawals = response.withdrawals.map((withdrawal) => ({
          id: withdrawal.id,
          userId: withdrawal.userId,
          amount: Number(withdrawal.amount ? withdrawal.amount.toFixed(2) : 0),
          fee: Number(withdrawal.fee ? withdrawal.fee.toFixed(2) : 0),
          invoiceId: withdrawal.invoiceId ?? '',
          toPaypalId: withdrawal.toPaypalId ?? '',
          status: withdrawal.status,
          requestedAt: withdrawal.requestedAt.toISOString(),
        }))
        setInitiatedWithdrawals(withdrawals ?? [])
        setError(null)
      } else {
        toast.error(response.s)
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
    Withdrawal[]
  >([])
  const [selectedInitiatedWithdrawals, setSelectedInitiatedWithdrawals] =
    useState<Withdrawal[]>([])

  const handleSelectedRowsChange = (selectedRowsData: Withdrawal[]) => {
    setSelectedPendingWithdrawals(selectedRowsData)
  }

  const handleSelectedInitiatedRowsChange = (
    selectedRowsData: Withdrawal[]
  ) => {
    setSelectedInitiatedWithdrawals(selectedRowsData)
  }

  const handleFetchPaypalAmount = async () => {
    if (!selectedMonth) {
      toast.error('Please select a valid month.')
      return
    }
    const [year, month] = selectedMonth.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    endDate.setHours(23, 59, 59, 999)

    setLoadingPaypalAmount(true)
    try {
      const response = await fetchPaypalAmount({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })
      setPaypalAmount(response)
      toast.success('Fetched PayPal amount successfully.')
    } catch (err) {
      toast.error('Failed to fetch PayPal amount.')
    } finally {
      setLoadingPaypalAmount(false)
    }
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
          {formatDateTimePST(row.getValue('requestedAt'))}
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
          {formatDateTimePST(row.getValue('requestedAt'))}
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
      const response = await initiateWithdrawalAction(
        selectedPendingWithdrawals.map((w) => w.invoiceId)
      )
      if (response.success) {
        toast.success('Successfully initiated withdrawal.')
        setLoadingInitiateWithdrawal(false)
        fetchPendingWithdrawals()
        fetchInitiatedWithdrawals()
        setSelectedPendingWithdrawals([])
      } else {
        toast.error(response.s || 'Failed to initiate withdrawal.')
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
      const response = await completeWithdrawalAction(
        selectedInitiatedWithdrawals.map((w) => w.invoiceId)
      )
      if (response.success) {
        toast.success('Successfully completed withdrawal.')
        setLoadingCompleteWithdrawal(false)
        fetchInitiatedWithdrawals()
        setSelectedInitiatedWithdrawals([])
      } else {
        toast.error(response.s || 'Failed to complete withdrawal.')
        setLoadingCompleteWithdrawal(false)
      }
    } catch (error) {
      toast.error('Failed to complete withdrawal.')
      setLoadingCompleteWithdrawal(false)
    }
  }

  return (
    <>
      {session?.user?.role !== 'ADMIN' ||
      !ADMIN_EMAILS.includes(session?.user?.email ?? '') ? (
        <>
          <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex'>
            <h1 className='text-lg font-semibold md:text-lg'>
              You are not authorized to access this page
            </h1>
          </div>
        </>
      ) : (
        <>
          <div className='p-8'>
            <div className='mb-4'>
              <h2 className='text-lg font-semibold md:text-lg'>
                Fetch PayPal Amount Paid
              </h2>
            </div>
            <div className=''>
              <input
                type='month'
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className='p-2 border rounded'
              />{' '}
              <br />
              <Button
                variant='order'
                className='not-rounded mt-4'
                onClick={handleFetchPaypalAmount}
                disabled={loadingPaypalAmount}
              >
                {loadingPaypalAmount ? (
                  <>
                    Fetching
                    <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                  </>
                ) : (
                  'Fetch Amount'
                )}
              </Button>
            </div>
            {paypalAmount !== null && (
              <p className='mt-3 text-base'>
                Total Amount Paid: <b>${paypalAmount.toFixed(2)}</b>
              </p>
            )}
          </div>
          <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex'>
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
                <p>
                  Selected: $
                  {selectedPendingWithdrawals
                    .reduce((sum, withdrawal) => sum + withdrawal.amount, 0)
                    .toFixed(2)}
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
          <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex'>
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
                <p>
                  Selected: $
                  {selectedInitiatedWithdrawals
                    .reduce((sum, withdrawal) => sum + withdrawal.amount, 0)
                    .toFixed(2)}
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
      )}
    </>
  )
}
