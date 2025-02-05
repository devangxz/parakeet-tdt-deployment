'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  getICQCRate,
  updateICQCRate,
} from '@/app/actions/admin/update-ic-qc-rates'
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

export default function UpdateICQCRates() {
  const [isSearchLoading, setSearchLoading] = useState(false)
  const [isUpdateLoading, setUpdateLoading] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [qcRate, setQcRate] = useState('0')
  const [cfRRate, setCfRRate] = useState('0')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserEmail(e.target.value)
  }

  const handleSearchClick = async () => {
    if (!userEmail) {
      toast.error('Please enter an email address.')
      return
    }

    if (!isValidEmail(userEmail)) {
      toast.error('Please enter a valid email address.')
      return
    }

    try {
      setSearchLoading(true)
      const response = await getICQCRate(userEmail.toLowerCase())

      if (response.success) {
        toast.success('Successfully got current ic qc rates.')
        setQcRate(response.qcRate?.toString() ?? '0')
        setCfRRate(response.cfRRate?.toString() ?? '0')
      } else {
        toast.error(response.message || 'Failed to get rates')
      }
    } catch (error) {
      toast.error('Failed to get rates')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleUpdateClick = async () => {
    if (!userEmail || !isValidEmail(userEmail)) {
      toast.error('Please enter a valid email address.')
      return
    }

    if (!qcRate || !cfRRate) {
      toast.error('Please enter rates.')
      return
    }

    try {
      setUpdateLoading(true)
      const response = await updateICQCRate(
        userEmail.toLowerCase(),
        parseFloat(qcRate),
        parseFloat(cfRRate)
      )

      if (response.success) {
        toast.success('Successfully updated rates.')
      } else {
        toast.error(response.message || 'Failed to update rates')
      }
    } catch (error) {
      toast.error('Failed to update rates')
    } finally {
      setUpdateLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>IC QC Rates</CardTitle>
          <CardDescription>
            Please enter the transcriber email address to see and update their
            ic qc rates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='userEmail'>Transcriber Email</Label>
              <Input
                id='userEmail'
                type='email'
                className='w-full'
                placeholder='test@email.com'
                value={userEmail}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {isSearchLoading ? (
            <Button disabled className='mt-5'>
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button className='mt-5 mb-3' onClick={handleSearchClick}>
              Search
            </Button>
          )}

          {qcRate !== '' && (
            <div className='mt-5'>
              <Label>QC Rate</Label>
              <Input
                className='mt-2'
                value={qcRate}
                onChange={(e) => setQcRate(e.target.value)}
                placeholder='Enter QC Rate'
              />

              <Label className='mt-4'>Custom Format Rate</Label>
              <Input
                className='mt-2'
                value={cfRRate}
                onChange={(e) => setCfRRate(e.target.value)}
                placeholder='Enter Custom Format Rate'
              />

              {isUpdateLoading ? (
                <Button disabled className='mt-3'>
                  Please wait
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                </Button>
              ) : (
                <Button className='mt-3' onClick={handleUpdateClick}>
                  Update
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
