'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { Session } from 'next-auth'
import { useState } from 'react'
import { toast } from 'sonner'

import { TeamMember, TeamMemberRole } from './types'
import { updateTeamMemberRole } from '@/app/actions/team/member/role'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Team } from '@/types/teams'

interface ChangeRoleDialogProps {
  open: boolean
  onClose: () => void
  selectedTeamMember: TeamMember
  selectedTeam: Team
  session: Session
  triggerRefetch: () => void
}

const ChangeRoleDialog = ({
  open,
  onClose,
  selectedTeamMember,
  selectedTeam,
  triggerRefetch,
}: ChangeRoleDialogProps) => {
  const [updatedTeamMemberRole, setUpdatedTeamMemberRole] = useState<string>(
    selectedTeamMember?.role
  )
  const [isTeamMemberRoleChangeLoading, setIsTeamMemberRoleChangeLoading] =
    useState(false)

  const handleTeamMemberRoleChange = (value: string) => {
    setUpdatedTeamMemberRole(value)
  }

  const handleRoleUpdate = async () => {
    setIsTeamMemberRoleChangeLoading(true)
    try {
      const response = await updateTeamMemberRole(
        selectedTeamMember?.email,
        selectedTeam?.id,
        updatedTeamMemberRole
      )

      if (response.success) {
        const tId = toast.success(response.message)
        toast.dismiss(tId)
        triggerRefetch()
        onClose()
      } else {
        toast.error('Failed to update team member role')
      }
      setIsTeamMemberRoleChangeLoading(false)
    } catch (error) {
      toast.error('Failed to update team member role')
      setIsTeamMemberRoleChangeLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            Member name:{' '}
            <span className='font-bold text-primary'>
              {selectedTeamMember?.fullname}
            </span>{' '}
            <br />
            Current role:{' '}
            <span className='font-bold text-primary'>
              {selectedTeamMember && TeamMemberRole[selectedTeamMember?.role]}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className='grid w-full items-center gap-1.5 mt-5'>
          <Label>Role</Label>
          <Select
            defaultValue={selectedTeamMember?.role}
            onValueChange={handleTeamMemberRoleChange}
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Select Role' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value='USER'>User</SelectItem>
                <SelectItem value='SUPERVISOR'>Supervisor</SelectItem>
                <SelectItem value='MANAGER'>Manager</SelectItem>
                <SelectItem value='TEAM_ADMIN'>Team Admin</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type='button' variant='outline'>
              Cancel
            </Button>
          </DialogClose>
          {isTeamMemberRoleChangeLoading ? (
            <Button disabled>
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button type='submit' onClick={handleRoleUpdate}>
              Update Role
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ChangeRoleDialog
