'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { addInstructions } from '@/app/actions/admin/add-instructions'
import { getUserInfoAction } from '@/app/actions/admin/get-user-info'
import { updateUserIndustry } from '@/app/actions/admin/update-industry'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { INDUSTRIES } from '@/constants'

type UserData = Record<string, string | number | boolean | null>

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState('')
  const [userData, setUserData] = useState<UserData | null>(null)
  const [instructions, setInstructions] = useState('')
  const [savingInstructions, setSavingInstructions] = useState(false)
  const [industry, setIndustry] = useState('')
  const [otherIndustry, setOtherIndustry] = useState('')
  const [updatingIndustry, setUpdatingIndustry] = useState(false)
  const [showOtherIndustryInput, setShowOtherIndustryInput] = useState(false)

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const response = await getUserInfoAction(formData)
      if (response.success && response.details) {
        setUserData(response.details)
        const userIndustry = response.details['Industry'] || ''
        if (INDUSTRIES.includes(userIndustry)) {
          setIndustry(userIndustry)
          setOtherIndustry('')
          setShowOtherIndustryInput(false)
        } else {
          setIndustry('Other')
          setOtherIndustry(userIndustry)
          setShowOtherIndustryInput(true)
        }
        setInstructions(response.details['Spl instructions'] || '')
        toast.success('Fetched user info successfully.')
      } else {
        toast.error(response.s)
      }
    } catch (error) {
      toast.error(`Failed to fetch user info.`)
    } finally {
      setLoading(false)
    }
  }

  const handleInstructions = async () => {
    try {
      setSavingInstructions(true)
      const response = await addInstructions(formData, instructions)
      if (response.success) {
        toast.success('Instructions added/modified successfully.')
      } else {
        toast.error(response.s)
      }
    } catch (error) {
      toast.error('Failed to add/modify instructions.')
    } finally {
      setSavingInstructions(false)
    }
  }

  const handleIndustry = async () => {
    if (!industry && !otherIndustry)
      return toast.error('Please select an industry or enter a new one.')
    if (industry === 'Other' && !otherIndustry)
      return toast.error('Please enter an industry.')
    try {
      setUpdatingIndustry(true)
      const response = await updateUserIndustry(
        formData,
        industry === 'Other' ? otherIndustry : industry
      )
      if (response.success) {
        toast.success('Industry updated successfully.')
      } else {
        toast.error(response.s)
      }
    } catch (error) {
      toast.error('Failed to update industry.')
    } finally {
      setUpdatingIndustry(false)
    }
  }

  return (
    <>
      <div className='h-full flex-1 flex-col space-y-8 p-5 md:flex bg-muted/40'>
        <h1 className='text-lg font-semibold md:text-lg'>User Info</h1>
        <Card>
          <CardHeader>
            <CardDescription>
              Please enter the user id or email below for more information about
              the user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid gap-6'>
              <div className='grid gap-3'>
                <Label htmlFor='email'>User Id/Email</Label>
                <Input
                  type='text'
                  className='w-full'
                  placeholder='User Id/Email'
                  value={formData}
                  onChange={(e) => setFormData(e.target.value)}
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
                Get Info
              </Button>
            )}
          </CardContent>
        </Card>
        {userData && (
          <>
            <Card>
              <CardHeader>
                <CardDescription>
                  Please enter/update special instruction for the user
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='grid gap-6'>
                  <div className='grid gap-3'>
                    <Label htmlFor='email'>
                      Add/Modify special instruction
                    </Label>
                    <Textarea
                      id='comment'
                      className='min-h-32'
                      placeholder='Enter special instructions here'
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                    />
                  </div>
                </div>
                {savingInstructions ? (
                  <Button disabled className='mt-5'>
                    Please wait
                    <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                  </Button>
                ) : (
                  <Button className='mt-5 mr-3' onClick={handleInstructions}>
                    Add/Modify Instruction
                  </Button>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Update User Industry</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='grid gap-6'>
                  <div className='grid gap-3'>
                    <Label htmlFor='email'>Select Industry</Label>
                    <Select
                      onValueChange={(value) => {
                        setShowOtherIndustryInput(value === 'Other')
                        setIndustry(value)
                      }}
                      defaultValue={industry}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select Industry' />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showOtherIndustryInput && (
                      <Input
                        type='text'
                        className='w-full'
                        placeholder='Enter Industry'
                        value={otherIndustry}
                        onChange={(e) => setOtherIndustry(e.target.value)}
                      />
                    )}
                  </div>
                </div>
                {updatingIndustry ? (
                  <Button disabled className='mt-5'>
                    Please wait
                    <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                  </Button>
                ) : (
                  <Button className='mt-5 mr-3' onClick={handleIndustry}>
                    Update
                  </Button>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>User Data</CardTitle>
              </CardHeader>

              <CardContent>
                <div className='grid'>
                  {Object.entries(userData).map(([key, value], index) => (
                    <div
                      key={key}
                      className={`grid grid-cols-2 p-2 mt-3 ${
                        index % 2 === 0 ? 'bg-gray-100' : 'bg-white'
                      }`}
                    >
                      <span className='font-semibold'>{key}</span>
                      <span>{value?.toString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  )
}
