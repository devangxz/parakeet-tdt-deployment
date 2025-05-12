'use client'
import { ReloadIcon, ExternalLinkIcon, PlusIcon } from '@radix-ui/react-icons'
import { TrashIcon, FileIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { updateTranscriberWatchAction } from '@/app/actions/admin/transcriber-watch'
import {
  getTranscriberSubmittedFilesAction,
  getWatchlistTranscribersAction,
  type SubmittedFile,
  type WatchlistTranscriber,
} from '@/app/actions/admin/watchlist-transcribers'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import formatDateTime from '@/utils/formatDateTime'
import formatDuration from '@/utils/formatDuration'
import isValidEmail from '@/utils/isValidEmail'

export default function WatchlistTranscribersPage() {
  const [loading, setLoading] = useState(true)
  const [transcribers, setTranscribers] = useState<WatchlistTranscriber[]>([])
  const [email, setEmail] = useState('')
  const [addingTranscriber, setAddingTranscriber] = useState(false)
  const [removingTranscriberId, setRemovingTranscriberId] = useState<
    number | null
  >(null)
  const [submittedFiles, setSubmittedFiles] = useState<SubmittedFile[]>([])
  const [loadingSubmittedFiles, setLoadingSubmittedFiles] = useState(false)
  const [filesDialogOpen, setFilesDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const fetchTranscribers = async () => {
    try {
      setLoading(true)
      const response = await getWatchlistTranscribersAction()
      if (response.success && response.data) {
        setTranscribers(response.data)
      } else {
        toast.error(
          response.message || 'Failed to fetch watchlist transcribers'
        )
      }
    } catch (error) {
      toast.error('An error occurred while fetching watchlist transcribers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTranscribers()
  }, [])

  const handleAddTranscriber = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address')
      return
    }

    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    try {
      setAddingTranscriber(true)
      const response = await updateTranscriberWatchAction(
        email.toLowerCase(),
        true
      )
      if (response.success) {
        toast.success('Transcriber added to watchlist successfully')
        setEmail('')
        await fetchTranscribers()
        setAddDialogOpen(false)
      } else {
        toast.error(response.s || 'Failed to add transcriber to watchlist')
      }
    } catch (error) {
      toast.error('An error occurred while adding transcriber to watchlist')
    } finally {
      setAddingTranscriber(false)
    }
  }

  const handleRemoveTranscriber = async (transcriber: WatchlistTranscriber) => {
    try {
      setRemovingTranscriberId(transcriber.userId)
      const response = await updateTranscriberWatchAction(
        transcriber.email,
        false
      )
      if (response.success) {
        toast.success('Transcriber removed from watchlist successfully')
        await fetchTranscribers()
      } else {
        toast.error(response.s || 'Failed to remove transcriber from watchlist')
      }
    } catch (error) {
      toast.error('An error occurred while removing transcriber from watchlist')
    } finally {
      setRemovingTranscriberId(null)
    }
  }

  const handleViewSubmittedFiles = async (
    transcriber: WatchlistTranscriber
  ) => {
    setFilesDialogOpen(true)

    try {
      setLoadingSubmittedFiles(true)
      const response = await getTranscriberSubmittedFilesAction(
        transcriber.userId
      )
      if (response.success && response.data) {
        setSubmittedFiles(response.data)
      } else {
        toast.error(response.message || 'Failed to fetch submitted files')
      }
    } catch (error) {
      toast.error('An error occurred while fetching submitted files')
    } finally {
      setLoadingSubmittedFiles(false)
    }
  }

  const redirectToOrderStatus = (fileId: string) => {
    window.open(`/admin/orders?fileId=${fileId}&tab=status`, '_blank')
  }

  return (
    <div className='h-full flex-1 flex-col space-y-8 p-5 md:flex'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-lg font-semibold md:text-lg'>
            Watchlist Transcribers
          </h1>
          <div className='flex items-center gap-2'>
            Manage transcribers on watchlist. Monitor their submitted files and
            quality.
          </div>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <PlusIcon className='h-4 w-4 mr-2' />
          Add Transcriber
        </Button>
      </div>

      <div className='grid grid-cols-1 gap-4'>
        {loading ? (
          <div className='flex justify-center p-6'>
            <ReloadIcon className='h-6 w-6 animate-spin' />
          </div>
        ) : transcribers.length === 0 ? (
          <div className='text-center p-6 text-muted-foreground'>
            No transcribers on watchlist
          </div>
        ) : (
          <div className='rounded-md border-2 border-customBorder bg-background'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transcribers.map((transcriber) => (
                  <TableRow key={transcriber.id}>
                    <TableCell>
                      {transcriber.firstName} {transcriber.lastName}
                    </TableCell>
                    <TableCell>{transcriber.email}</TableCell>
                    <TableCell>
                      {transcriber.totalSubmittedHours} hours
                    </TableCell>
                    <TableCell>
                      <Button
                        variant='order'
                        size='sm'
                        onClick={() => handleViewSubmittedFiles(transcriber)}
                        className='not-rounded'
                      >
                        <FileIcon className='h-4 w-4 mr-2' />
                        View Files
                      </Button>
                    </TableCell>
                    <TableCell className='text-right'>
                      {removingTranscriberId === transcriber.userId ? (
                        <Button variant='destructive' size='sm' disabled>
                          <ReloadIcon className='h-4 w-4 animate-spin mr-2' />
                          Removing...
                        </Button>
                      ) : (
                        <Button
                          variant='destructive'
                          size='sm'
                          onClick={() => handleRemoveTranscriber(transcriber)}
                        >
                          <TrashIcon className='h-4 w-4 mr-2' />
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transcriber to Watchlist</DialogTitle>
            <DialogDescription>
              Enter the email address of the transcriber you want to add to the
              watchlist.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email Address</Label>
              <Input
                id='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='transcriber@example.com'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            {addingTranscriber ? (
              <Button disabled>
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                Adding...
              </Button>
            ) : (
              <Button onClick={handleAddTranscriber}>Add to Watchlist</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={filesDialogOpen} onOpenChange={setFilesDialogOpen}>
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>Submitted Files</DialogTitle>
            <DialogDescription>
              Files submitted by the transcriber for QC
            </DialogDescription>
          </DialogHeader>
          {loadingSubmittedFiles ? (
            <div className='flex justify-center p-6'>
              <ReloadIcon className='h-6 w-6 animate-spin' />
            </div>
          ) : submittedFiles.length === 0 ? (
            <div className='text-center p-6 text-muted-foreground'>
              No submitted files found
            </div>
          ) : (
            <div className='rounded-md border border-customBorder bg-background'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File ID</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Completed Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submittedFiles.map((file) => (
                    <TableRow key={file.fileId}>
                      <TableCell>
                        <Button
                          variant='link'
                          className='p-0 h-auto'
                          onClick={() => redirectToOrderStatus(file.fileId)}
                        >
                          {file.fileId}
                          <ExternalLinkIcon className='ml-1 h-3 w-3' />
                        </Button>
                      </TableCell>
                      <TableCell>{formatDuration(file.duration)}</TableCell>
                      <TableCell>
                        {formatDateTime(file.completedTime.toString())}
                      </TableCell>
                      <TableCell>{file.orderStatus}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
