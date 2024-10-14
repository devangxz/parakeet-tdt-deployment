/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerSession } from 'next-auth/next'

import List from './list'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { getInvoicesHistory } from '@/services/invoice-service/get-invoices-history'

interface Invoice {
  id: string
  amount: number
  date: string
}

export default async function RefundInvoicePage() {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const userId = user?.internalTeamUserId || user?.userId
  const response = await getInvoicesHistory(userId as number, true)
  let invoices: Invoice[] = []

  if (response?.success && response.data) {
    invoices = response.data.map((invoice: any) => ({
      id: invoice.id,
      amount: invoice.amt,
      date: invoice.ts,
    }))
  }

  return (
    <>
      <List invoices={invoices} />
    </>
  )
}
