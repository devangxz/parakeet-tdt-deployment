'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { DataTable } from './components/data-table'
import AddCreditsDialog from '@/components/pay-add-credits'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { BACKEND_URL, MIN_CREDIT, MAX_CREDIT } from '@/constants'
import axiosInstance from '@/utils/axios'
import formatDateTime from '@/utils/formatDateTime'

interface Invoice {
  type: string
  id: string
  amount: number
  date: string
}

interface AddCredits {
  clientToken: string
  invoiceId: string
}

const FormSchema = z.object({
  ucd: z.boolean().default(false).optional(),
  rtc: z.boolean().default(false).optional(),
})

const Invoice = () => {
  const { data: session, status } = useSession()
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState<string>('')
  const [isAddCreditsLoading, setIsAddCreditsLoading] = useState(false)
  const [creditsBalance, setCreditsBalance] = useState<number>(0)
  const [isCreditPreferenceLoading, setIsCreditPreferenceLoading] =
    useState(false)
  const [addCreditsData, setAddCreditsData] = useState<AddCredits | null>(null)
  const [warningDialog, setWarningDialog] = useState(false)

  const fetchCreditInvoices = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }

    try {
      const response = await axiosInstance.get(`${BACKEND_URL}/credits`)

      if (response.data.success) {
        setCreditsBalance(response.data.s.credits_balance)
        form.reset({
          ...form.getValues(),
          ucd: response.data.s.credits_preference.ucd === 1 ? true : false,
          rtc: response.data.s.credits_preference.rtc === 1 ? true : false,
        })

        const invoices = response.data.s.credit_history.map(
          (invoice: { id: string; amt: number; ts: string; dn: string }) => ({
            type: invoice.dn,
            id: invoice.id,
            amount: invoice.amt,
            date: invoice.ts,
          })
        )
        setInvoices(invoices ?? [])
        setError(null)
      }
    } catch (err) {
      setError('an error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCreditInvoices(true)
  }, [status])

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('type')}</div>
      ),
    },
    {
      accessorKey: 'id',
      header: 'Order ID',
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('id')}</div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <div className='font-medium'>${row.getValue('amount')}</div>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <div className='font-medium'>
          {formatDateTime(row.getValue('date'))}
        </div>
      ),
    },
    //TODO: Implement this feature later
    // {
    //   id: 'actions',
    //   header: 'Actions',
    //   enableHiding: false,
    //   cell: ({ row }) => (
    //     <div className='flex items-center'>
    //       <Button
    //         variant='order'
    //         className='not-rounded'
    //         onClick={() => details(row.original.id)}
    //       >
    //         Transfer Credit
    //       </Button>
    //     </div>
    //   ),
    // },
  ]

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      ucd: true,
    },
  })

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setIsCreditPreferenceLoading(true)
    try {
      const response = await axiosInstance.post(
        `${BACKEND_URL}/credits/preferences`,
        {
          uc: data.ucd ? 1 : 0,
          rc: data.rtc ? 1 : 0,
        }
      )
      if (response.status === 200) {
        const tId = toast.success('Successfully updated credits preferences')
        toast.dismiss(tId)
      } else {
        toast.error('Failed to update credits preferences')
      }
      setIsCreditPreferenceLoading(false)
    } catch (error) {
      toast.error(`Failed to update credits preferences`)
      setIsCreditPreferenceLoading(false)
    }
  }

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

  const handleAddCredit = async () => {
    if (amount.trim() === '') {
      toast.error('Please enter amount')
      return
    }
    if (parseFloat(amount) < MIN_CREDIT || parseFloat(amount) > MAX_CREDIT) {
      toast.error(
        `Please enter amount between $${MIN_CREDIT} and $${MAX_CREDIT}`
      )
      return
    }
    setWarningDialog(false)
    try {
      setIsAddCreditsLoading(true)
      const response = await fetch(
        `${BACKEND_URL}/get-add-credits-invoice?amount=${amount}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.user?.token}`,
          },
        }
      )
      const responseData = await response.json()
      if (responseData.success) {
        setIsAddCreditsLoading(false)
        setAddCreditsData({
          clientToken: responseData.s.token,
          invoiceId: responseData.s.invoiceId,
        })
        setOpenDetailsDialog(true)
      } else {
        setIsAddCreditsLoading(false)
        toast.error(`Failed to add credits: ${responseData.message}`)
      }
    } catch (error) {
      setIsCreditPreferenceLoading(false)
      toast.error(`Failed to add credits: ${error}`)
    }
  }

  const refetch = () => {
    fetchCreditInvoices()
  }

  return (
    <>
      <div className='space-y-6'>
        <div className='border-2 w-[222px] p-4 rounded-[12px]'>
          <h1 className='text-lg font-semibold md:text-lg'>
            Credit balance{' '}
            <span className='text-primary ml-2'>${creditsBalance}</span>
          </h1>
        </div>
        <Separator />
        <div className='text-muted-foreground'>
          <h1 className='text-lg font-semibold md:text-lg text-black'>
            Add credits
          </h1>
          <p>Please enter amount to load credits to your account.</p>
          <p>Notes:</p>
          <ol className='ml-2'>
            <li>1. Credits can be used to pay for invoices on Scribie</li>
            <li>
              2. Credits do not expire and can be shared between team members
            </li>
            <li>
              3. Credits cannot be withdrawn but can be transferred to another
              team
            </li>
            <li>
              4. Minimum value is ${MIN_CREDIT} and maximum value is $
              {MAX_CREDIT}
            </li>
          </ol>
        </div>
        <div className='flex items-center justify-between gap-20'>
          <div className='grid w-full items-center gap-1.5'>
            <Label htmlFor='teamName'>Enter amount</Label>
            <Input
              id='amount'
              type='number'
              placeholder='Eg. $100'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {isAddCreditsLoading ? (
            <Button disabled className='mt-5'>
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button
              className='mt-5'
              onClick={() => {
                if (!session?.user?.internalTeamUserId) {
                  setWarningDialog(true)
                } else {
                  handleAddCredit()
                }
              }}
            >
              Add Credits
            </Button>
          )}
        </div>
        <Separator />
        <h1 className='text-lg font-semibold md:text-lg'>Credit history</h1>
        <DataTable data={invoices || []} columns={columns} />
        <Separator />
        <div>
          <h1 className='text-lg font-semibold md:text-lg mb-5'>
            Credit preferences
          </h1>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='w-full space-y-6'
            >
              <div className=''>
                <FormField
                  control={form.control}
                  name='ucd'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center border mb-5 gap-5 rounded-lg p-3 shadow-sm'>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-md'>
                          Automatically apply credits
                        </FormLabel>
                        <FormDescription className='text-sm'>
                          Credits will be automatically applied to each invoice
                          before payment.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='rtc'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center gap-5 rounded-lg border p-3 shadow-sm'>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-md'>
                          Convert refunds to credits
                        </FormLabel>
                        <FormDescription className='text-sm'>
                          Refunds issued for payments made with Credit
                          Card/PayPal will be sent to account credits. Refunds
                          for payments made with account credits is always sent
                          to account credits and cannot be changed.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              {isCreditPreferenceLoading ? (
                <Button disabled>
                  Please wait
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                </Button>
              ) : (
                <Button type='submit'>Update</Button>
              )}
            </form>
          </Form>
        </div>
      </div>
      <AddCreditsDialog
        open={openDetailsDialog}
        onClose={() => {
          setOpenDetailsDialog(false)
          refetch()
        }}
        clientToken={addCreditsData?.clientToken as string}
        session={session!}
        invoiceId={addCreditsData?.invoiceId as string}
        amount={amount}
      />
      <AlertDialog open={warningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adding Credits?</AlertDialogTitle>
            <AlertDialogDescription className='text-black-500'>
              You are adding credit to <b>My Workspace</b> and once added, the
              credits will be available for use only in this workspace . Please
              click <b>Continue</b> to proceed. If you wanted to add credit to
              any other workspace please click <b>Cancel</b>, switch to the
              workspace where you want to add the credit and perform this action
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWarningDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleAddCredit}>
              {isAddCreditsLoading ? (
                <>
                  Please wait
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                </>
              ) : (
                'Continue'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default Invoice
