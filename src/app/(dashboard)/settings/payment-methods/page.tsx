'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { CreditCard } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { DataTable } from './components/data-table'
import { getClientTokenAction } from '@/app/actions/payment/client-token'
import { getPaymentMethods } from '@/app/actions/payment/get-payment-methods'
import { removePaymentMethod } from '@/app/actions/payment/remove-payment-method'
import AddPaymentMethodDialog from '@/components/add-payment-method'
import HeadingDescription from '@/components/heading-description'
import { Button } from '@/components/ui/button'

interface PaymentMethod {
  id: number
  type: string
  image_url: string
  detail: string
  token: string
}

const Invoice = () => {
  const { data: session, status } = useSession()
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[] | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingFileOrder, setLoadingFileOrder] = useState<
    Record<string, boolean>
  >({})
  const [clientToken, setClientToken] = useState<string>('')
  const [isAddPaymentMethodLoading, setIsAddPaymentMethodLoading] =
    useState(false)

  const fetchPaymentMethods = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }

    try {
      const response = await getPaymentMethods()

      if (response.success && response.pms) {
        const paymentMethods = response.pms.map(
          (
            pm: {
              type: string
              token: string
              last4: string | null
              ppAccount: string | null
              image: string
              desc: string
            },
            index: number
          ) => ({
            id: index + 1,
            type: pm.type,
            image_url: pm.image,
            detail: pm.desc,
            token: pm.token,
          })
        )
        setPaymentMethods(paymentMethods ?? [])
        setError(null)
      }
    } catch (err) {
      setError('an error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPaymentMethods(true)
  }, [status])

  const columns: ColumnDef<PaymentMethod>[] = [
    {
      id: 'id',
      header: 'SL.',
      cell: ({ row }) => <div className='font-medium'>{row.original.id}</div>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <div className='font-medium flex items-center gap-3'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={row.original.image_url} alt='pm' width={24} height={24} />
          {row.getValue('type') === 'CC' ? 'Card' : 'Paypal'}
        </div>
      ),
    },
    {
      accessorKey: 'detail',
      header: 'Detail',
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('detail')}</div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableHiding: false,
      cell: ({ row }) => (
        <div className='flex items-center'>
          {loadingFileOrder[row.original.id] ? (
            <Button
              disabled
              variant='outline'
              className='border-2 border-customBorder not-rounded w-[140px]'
            >
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button
              variant='outline'
              className='border-2 border-customBorder not-rounded w-[140px]'
              onClick={() => {
                handleRemovePaymentMethod(
                  row.original.id.toString(),
                  row.original.token
                )
              }}
            >
              Delete
            </Button>
          )}
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

  const handleAddPaymentMethod = async () => {
    try {
      setIsAddPaymentMethodLoading(true)
      const response = await getClientTokenAction()
      if (response.success && response.clientToken) {
        setClientToken(response.clientToken)
        setOpenDetailsDialog(true)
      }
    } catch (error) {
      toast.error(`Failed to get client token: ${error}`)
    } finally {
      setIsAddPaymentMethodLoading(false)
    }
  }

  const handleRemovePaymentMethod = async (id: string, token: string) => {
    try {
      setLoadingFileOrder((prev) => ({ ...prev, [id]: true }))
      const response = await removePaymentMethod({ token })
      if (response.success) {
        toast.success(response.message)
        fetchPaymentMethods()
      }
    } catch (error) {
      toast.error(`Failed to remove payment method: ${error}`)
    } finally {
      setLoadingFileOrder((prev) => ({ ...prev, [id]: false }))
    }
  }

  const refetch = () => {
    fetchPaymentMethods()
  }

  return (
    <>
      <div className='flex flex-1 flex-col p-4 gap-5'>
        <div className='border-b-2 border-customBorder space-y-4 pb-6'>
          <HeadingDescription
            heading='Add Payment Method'
            description='The following are your stored payment methods. Please click the
              Add button to add a new method.'
          />
          {isAddPaymentMethodLoading ? (
            <Button
              disabled
              variant='outline'
              className='not-rounded border-2 border-customBorder w-[240px]'
            >
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button
              variant='outline'
              className='not-rounded border-2 border-customBorder w-[240px]'
              onClick={() => {
                handleAddPaymentMethod()
              }}
            >
              <CreditCard className='mr-2' /> Add new payment method
            </Button>
          )}
        </div>

        <div className='space-y-4'>
          <HeadingDescription heading='Saved Payment Methods' />
          <DataTable data={paymentMethods || []} columns={columns} />
        </div>
      </div>
      <AddPaymentMethodDialog
        open={openDetailsDialog}
        onClose={() => {
          setOpenDetailsDialog(false)
          refetch()
        }}
        clientToken={clientToken}
        session={session!}
      />
    </>
  )
}

export default Invoice
