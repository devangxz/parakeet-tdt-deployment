import { ReloadIcon } from '@radix-ui/react-icons'
import { Session } from 'next-auth'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BACKEND_URL } from '@/constants'
import { Team } from '@/types/teams'
import axiosInstance from '@/utils/axios'

interface RenameTeamDialogProps {
  open: boolean
  onClose: () => void
  selectedTeam: Team
  fetchAllTeams: () => void
  session: Session
}

const RenameTeamDialog = ({
  open,
  onClose,
  selectedTeam,
  fetchAllTeams,
}: RenameTeamDialogProps) => {
  const [renameTeamName, setRenameTeamName] = useState<string>('')
  const [isRenameTeamLoading, setIsRenameTeamLoading] = useState(false)

  const handleRenameTeam = async () => {
    if (renameTeamName.trim() === '') {
      toast.error('Team name is required')
      return
    }
    setIsRenameTeamLoading(true)
    try {
      const responseCreateTeam = await axiosInstance.post(
        `${BACKEND_URL}/rename-team`,
        {
          newTeamName: renameTeamName,
          teamId: selectedTeam?.id,
        }
      )
      if (responseCreateTeam.status === 200) {
        const tId = toast.success(responseCreateTeam.data.message)
        toast.dismiss(tId)
        fetchAllTeams()
      } else {
        toast.error('Failed to create team')
      }
      onClose()
      setIsRenameTeamLoading(false)
    } catch (error) {
      toast.error('Failed to rename team')
      setIsRenameTeamLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Rename team</DialogTitle>
          <DialogDescription>
            Current name:{' '}
            <span className='font-bold text-primary'>{selectedTeam?.name}</span>
          </DialogDescription>
        </DialogHeader>
        <div className='grid w-full items-center gap-1.5 mt-5'>
          <Label htmlFor='newTeamName'>Enter new team name</Label>
          <Input
            id='newTeamName'
            type='text'
            placeholder='Write a name here'
            value={renameTeamName}
            onChange={(e) => setRenameTeamName(e.target.value)}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type='button' variant='outline'>
              Cancel
            </Button>
          </DialogClose>
          {isRenameTeamLoading ? (
            <Button disabled>
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button type='submit' onClick={handleRenameTeam}>
              Update
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RenameTeamDialog
