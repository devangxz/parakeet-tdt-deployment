'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

import InvoiceNavbar from '@/components/navbar/invoice'
import { getOrderComponent } from '@/utils/getOrderComponent'

interface InvoiceParams {
  invoice_id: string
}

interface InvoiceProps {
  params: InvoiceParams
}

const Invoice = ({ params }: InvoiceProps) => {
  const { data: session } = useSession()
  const { invoice_id } = params
  const searchParams = useSearchParams()

  const orderType = searchParams?.get('orderType') || ''

  if (!session) {
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

  const OrderComponent = getOrderComponent(orderType)

  return (
    <div style={{ height: '80vh' }}>
      <InvoiceNavbar
        orderType={
          orderType === 'TRANSCRIPTION' ? 'Transcribe' : 'Custom Format'
        }
      />
      <OrderComponent invoiceId={invoice_id} />
    </div>
  )
}

export default Invoice
