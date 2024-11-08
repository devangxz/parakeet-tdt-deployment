'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import axios, { AxiosError } from 'axios'
import { useState } from 'react'
import { toast } from 'sonner'

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

export default function TransferFiles() {
  const [formData, setFormData] = useState({
    fileIds: '',
    userEmail: '',
  })
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prevData) => ({ ...prevData, [id]: value }))
  }

  const handleTransferClick = async () => {
    const { fileIds, userEmail } = formData

    if (!fileIds || !userEmail) {
      toast.error('Please fill in all fields.')
      return
    }

    if (!isValidEmail(userEmail)) {
      toast.error('Please enter a valid email address.')
      return
    }

    try {
      setLoading(true)
      const response = await axios.post(`/api/admin/transfer-files`, {
        userEmail,
        fileIds,
      })
      if (response.data.success) {
        toast.success('Files transferred successfully')
        setLoading(false)
      } else {
        toast.error(response.data.s)
        setLoading(false)
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Failed to transfer file.`)
      }
      setLoading(false)
    }
  }
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Transfer Files</CardTitle>
          <CardDescription>
            Please enter the file ids and the email address to transfer files
            from one account to another. The file id can be found in the upload
            started/finished email alerts or from the user&apos;s account.
            Access the account and choose permalink option in the dropdown menu
            for the file. The last part of the link is the file id. To transfer
            multiple files, separate each file id with commas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='fileIds'>File Ids</Label>
              <Input
                id='fileIds'
                type='text'
                className='w-full'
                placeholder='File Ids'
                value={formData.fileIds}
                onChange={handleInputChange}
              />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='userEmail'>User Email</Label>
              <Input
                id='userEmail'
                type='email'
                className='w-full'
                placeholder='test@email.com'
                value={formData.userEmail}
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
            <Button className='mt-5' onClick={handleTransferClick}>
              Transfer
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
