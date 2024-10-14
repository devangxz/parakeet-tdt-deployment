'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import axios, { AxiosError } from 'axios'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: '',
    userId: '',
    fileIds: '',
    rate: 0.5,
  })
  const [invoiceUrl, setInvoiceUrl] = useState('')

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const response = await axios.post(`/api/admin/generate-invoice`, {
        data: formData,
      })
      if (response.data.success) {
        toast.success('Successfully generated invoice.')
        setInvoiceUrl(response.data.url)
        setLoading(false)
        setInvoiceUrl(response.data.invoiceId)
      } else {
        toast.error(response.data.message)
        setLoading(false)
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.message)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Failed to generate invoice.`)
      }
      setLoading(false)
    }
  }

  return (
    <>
      <div className='h-full flex-1 flex-col space-y-8 p-5 md:flex bg-muted/40'>
        <h1 className='text-lg font-semibold md:text-lg'>Generate Invoice</h1>
        <Card>
          <CardContent className='mt-3'>
            <div className='grid gap-6'>
              <div className='grid gap-3'>
                <Label htmlFor='email'>Type</Label>
                <Select
                  onValueChange={(value) => {
                    setFormData((prev) => ({ ...prev, type: value }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select Type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ADDL_FORMATTING'>
                      Additional Formatting
                    </SelectItem>
                    <SelectItem value='ADDL_PROOFREADING'>
                      Additional Proofreading
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-3'>
                <Label htmlFor='email'>User Id</Label>
                <Input
                  type='text'
                  className='w-full'
                  placeholder='User Id'
                  value={formData.userId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, userId: e.target.value }))
                  }
                />
              </div>
              <div className='grid gap-3'>
                <Label htmlFor='email'>File Id(s)</Label>
                <Input
                  type='text'
                  className='w-full'
                  placeholder='File Id(s)'
                  value={formData.fileIds}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      fileIds: e.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-3'>
                <Label htmlFor='email'>Rate / min</Label>
                <Input
                  type='number'
                  className='w-full'
                  placeholder='File Id(s)'
                  value={formData.rate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      rate: Number(e.target.value),
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
              <Button className='mt-5 mr-3' onClick={handleSubmit}>
                Generate
              </Button>
            )}
            {invoiceUrl && (
              <p className='mt-3'>
                Invoice Url:{' '}
                <a
                  href={`https://${window.location.host}/payments/pending?id=${invoiceUrl}`}
                >{`https://${window.location.host}/payments/pending?id=${invoiceUrl}`}</a>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
