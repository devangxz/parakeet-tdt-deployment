'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { ClockIcon, PencilIcon, TrashIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { addICQCAction } from '@/app/actions/admin/add-ic-qc'
import {
  getICQCMonthlyHoursAction,
  getICQCsAction,
} from '@/app/actions/admin/get-ic-qcs'
import { removeICQCAction } from '@/app/actions/admin/remove-ic-qc'
import { updateICQCRate } from '@/app/actions/admin/update-ic-qc-rates'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ICQCUser {
  id: number
  firstname: string | null
  lastname: string | null
  email: string
  monthlyBonusEnabled: boolean | null
  watchlist: boolean | null
  qcRate: number
  cfRate: number
  cfRRate: number
}

interface MonthlyHours {
  month: string
  year: number
  totalHours: number
}

export default function ICQCsPage() {
  const [loading, setLoading] = useState(true)
  const [icQcs, setIcQcs] = useState<ICQCUser[]>([])
  const [email, setEmail] = useState('')
  const [qcRate, setQcRate] = useState(0)
  const [cfRate, setCfRate] = useState(0)
  const [cfRRate, setCfRRate] = useState(0)
  const [addingIcQc, setAddingIcQc] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [removingIcQc, setRemovingIcQc] = useState<number | null>(null)
  const [monthlyHoursDialogOpen, setMonthlyHoursDialogOpen] = useState(false)
  const [selectedUserName, setSelectedUserName] = useState('')
  const [monthlyHours, setMonthlyHours] = useState<MonthlyHours[]>([])
  const [loadingMonthlyHours, setLoadingMonthlyHours] = useState(false)
  const [editingIcQc, setEditingIcQc] = useState<ICQCUser | null>(null)
  const [editRateDialogOpen, setEditRateDialogOpen] = useState(false)
  const [editQcRate, setEditQcRate] = useState(0)
  const [editCfRate, setEditCfRate] = useState(0)
  const [editCfRRate, setEditCfRRate] = useState(0)
  const [updatingRates, setUpdatingRates] = useState(false)

  const fetchIcQcs = async () => {
    try {
      setLoading(true)
      const response = await getICQCsAction()
      if (response.success && response.data) {
        setIcQcs(response.data)
      } else {
        toast.error(response.message || 'Failed to fetch IC QCs')
      }
    } catch (error) {
      toast.error('An error occurred while fetching IC QCs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIcQcs()
  }, [])

  const handleAddIcQc = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address')
      return
    }

    try {
      setAddingIcQc(true)
      const response = await addICQCAction(email, qcRate, cfRate, cfRRate)
      if (response.success) {
        toast.success(response.message || 'IC QC added successfully')
        setEmail('')
        setQcRate(0)
        setCfRate(0)
        setCfRRate(0)
        setDialogOpen(false)
        await fetchIcQcs()
      } else {
        toast.error(response.message || 'Failed to add IC QC')
      }
    } catch (error) {
      toast.error('An error occurred while adding IC QC')
    } finally {
      setAddingIcQc(false)
    }
  }

  const handleRemoveIcQc = async (userId: number) => {
    try {
      setRemovingIcQc(userId)
      const response = await removeICQCAction(userId)
      if (response.success) {
        toast.success(response.message || 'IC QC removed successfully')
        await fetchIcQcs()
      } else {
        toast.error(response.message || 'Failed to remove IC QC')
      }
    } catch (error) {
      toast.error('An error occurred while removing IC QC')
    } finally {
      setRemovingIcQc(null)
    }
  }

  const handleViewMonthlyHours = async (userId: number, name: string) => {
    setSelectedUserName(name)
    setMonthlyHoursDialogOpen(true)

    try {
      setLoadingMonthlyHours(true)
      const response = await getICQCMonthlyHoursAction(userId)
      if (response.success && response.data) {
        setMonthlyHours(response.data)
      } else {
        toast.error(response.message || 'Failed to fetch monthly hours')
      }
    } catch (error) {
      toast.error('An error occurred while fetching monthly hours')
    } finally {
      setLoadingMonthlyHours(false)
    }
  }

  const handleEditRates = (icQc: ICQCUser) => {
    setEditingIcQc(icQc)
    setEditQcRate(icQc.qcRate)
    setEditCfRate(icQc.cfRate)
    setEditCfRRate(icQc.cfRRate)
    setEditRateDialogOpen(true)
  }

  const handleUpdateRates = async () => {
    if (!editingIcQc) return

    try {
      setUpdatingRates(true)
      const response = await updateICQCRate(
        editingIcQc.email,
        editQcRate,
        editCfRate,
        editCfRRate
      )

      if (response.success) {
        toast.success(response.message || 'Rates updated successfully')
        setEditRateDialogOpen(false)
        await fetchIcQcs()
      } else {
        toast.error(response.message || 'Failed to update rates')
      }
    } catch (error) {
      toast.error('An error occurred while updating rates')
    } finally {
      setUpdatingRates(false)
    }
  }

  return (
    <div className='h-full flex-1 flex-col space-y-8 p-5 md:flex'>
      <div className='flex items-center justify-between'>
        <div>
          {' '}
          <h1 className='text-lg font-semibold md:text-lg'>IC QCs </h1>
          <div className='flex items-center gap-2'>
            Manage Independent Contractor QCs. Changes to rates and bonus status
            are applied immediately.
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add IC QC</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add IC QC</DialogTitle>
              <DialogDescription>
                Enter the email address and rates for the new IC QC
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='user@example.com'
                />
              </div>
              <div className='grid grid-cols-3 gap-4'>
                <div className='grid gap-2'>
                  <Label htmlFor='qcRate'>QC Rate (/hour)</Label>
                  <Input
                    id='qcRate'
                    type='number'
                    value={qcRate}
                    onChange={(e) => setQcRate(Number(e.target.value))}
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='cfRate'>CF Rate (/hour)</Label>
                  <Input
                    id='cfRate'
                    type='number'
                    value={cfRate}
                    onChange={(e) => setCfRate(Number(e.target.value))}
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='cfRRate'>CFR Rate (/hour)</Label>
                  <Input
                    id='cfRRate'
                    type='number'
                    value={cfRRate}
                    onChange={(e) => setCfRRate(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              {addingIcQc ? (
                <Button disabled>
                  <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                  Adding...
                </Button>
              ) : (
                <Button onClick={handleAddIcQc}>Add IC QC</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        {loading ? (
          <div className='flex justify-center p-6'>
            <ReloadIcon className='h-6 w-6 animate-spin' />
          </div>
        ) : icQcs.length === 0 ? (
          <div className='text-center p-6 text-muted-foreground'>
            No IC QCs found
          </div>
        ) : (
          <div className='rounded-md border-2 border-customBorder bg-background'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>QC Rate</TableHead>
                  <TableHead>CF Rate</TableHead>
                  <TableHead>CF R Rate</TableHead>
                  <TableHead>Monthly Bonus</TableHead>
                  <TableHead>Watchlist</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {icQcs.map((icQc) => (
                  <TableRow key={icQc.id}>
                    <TableCell>
                      {[icQc.firstname, icQc.lastname]
                        .filter(Boolean)
                        .join(' ') || 'No name'}
                    </TableCell>
                    <TableCell>{icQc.email}</TableCell>
                    <TableCell>${icQc.qcRate}</TableCell>
                    <TableCell>${icQc.cfRate}</TableCell>
                    <TableCell>${icQc.cfRRate}</TableCell>
                    <TableCell>
                      {icQc.monthlyBonusEnabled ? 'Enabled' : 'Disabled'}
                    </TableCell>
                    <TableCell>{icQc.watchlist ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <Button
                        variant='order'
                        size='sm'
                        onClick={() =>
                          handleViewMonthlyHours(
                            icQc.id,
                            [icQc.firstname, icQc.lastname]
                              .filter(Boolean)
                              .join(' ') || icQc.email
                          )
                        }
                        className='not-rounded'
                      >
                        <ClockIcon className='mr-2 h-4 w-4' />
                        View Hours
                      </Button>
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end space-x-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          className='not-rounded'
                          onClick={() => handleEditRates(icQc)}
                        >
                          <PencilIcon className='mr-2 h-4 w-4' />
                          Edit Rates
                        </Button>
                        {removingIcQc === icQc.id ? (
                          <Button
                            variant='destructive'
                            size='sm'
                            disabled
                            className='not-rounded'
                          >
                            <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                            Removing...
                          </Button>
                        ) : (
                          <Button
                            variant='destructive'
                            size='sm'
                            className='not-rounded'
                            onClick={() => handleRemoveIcQc(icQc.id)}
                          >
                            <TrashIcon className='mr-2 h-4 w-4' />
                            Remove
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Monthly Hours Dialog */}
      <Dialog
        open={monthlyHoursDialogOpen}
        onOpenChange={setMonthlyHoursDialogOpen}
      >
        <DialogContent className='sm:max-w-[600px]'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <ClockIcon className='h-5 w-5' />
              Monthly Hours - {selectedUserName}
            </DialogTitle>
            <DialogDescription>
              Showing monthly hours from January 2025 to current month
            </DialogDescription>
          </DialogHeader>
          {loadingMonthlyHours ? (
            <div className='flex justify-center p-10'>
              <ReloadIcon className='h-8 w-8 animate-spin' />
            </div>
          ) : monthlyHours.length === 0 ? (
            <div className='text-center p-10 text-muted-foreground'>
              No monthly hours data found
            </div>
          ) : (
            <div className='max-h-[400px] overflow-y-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Total Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyHours.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.month}</TableCell>
                      <TableCell>{item.year}</TableCell>
                      <TableCell>{item.totalHours.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Rates Dialog */}
      <Dialog open={editRateDialogOpen} onOpenChange={setEditRateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Rates</DialogTitle>
            <DialogDescription>
              Update rates for {editingIcQc?.firstname} {editingIcQc?.lastname}
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-3 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='editQcRate'>QC Rate (/hour)</Label>
                <Input
                  id='editQcRate'
                  type='number'
                  value={editQcRate}
                  onChange={(e) => setEditQcRate(Number(e.target.value))}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='editCfRate'>CF Rate (/hour)</Label>
                <Input
                  id='editCfRate'
                  type='number'
                  value={editCfRate}
                  onChange={(e) => setEditCfRate(Number(e.target.value))}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='editCfRRate'>CFR Rate (/hour)</Label>
                <Input
                  id='editCfRRate'
                  type='number'
                  value={editCfRRate}
                  onChange={(e) => setEditCfRRate(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            {updatingRates ? (
              <Button disabled>
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                Updating...
              </Button>
            ) : (
              <Button onClick={handleUpdateRates}>Update Rates</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
