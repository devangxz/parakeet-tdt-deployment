'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { AxiosError } from 'axios'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'

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
      const response = await axiosInstance.post(
        `${BACKEND_URL}/admin/refund-file`,
        {
          fileId: refundFile.fileId,
          amount: refundFile.amount,
        }
      )
      if (response.status === 200) {
        if (response.data.success) {
          toast.success('Successfully refunded the file.')
          setLoading(false)
        } else {
          toast.error(response.data.message)
          setLoading(false)
        }
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.message)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Failed to refund the file.`)
      }
      setLoading(false)
    }
  }

  const handleRefundInvoice = async () => {
    try {
      setLoadingRefundInvoice(true)
      const response = await axiosInstance.post(
        `${BACKEND_URL}/admin/refund-invoice`,
        {
          invoiceId: refundInvoice.invoiceId,
          amount: refundInvoice.amount,
        }
      )
      if (response.status === 200) {
        if (response.data.success) {
          toast.success('Successfully refunded the invoice.')
          setLoadingRefundInvoice(false)
        } else {
          toast.error(response.data.message)
          setLoadingRefundInvoice(false)
        }
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.message)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Failed to refund the invoice.`)
      }
      setLoadingRefundInvoice(false)
    }
  }

  return (
    <>
      <div className='h-full flex-1 flex-col space-y-8 p-5 md:flex bg-muted/40'>
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
