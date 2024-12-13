'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { transferCreditAction } from '@/app/actions/admin/transfer-credit'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import isValidEmail from '@/utils/isValidEmail'

export default function TransferCredits() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    invoiceId: '',
    email: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prevData) => ({ ...prevData, [id]: value }))
  }

  const handleChangeClick = async () => {
    if (!formData.email) {
      toast.error('Please enter a email address.')
      return
    }

    if (!isValidEmail(formData.email)) {
      toast.error('Please enter a valid email address.')
      return
    }

    if (!formData.invoiceId) {
      toast.error('Please enter an invoice id.')
      return
    }

    try {
      setLoading(true)
      const response = await transferCreditAction(
        formData.invoiceId,
        formData.email.toLowerCase()
      )

      if (response.success) {
        toast.success('Successfully transferred credits.')
      } else {
        toast.error(response.s || 'Failed to transfer credits')
      }
    } catch (error) {
      toast.error('Failed to transfer credits')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Transfer Credits</CardTitle>
          <CardDescription>
            Please enter the invoice id of the credit to transfer. Access the
            customer and go to credits section in settings page. Then in the
            credit history section, you can get the add credits invoice id which
            has to be transfer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='invoiceId'>Invoice Id</Label>
              <Input
                id='invoiceId'
                type='text'
                className='w-full'
                placeholder='Enter invoice id'
                value={formData.invoiceId}
                onChange={handleInputChange}
              />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                className='w-full'
                placeholder='Enter email address'
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
          </div>
          {loading ? (
            <Button disabled className='mt-5'>
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button className='mt-5' onClick={handleChangeClick}>
              Transfer
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
