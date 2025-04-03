'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { generateInvoiceAction } from '@/app/actions/admin/generate-invoice'
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
import isValidEmail from '@/utils/isValidEmail'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: '',
    userEmail: '',
    fileIds: '',
    rate: 0.5,
  })
  const [invoiceUrl, setInvoiceUrl] = useState('')

  const handleSubmit = async () => {
    if (!formData.userEmail) {
      toast.error('Please enter a email address.')
      return
    }

    if (!isValidEmail(formData.userEmail)) {
      toast.error('Please enter a valid email address.')
      return
    }
    try {
      setLoading(true)
      const response = await generateInvoiceAction(formData)
      if (response.success) {
        toast.success('Successfully generated invoice.')
        setInvoiceUrl(response.invoiceId || '')
      } else {
        toast.error(response.s)
      }
    } catch (error) {
      toast.error('Failed to generate invoice.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className='h-full flex-1 flex-col space-y-8 p-5 md:flex'>
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
                <Label htmlFor='email'>User Email</Label>
                <Input
                  type='text'
                  className='w-full'
                  placeholder='User Email'
                  value={formData.userEmail}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      userEmail: e.target.value,
                    }))
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
