'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { Session } from 'next-auth'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import ChangeRoleDialog from './change-team-member-role'
import { MemberDataTable } from './member-data-table'
import RemoveUserDialog from './remove-team-member'
import { TeamMember, TeamMemberRoleType, TeamMemberRole } from './types'
import { addTeamMember } from '@/app/actions/team/member/add'
import { getTeamMembers } from '@/app/actions/team/members'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Team } from '@/types/teams'
import isValidEmail from '@/utils/isValidEmail'

const getInitials = (name: string) => {
  const nameParts = name.split(' ')
  let initials = nameParts[0].charAt(0)
  if (nameParts.length > 1) {
    initials += nameParts[1].charAt(0)
  } else {
    initials += nameParts[0].charAt(1)
  }

  return initials.toUpperCase()
}

interface TeamDetailsDialogProps {
  open: boolean
  onClose: () => void
  selectedTeam: Team
  session: Session
}

const TeamDetailsDialog = ({
  open,
  onClose,
  selectedTeam,
  session,
}: TeamDetailsDialogProps) => {
  const [addTeamMemberData, setAddTeamMemberData] = useState({
    memberEmail: '',
    memberRole: '',
  })
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<
    TeamMember[] | null
  >([])
  const [isTeamMembersLoading, setIsTeamMembersLoading] = useState(true)
  const [isTeamMemberAddLoading, setIsTeamMemberAddLoading] = useState(false)
  const [openRemoveUserDialog, setOpenRemoveUserDialog] = useState(false)
  const [openChangeTeamMemberRoleDialog, setOpenChangeTeamMemberRoleDialog] =
    useState(false)
  const [selectedTeamMember, setSelectedTeamMember] =
    useState<TeamMember | null>(null)

  const fetchTeamMembers = async (showLoader = false) => {
    if (showLoader) {
      setIsTeamMembersLoading(true)
    } else {
      setIsTeamMembersLoading(false)
    }

    try {
      const response = await getTeamMembers(selectedTeam?.id)
      if (response.success && response.members) {
        const teamMembers = response.members.team_members.map((teamMember) => ({
          isGroupAdmin: response.members.is_group_admin,
          fullname: teamMember.fullname ?? 'N/A',
          email: teamMember.email,
          status: teamMember.status,
          userId: teamMember.userId,
          teamId: teamMember.teamId,
          role: teamMember.role as TeamMemberRoleType,
        }))
        setSelectedTeamMembers(teamMembers ?? [])
      } else {
        toast.error('Failed to fetch team members')
      }
    } catch (err) {
      toast.error('Failed to fetch team members')
    } finally {
      setIsTeamMembersLoading(false)
    }
  }

  const handleAddTeamMemberInputChange = (e: {
    target: { id: string; value: string }
  }) => {
    const { id, value } = e.target
    setAddTeamMemberData((prev) => ({ ...prev, [id]: value }))
  }

  const handleAddTeamMemberSelectChange = (value: string) => {
    setAddTeamMemberData((prev) => ({ ...prev, memberRole: value }))
  }

  const handleAddTeamMember = async () => {
    if (!addTeamMemberData.memberEmail || !addTeamMemberData.memberRole) {
      toast.error('Email and role are required')
      return
    }
    if (!isValidEmail(addTeamMemberData.memberEmail)) {
      toast.error('Please enter a valid email address.')
      return
    }
    setIsTeamMemberAddLoading(true)
    try {
      const response = await addTeamMember(
        addTeamMemberData.memberEmail,
        addTeamMemberData.memberRole,
        selectedTeam?.id
      )
      if (response.success) {
        const tId = toast.success(response.message)
        toast.dismiss(tId)
        fetchTeamMembers()
        setAddTeamMemberData({
          memberEmail: '',
          memberRole: '',
        })
      } else {
        toast.error('Failed to add team member')
      }
      setIsTeamMemberAddLoading(false)
    } catch (error) {
      toast.error('Failed to add team member')
      setIsTeamMemberAddLoading(false)
    }
  }

  const memberColumns: ColumnDef<TeamMember>[] = [
    {
      id: 'sl',
      header: 'SL.',
      cell: ({ row }) => (
        <div className='capitalize font-medium'>{row.index + 1}</div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'fullname',
      header: 'Name',
      cell: ({ row }) => (
        <div className='flex items-center gap-2 font-medium'>
          <Avatar className='w-[40px] h-[40px]'>
            <AvatarFallback className='text-xs'>
              {row.original.fullname
                ? getInitials(row.getValue('fullname'))
                : getInitials('NA')}
            </AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            {row.original.fullname ? row.getValue('fullname') : 'N/A'}
            <span className='text-muted-foreground'>{row.original.email}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.getValue('role') as TeamMemberRoleType
        return (
          <div className='capitalize font-medium'>{TeamMemberRole[role]}</div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className='capitalize font-medium'>{row.getValue('status')}</div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableHiding: false,
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
          {row.original.isGroupAdmin && row.original.role !== 'SUPER_ADMIN' && (
            <>
              <Button
                variant='outline'
                className='not-rounded'
                onClick={() => openChangeRole(row.original)}
              >
                Change Role
              </Button>
              <Button
                variant='outline'
                className='not-rounded text-red-500'
                onClick={() => openRemoveUser(row.original)}
              >
                Delete Member
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  useEffect(() => {
    if (open) {
      fetchTeamMembers(true)
    }
  }, [open])

  const openRemoveUser = (teamMember: TeamMember) => {
    setSelectedTeamMember(teamMember)
    setOpenRemoveUserDialog(true)
  }

  const openChangeRole = (teamMember: TeamMember) => {
    setSelectedTeamMember(teamMember)
    setOpenChangeTeamMemberRoleDialog(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className='sm:max-w-[892px]'>
          <DialogHeader>
            <DialogTitle>{selectedTeam?.name}</DialogTitle>
          </DialogHeader>
          <h1 className='text-lg font-semibold md:text-lg mt-5'>
            Add team members
          </h1>
          {isTeamMembersLoading ? (
            <div className='flex items-center justify-center'>
              <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
              <p>Loading...</p>
            </div>
          ) : (
            <>
              <div className='flex w-full items-center justify-between just gap-5 mt-2'>
                <div className='flex gap-5'>
                  <div>
                    <Label htmlFor='memberEmail'>Email ID</Label>
                    <Input
                      id='memberEmail'
                      type='email'
                      placeholder='Write member email ID'
                      className='w-[350px]'
                      value={addTeamMemberData.memberEmail}
                      onChange={handleAddTeamMemberInputChange}
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select onValueChange={handleAddTeamMemberSelectChange}>
                      <SelectTrigger className='w-[200px]'>
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
                </div>

                {isTeamMemberAddLoading ? (
                  <Button disabled className='mt-5'>
                    Please wait
                    <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                  </Button>
                ) : (
                  <Button className='mt-5' onClick={handleAddTeamMember}>
                    Add Member
                  </Button>
                )}
              </div>
              <Separator />
              <h1 className='text-lg font-semibold md:text-lg mt-3'>Members</h1>
              <MemberDataTable
                data={selectedTeamMembers || []}
                columns={memberColumns}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
      <RemoveUserDialog
        open={openRemoveUserDialog}
        onClose={() => setOpenRemoveUserDialog(false)}
        selectedTeamMember={selectedTeamMember!}
        selectedTeam={selectedTeam}
        session={session}
        triggerRefetch={fetchTeamMembers}
      />
      <ChangeRoleDialog
        open={openChangeTeamMemberRoleDialog}
        onClose={() => setOpenChangeTeamMemberRoleDialog(false)}
        selectedTeamMember={selectedTeamMember!}
        selectedTeam={selectedTeam}
        session={session}
        triggerRefetch={fetchTeamMembers}
      />
    </>
  )
}

export default TeamDetailsDialog
