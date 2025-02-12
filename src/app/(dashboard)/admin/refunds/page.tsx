'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { refundFileAction } from '@/app/actions/admin/refund-file'
import { refundInvoiceAction } from '@/app/actions/admin/refund-invoice'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false)
  const [refundFile, setRefundFile] = useState({
    fileId: '',
    amount: 0,
  })
  const [refundInvoice, setRefundInvoice] = useState({
    invoiceId: '',
    amount: 0,
  })
  const [loadingRefundInvoice, setLoadingRefundInvoice] = useState(false)

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const response = await refundFileAction(
        refundFile.fileId,
        refundFile.amount
      )
      if (response.success) {
        toast.success('Successfully refunded the file.')
      } else {
        toast.error(response.s)
      }
    } catch (error) {
      toast.error('Failed to refund the file.')
    } finally {
      setLoading(false)
    }
  }

  const handleRefundInvoice = async () => {
    try {
      setLoadingRefundInvoice(true)
      const response = await refundInvoiceAction(
        refundInvoice.invoiceId,
        refundInvoice.amount
      )
      if (response.success) {
        toast.success('Successfully refunded the invoice.')
      } else {
        toast.error(response.s)
      }
    } catch (error) {
      toast.error('Failed to refund the invoice.')
    } finally {
      setLoadingRefundInvoice(false)
    }
  }

  return (
    <>
      <div className='h-full flex-1 flex-col space-y-8 p-5 md:flex'>
        <h1 className='text-lg font-semibold md:text-lg'>Refunds</h1>
        <Card>
          <CardHeader>
            <CardTitle>Refund File</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-6'>
              <div className='grid gap-3'>
                <Label htmlFor='email'>File id</Label>
                <Input
                  type='text'
                  className='w-full'
                  placeholder='File Id'
                  value={refundFile.fileId}
                  onChange={(e) =>
                    setRefundFile((prev) => ({
                      ...prev,
                      fileId: e.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-3'>
                <Label htmlFor='email'>Amount</Label>
                <Input
                  type='number'
                  className='w-full'
                  placeholder='Amount'
                  value={refundFile.amount}
                  onChange={(e) =>
                    setRefundFile((prev) => ({
                      ...prev,
                      amount: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            {loading ? (
              <Button disabled className='mt-5'>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </Button>
            ) : (
              <Button
                className='mt-5 mr-3'
                variant='destructive'
                onClick={handleSubmit}
              >
                Refund
              </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Refund Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-6'>
              <div className='grid gap-3'>
                <Label htmlFor='email'>Invoice id</Label>
                <Input
                  type='text'
                  className='w-full'
                  placeholder='Invoice Id'
                  value={refundInvoice.invoiceId}
                  onChange={(e) =>
                    setRefundInvoice((prev) => ({
                      ...prev,
                      invoiceId: e.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-3'>
                <Label htmlFor='email'>Amount</Label>
                <Input
                  type='number'
                  className='w-full'
                  placeholder='Amount'
                  value={refundInvoice.amount}
                  onChange={(e) =>
                    setRefundInvoice((prev) => ({
                      ...prev,
                      amount: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            {loadingRefundInvoice ? (
              <Button disabled className='mt-5'>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </Button>
            ) : (
              <Button
                className='mt-5 mr-3'
                variant='destructive'
                onClick={handleRefundInvoice}
              >
                Refund
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
