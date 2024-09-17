import { ReloadIcon } from '@radix-ui/react-icons'
import { Session } from 'next-auth'
import { useState } from 'react'
import { toast } from 'sonner'

import { TeamMember } from './types'
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
import { BACKEND_URL } from '@/constants'
import { Team } from '@/types/teams'
import axiosInstance from '@/utils/axios'

interface RemoveUserDialogProps {
  open: boolean
  onClose: () => void
  selectedTeamMember: TeamMember
  selectedTeam: Team
  session: Session
  triggerRefetch: () => void
}

const RemoveUserDialog = ({
  open,
  onClose,
  selectedTeamMember,
  selectedTeam,
  triggerRefetch,
}: RemoveUserDialogProps) => {
  const [isTeamMemberRemoveLoading, setIsTeamMemberRemoveLoading] =
    useState(false)

  const handleTeamMemberRemove = async () => {
    setIsTeamMemberRemoveLoading(true)
    try {
      const response = await axiosInstance.delete(`${BACKEND_URL}/team/user`, {
        data: {
          memberId: selectedTeamMember?.userId,
          teamId: selectedTeam?.id,
        },
      })
      if (response.status === 200) {
        const tId = toast.success(response.data.message)
        toast.dismiss(tId)
        triggerRefetch()
        onClose()
      } else {
        toast.error('Failed to remove team member')
      }
      setIsTeamMemberRemoveLoading(false)
    } catch (error) {
      toast.error('Failed to remove team member')
      setIsTeamMemberRemoveLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure, you want to remove{' '}
            <span className='text-primary'>
              {' '}
              {selectedTeamMember?.fullname}
            </span>{' '}
            ?
          </AlertDialogTitle>
          <AlertDialogDescription className='text-red-500'>
            Note: This action is permanent and irreversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleTeamMemberRemove}>
            {isTeamMemberRemoveLoading ? (
              <>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </>
            ) : (
              'Remove Member'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default RemoveUserDialog
