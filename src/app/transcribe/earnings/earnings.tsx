/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { DialogClose } from '@radix-ui/react-dialog'
import { ReloadIcon } from '@radix-ui/react-icons'
import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

import { getTranscriberBonusDetails } from '@/app/actions/transcriber/bonus'
import { getTranscriberEarnings } from '@/app/actions/transcriber/earnings'
import { getTranscriberMiscEarnings } from '@/app/actions/transcriber/misc-earnings'
import { createWithdrawal } from '@/app/actions/transcriber/withdrawal'
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
  CHARGE_ON_LOW_WITHDRAWAL_AMOUNT,
  FREE_WITHDRAWAL_AMOUNT,
} from '@/constants'
import { Earnings } from '@/types/earnings'
import formatDateTime from '@/utils/formatDateTime'

interface Bonus {
  id: number
  userId: number
  amount: number
  type: string
  fileIds?: string | null
  createdAt: string
  duration?: number
  stage?: string
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
      <p className='font-medium mb-3'>{title}</p>
      <p className='text-xl'>
        {showDollar ? '$' : ''}
        {amount}
      </p>
    </div>
  )
}

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<Earnings | null>(null)
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [earningsDetailsDialog, setEarningsDetailsDialog] = useState(false)
  const [miscEarningsDialog, setMiscEarningsDialog] = useState(false)
  const [miscEarnings, setMiscEarnings] = useState<MiscEarnings[]>([])
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [bonusLoading, setBonusLoading] = useState(true)
  const [miscEarningsLoading, setMiscEarningsLoading] = useState(true)
  const [paypalId, setPaypalId] = useState<string>('')

  const fetchEarnings = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }
    try {
      const data = await getTranscriberEarnings()
      if (data.success && data.earnings) {
        setEarnings(data.earnings as any)
        setPaypalId(data.paypalId || '')
      } else {
        setError(data.message || 'Failed to fetch earnings')
      }
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
      const data = await getTranscriberBonusDetails()
      if (data.success && data.bonusDetails) {
        setBonuses(data.bonusDetails as any)
      } else {
        setError(data.message || 'Failed to fetch bonus details')
      }
    } catch (err) {
      toast.error('Failed to load bonus details')
      setEarningsDetailsDialog(false)
    } finally {
      setBonusLoading(false)
    }
  }

  const fetchMiscEarningsDetails = async () => {
    try {
      const data = await getTranscriberMiscEarnings()
      if (data.success && data.earningDetails) {
        setMiscEarnings(data.earningDetails as any)
      } else {
        setError(data.message || 'Failed to fetch misc earnings details')
      }
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

  const handleWithdrawalRequest = async () => {
    const toastId = toast.loading(`Submitting Withdrawal Request...`)
    try {
      await createWithdrawal()
      toast.dismiss(toastId)
      const successToastId = toast.success(
        `Withdrawal Request Submitted Successfully`
      )
      toast.dismiss(successToastId)
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
      <div className='bg-background border-2 border-customBorder rounded-md'>
        <div className='flex justify-between p-4'>
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
      <div className='bg-secondary border-2 border-customBorder rounded-md mt-5'>
        <div className='p-4'>
          <div className='flex justify-between items-start mb-1'>
            <h2 className='text-lg font-semibold md:text-xl'>Withdraw</h2>
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
          </div>

          <ul className='list-disc ml-5'>
            <li className='text-muted-foreground'>
              Withdrawals of $30 or higher are{' '}
              <strong className='text-foreground'>free</strong>.
            </li>
            <li className='text-muted-foreground'>
              For withdrawals below $30 a fee of 2% will be charged.
            </li>
            <li className='text-muted-foreground'>
              Payment processing will happen weekly and will take 7-14 Business
              days after the withdrawals are done.
            </li>
          </ul>

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
                            ? earnings?.CURRENT_BALANCE < FREE_WITHDRAWAL_AMOUNT
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
                            ? earnings.CURRENT_BALANCE < FREE_WITHDRAWAL_AMOUNT
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
                  The funds will be sent to &apos;{paypalId}
                  &apos;.
                </p>
                <DialogClose>
                  <Button onClick={handleWithdrawalRequest}>Confirm</Button>
                </DialogClose>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className='bg-background border-2 border-customBorder rounded-md mt-5 p-4'>
        <div>
          <h2 className='text-lg font-semibold md:text-xl mb-4'>
            Earnings Breakup
          </h2>
          <div className='w-2/5'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='h-fit pb-2'>Category</TableHead>
                  <TableHead className='text-left h-fit pb-2'>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='text-base'>
                <TableRow>
                  <TableCell>
                    Transcriptions{' '}
                    <Link
                      className='text-primary'
                      href='/transcribe/transcriber'
                    >
                      (Details)
                    </Link>
                  </TableCell>
                  <TableCell className='text-left'>
                    ${earnings?.TR_LEGACY?.toFixed(2).toString() || '0'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    Reviews{' '}
                    <Link className='text-primary' href='/transcribe/reviewer'>
                      (Details)
                    </Link>
                  </TableCell>
                  <TableCell className='text-left'>
                    ${earnings?.RV_LEGACY?.toFixed(2).toString() || '0'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    Proofreading{' '}
                    <Link
                      className='text-primary'
                      href='/transcribe/proofreader'
                    >
                      (Details)
                    </Link>
                  </TableCell>
                  <TableCell className='text-left'>
                    ${earnings?.PR_LEGACY?.toFixed(2).toString() || '0'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    QCs{' '}
                    <Link className='text-primary' href='/transcribe/qc'>
                      (Details)
                    </Link>
                  </TableCell>
                  <TableCell className='text-left'>
                    ${earnings?.QC?.toFixed(2).toString() || '0'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    CF Reviews{' '}
                    <Link
                      className='text-primary'
                      href='/transcribe/legal-cf-reviewer'
                    >
                      (Details)
                    </Link>
                  </TableCell>
                  <TableCell className='text-left'>
                    ${earnings?.REVIEW?.toFixed(2).toString() || '0'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    Customer Bonus{' '}
                    <Link className='text-primary' href='#'>
                      (help)
                    </Link>
                  </TableCell>
                  <TableCell className='text-left'>
                    ${earnings?.CB?.toFixed(2).toString() || '0'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    Bonus{' '}
                    <span
                      className='text-primary cursor-pointer'
                      onClick={handleBonusDetails}
                    >
                      (Details)
                    </span>
                  </TableCell>
                  <TableCell className='text-left'>
                    ${earnings?.DB?.toFixed(2).toString() || '0'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    Misc Earnings{' '}
                    <span
                      className='text-primary cursor-pointer'
                      onClick={handleMiscEarningsDetails}
                    >
                      (Details)
                    </span>
                  </TableCell>
                  <TableCell className='text-left'>
                    ${earnings?.ME?.toFixed(2).toString() || '0'}
                  </TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow className='text-base'>
                  <TableCell>Total</TableCell>
                  <TableCell className='text-left'>
                    ${earnings?.TOTAL?.toFixed(2).toString() || '0.00'}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
      </div>{' '}
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
                      <TableHead className='text-center'>Stage</TableHead>
                      <TableHead className='text-center'>
                        Duration (hours)
                      </TableHead>
                      <TableHead className='text-center'>Type</TableHead>
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
                          {bonus.stage ? bonus.stage : '-'}
                        </TableCell>
                        <TableCell className='font-medium'>
                          {bonus.duration ? bonus.duration : '-'}
                        </TableCell>
                        <TableCell className='font-medium'>
                          {bonus.type}
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
                      <TableCell colSpan={1}></TableCell>
                      <TableCell colSpan={1}></TableCell>
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
