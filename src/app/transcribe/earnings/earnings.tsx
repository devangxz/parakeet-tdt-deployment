'use client'
import { DialogClose } from '@radix-ui/react-dialog'
import { ReloadIcon } from '@radix-ui/react-icons'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BACKEND_URL,
  CHARGE_ON_LOW_WITHDRAWAL_AMOUNT,
  FREE_WITHDRAWAL_AMOUNT,
} from '@/constants'
import { Earnings } from '@/types/earnings'
import axiosInstance from '@/utils/axios'
import formatDateTime from '@/utils/formatDateTime'

interface Bonus {
  id: number
  userId: number
  amount: number
  type: string
  fileIds?: string | null
  createdAt: string
}

interface MiscEarnings {
  id: number
  userId: number
  amount: number
  reason: string
  createdAt: string
}

function EarningsDetails({
  title,
  amount,
  showDollar = true,
}: {
  title: string
  amount: string
  showDollar?: boolean
}) {
  return (
    <div className='flex flex-col items-center'>
      <p className='text-muted-foreground text-md font-medium mb-3'>{title}</p>
      <p className='text-xl'>
        {showDollar ? '$' : ''}
        {amount}
      </p>
    </div>
  )
}

function EarningsBreakup({
  title,
  amount,
  link,
  linkText,
}: {
  title: string
  amount: string
  link: string
  linkText: string
}) {
  return (
    <div className='flex justify-between items-center mt-3 text-md'>
      <p>
        {title}{' '}
        <Link className='text-indigo-600' href={link}>
          ({linkText})
        </Link>
      </p>
      <p>${amount}</p>
    </div>
  )
}

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<Earnings | null>(null)
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()
  const [earningsDetailsDialog, setEarningsDetailsDialog] = useState(false)
  const [miscEarningsDialog, setMiscEarningsDialog] = useState(false)
  const [miscEarnings, setMiscEarnings] = useState<MiscEarnings[]>([])
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [bonusLoading, setBonusLoading] = useState(true)
  const [miscEarningsLoading, setMiscEarningsLoading] = useState(true)

  const fetchEarnings = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }
    try {
      const response = await axiosInstance.get(`${BACKEND_URL}/get-earnings`)
      setEarnings(response.data)
    } catch (err) {
      setError('an error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEarnings(true)
  }, [])

  const fetchBonusDetails = async () => {
    try {
      const response = await axiosInstance.get(`${BACKEND_URL}/bonus-details`)
      setBonuses(response.data.bonusDetails || [])
    } catch (err) {
      toast.error('Failed to load bonus details')
      setEarningsDetailsDialog(false)
    } finally {
      setBonusLoading(false)
    }
  }

  const fetchMiscEarningsDetails = async () => {
    try {
      const response = await axiosInstance.get(
        `${BACKEND_URL}/misc-earnings-details`
      )
      setMiscEarnings(response.data.earningDetails || [])
    } catch (err) {
      toast.error('Failed to load misc earnings details')
      setMiscEarningsDialog(false)
    } finally {
      setMiscEarningsLoading(false)
    }
  }

  const handleBonusDetails = async () => {
    setEarningsDetailsDialog(true)
    setBonusLoading(true)
    await fetchBonusDetails()
  }

  const handleMiscEarningsDetails = async () => {
    setMiscEarningsDialog(true)
    setMiscEarningsLoading(true)
    await fetchMiscEarningsDetails()
  }

  const submitWithdrawalRequest = async () => {
    const toastId = toast.loading(`Submitting Withdrawal Request...`)
    try {
      const response = await axiosInstance.post(
        `${BACKEND_URL}/request-withdrawal`
      )
      toast.dismiss(toastId)
      if (response.status === 200) {
        const successToastId = toast.success(
          `Withdrawal Request Submitted Successfully`
        )
        toast.dismiss(successToastId)
      }
    } catch (error) {
      toast.error(`Failed to submit the withdrawal request`)
    } finally {
      toast.dismiss(toastId)
    }
  }

  const totalBonusAmount = useMemo(
    () => bonuses?.reduce((acc, bonus) => acc + bonus.amount, 0).toFixed(2),
    [bonuses]
  )

  const totalMiscEarningsAmount = useMemo(
    () =>
      miscEarnings
        ?.reduce((acc, earnings) => acc + earnings.amount, 0)
        .toFixed(2),
    [miscEarnings]
  )

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
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
          height: '20vh',
        }}
      >
        <p>An Error Occured</p>
      </div>
    )
  }

  return (
    <>
      <div className='bg-white border rounded-xl'>
        <div className='flex justify-between px-10 py-8'>
          <EarningsDetails
            showDollar={false}
            title='Total Credited hours'
            amount={earnings?.CREDITED_HOURS?.toFixed(2).toString() || '0'}
          />
          <EarningsDetails
            title='Accumulated earnings'
            amount={earnings?.TOTAL?.toFixed(2).toString() || '0'}
          />
          <EarningsDetails
            title='Total withdrawals'
            amount={earnings?.WITHDRAWAL?.toFixed(2).toString() || '0'}
          />
          <EarningsDetails
            title='Current balance'
            amount={earnings?.CURRENT_BALANCE?.toFixed(2).toString() || '0'}
          />
        </div>
      </div>
      <div className='bg-white border rounded-xl mt-4'>
        <div className='flex justify-between px-10 py-5'>
          <div>
            <h2 className='text-lg font-semibold'>Withdraw</h2>
            <ul className='list-disc ml-5'>
              <li className='text-muted-foreground'>
                Withdrawals of $30 of higher are{' '}
                <strong className='text-[#161616]'>free</strong>.
              </li>
              <li className='text-muted-foreground'>
                For withdrawals below $30 a fee of 2% will be charged.
              </li>
              <li className='text-muted-foreground'>
                Payment processing will happen weekly and will take 7-14
                Business days after the withdrawals are done.
              </li>
            </ul>
          </div>
          <div className='flex flex-col justify-end'>
            <Button
              className='not-rounded'
              onClick={async () => {
                await fetchEarnings()
                if (earnings?.CURRENT_BALANCE?.toFixed(2) === '0.00') {
                  toast.error('You have no earnings to withdraw')
                } else {
                  setOpen(true)
                }
              }}
            >
              Submit Withdrawals Request
            </Button>
            <Dialog open={open} onOpenChange={() => setOpen(false)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Withdrawals Confirmation</DialogTitle>
                  <DialogDescription className='py-5 text-center'>
                    Please review the details below and confirm
                  </DialogDescription>
                  <div className='flex justify-center items-center'>
                    <Table className='text-center'>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='text-center'>Details</TableHead>
                          <TableHead className='text-center'>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className='font-medium'>Amount</TableCell>
                          <TableCell>
                            ${earnings?.CURRENT_BALANCE.toFixed(2).toString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className='font-medium'>Fee</TableCell>
                          <TableCell>
                            $
                            {earnings
                              ? earnings?.CURRENT_BALANCE <
                                FREE_WITHDRAWAL_AMOUNT
                                ? (
                                    earnings?.CURRENT_BALANCE *
                                    CHARGE_ON_LOW_WITHDRAWAL_AMOUNT
                                  ).toFixed(2)
                                : '0.00'
                              : '0.00'}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={1}>Net Amount</TableCell>
                          <TableCell>
                            $
                            {earnings
                              ? earnings.CURRENT_BALANCE <
                                FREE_WITHDRAWAL_AMOUNT
                                ? (
                                    earnings.CURRENT_BALANCE *
                                    (1 - CHARGE_ON_LOW_WITHDRAWAL_AMOUNT)
                                  ).toFixed(2)
                                : earnings.CURRENT_BALANCE.toFixed(2)
                              : '0'}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                  <p className='text-center py-5'>
                    The funds will be sent to &apos;{session?.user?.email}
                    &apos;.
                  </p>
                  <DialogClose>
                    <Button onClick={submitWithdrawalRequest}>Confirm</Button>
                  </DialogClose>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      <div className='bg-white border rounded-xl mt-4 px-10 py-5'>
        <div>
          <h2 className='text-lg font-semibold'>Earnings breakup</h2>
          <div className='w-3/5'>
            <div className='flex justify-between items-center text-muted-foreground text-md mt-2 mb-5'>
              <p>Category</p>
              <p>Amount</p>
            </div>
            <EarningsBreakup
              title='Transcriptions'
              amount={earnings?.TR_LEGACY?.toFixed(2).toString() || '0'}
              link='/transcribe/transcriber'
              linkText='Details'
            />
            <EarningsBreakup
              title='Reviews'
              amount={earnings?.RV_LEGACY?.toFixed(2).toString() || '0'}
              link='/transcribe/reviewer'
              linkText='Details'
            />
            <EarningsBreakup
              title='Proofreading'
              amount={earnings?.PR_LEGACY?.toFixed(2).toString() || '0'}
              link='/transcribe/proofreader'
              linkText='Details'
            />
            <EarningsBreakup
              title='QCs'
              amount={earnings?.QC?.toFixed(2).toString() || '0'}
              link='/transcribe/qc'
              linkText='Details'
            />
            <EarningsBreakup
              title='CF Reviews'
              amount={earnings?.REVIEW?.toFixed(2).toString() || '0'}
              link='/transcribe/legal-cf-reviewer'
              linkText='Details'
            />
            <EarningsBreakup
              title='Customer bonus'
              amount={earnings?.CB?.toFixed(2).toString() || '0'}
              link='#'
              linkText='help'
            />
            <div className='flex justify-between items-center mt-3 text-md'>
              <div className='flex'>
                <p>Daily bonus</p>
                <p
                  className='text-indigo-600 ml-2 cursor-pointer'
                  onClick={handleBonusDetails}
                >
                  (Details)
                </p>
              </div>

              <p>${earnings?.DB?.toFixed(2).toString() || '0'}</p>
            </div>
            <div className='flex justify-between items-center mt-3 text-md'>
              <div className='flex'>
                <p>Misc Earnings</p>
                <p
                  className='text-indigo-600 ml-2 cursor-pointer'
                  onClick={handleMiscEarningsDetails}
                >
                  (Details)
                </p>
              </div>

              <p>${earnings?.ME?.toFixed(2).toString() || '0'}</p>
            </div>
            <hr className='my-5' />
            <div className='flex justify-between items-center mt-3 text-lg text-black'>
              <p>Total:</p>
              <p>${earnings?.TOTAL?.toFixed(2).toString() || '0.00'}</p>
            </div>
          </div>
        </div>
      </div>
      <Dialog
        open={earningsDetailsDialog}
        onOpenChange={() => setEarningsDetailsDialog(false)}
      >
        <DialogContent className='sm:max-w-[70%]'>
          <DialogHeader>
            <DialogTitle>Bonus Details</DialogTitle>
            <DialogDescription className='py-5 text-center'>
              Below are the details of the bonus
            </DialogDescription>
            <div className='flex justify-center items-center'>
              {bonusLoading ? (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                  <p>Loading...</p>
                </div>
              ) : (
                <Table className='text-center'>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-center'>Date</TableHead>
                      <TableHead className='text-center'>File</TableHead>
                      <TableHead className='text-center'>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bonuses?.map((bonus: Bonus) => (
                      <TableRow key={bonus.id}>
                        <TableCell className='font-medium'>
                          {formatDateTime(bonus.createdAt)}
                        </TableCell>
                        <TableCell className='font-medium'>
                          {bonus.fileIds ? bonus.fileIds : '-'}
                        </TableCell>
                        <TableCell className='font-medium'>
                          ${bonus.amount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={1}>Total Amount</TableCell>
                      <TableCell colSpan={1}></TableCell>
                      <TableCell colSpan={1}>${totalBonusAmount}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </div>
            <DialogClose>
              <Button>Close</Button>
            </DialogClose>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <Dialog
        open={miscEarningsDialog}
        onOpenChange={() => setMiscEarningsDialog(false)}
      >
        <DialogContent className='sm:max-w-[70%]'>
          <DialogHeader>
            <DialogTitle>Misc Earnings Details</DialogTitle>
            <DialogDescription className='py-5 text-center'>
              Below are the details of the misc earnings
            </DialogDescription>
            <div className='flex justify-center items-center'>
              {miscEarningsLoading ? (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                  <p>Loading...</p>
                </div>
              ) : (
                <Table className='text-center'>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-center'>Date</TableHead>
                      <TableHead className='text-center'>Reason</TableHead>
                      <TableHead className='text-center'>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {miscEarnings?.map((earnings: MiscEarnings) => (
                      <TableRow key={earnings.id}>
                        <TableCell className='font-medium'>
                          {formatDateTime(earnings.createdAt)}
                        </TableCell>
                        <TableCell className='font-medium'>
                          {earnings.reason}
                        </TableCell>
                        <TableCell className='font-medium'>
                          ${earnings.amount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={1}>Total Amount</TableCell>
                      <TableCell colSpan={1}></TableCell>
                      <TableCell colSpan={1}>
                        ${totalMiscEarningsAmount}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </div>
            <DialogClose>
              <Button>Close</Button>
            </DialogClose>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}
