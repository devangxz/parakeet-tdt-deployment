'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { transferFilesAction } from '@/app/actions/files/transfer'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TransferFilesModalProps {
  open: boolean
  onClose: () => void
  fileIds: string[]
  teams: { id: string; name: string }[]
  refetch: () => void
}

const TransferFilesModal = ({
  open,
  onClose,
  fileIds,
  teams,
  refetch,
}: TransferFilesModalProps) => {
  const [loading, setLoading] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState('')

  const handleSubmit = async () => {
    if (!selectedTeam) {
      toast.error('Please select a team')
      return
    }

    if (fileIds.length === 0) {
      toast.error('No files selected for transfer')
      return
    }

    setLoading(true)
    try {
      const response = await transferFilesAction(fileIds, Number(selectedTeam))
      if (response.success) {
        toast.success('Successfully transferred files')
        refetch()
        onClose()
      } else {
        toast.error(response.message || 'Error transferring files')
      }
    } catch (error) {
      toast.error('Error transferring files')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Transfer Files</AlertDialogTitle>
          <AlertDialogDescription>
            <p>
              You can transfer your files to your team workspace. You can select
              the workspace from the below list. Once the transfer is done then
              all the selected files will be move from your private workspace to
              selected workspace.<b> This action is irreversible.</b>
            </p>
            <div className='grid gap-4 mt-5'>
              <div className='grid gap-2'>
                <Label htmlFor='team'>Select Team</Label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select a team' />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                Transferring
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </>
            ) : (
              'Transfer Files'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default TransferFilesModal
