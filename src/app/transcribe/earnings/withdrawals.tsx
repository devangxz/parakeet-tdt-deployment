'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { useState, useEffect } from 'react'

import { DataTable } from '../components/data-table'
import { Badge } from '@/components/ui/badge'
import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'
import { getFormattedTimeStrings } from '@/utils/getFormattedTimeStrings'

interface Withdrawals {
  id: number
  userId: number
  amount: number | null
  fee: number | null
  invoiceId: string | null
  toPaypalId: string | null
  status: string
  requestedAt: string
  completedAt: string
  ppAddFundsInv: string | null
}

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawals[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWithdrawals = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }
    try {
      const response = await axiosInstance.get(`${BACKEND_URL}/get-withdrawals`)
      setWithdrawals(response.data.withdrawals)
    } catch (err) {
      setError('an error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWithdrawals(true)
  }, [])

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
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
          height: '20vh',
        }}
      >
        <p>An Error Occured</p>
      </div>
    )
  }

  const columns: ColumnDef<Withdrawals>[] = [
    {
      accessorKey: 'slNo',
      header: 'Sl. No.',
      cell: ({ row }) => row.index + 1,
    },
    {
      accessorKey: 'id',
      header: 'Details',
      cell: ({ row }) => {
        const { timeString, dateString } = getFormattedTimeStrings(
          row.original.requestedAt
        )
        return (
          <div>
            <p>
              ${row.original.amount?.toFixed(2)} (fee $
              {row.original.fee?.toFixed(5)})
            </p>
            <p>{row.original.invoiceId}</p>
            <p>
              {dateString} {timeString}
            </p>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div>
          <Badge>{row.original.status}</Badge>
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable data={withdrawals ?? []} columns={columns} />
    </>
  )
}
