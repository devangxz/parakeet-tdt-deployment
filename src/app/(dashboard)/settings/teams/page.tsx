'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { DataTable } from './components/data-table'
import RenameTeamDialog from './components/rename-team'
import TeamDetailsDialog from './components/team-details'
import { InvitationDetails } from './components/types'
import UserPermissions from './components/user-permissions'
import { acceptTeamJoinRequest } from '@/app/actions/team/accept-join-request'
import { createTeam } from '@/app/actions/team/create'
import { declineTeamJoinRequest } from '@/app/actions/team/decline-join-request'
import { getTeams } from '@/app/actions/teams'
import HeadingDescription from '@/components/heading-description'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Team } from '@/types/teams'

export default function TeamsPage() {
  const { data: session } = useSession()
  const [allTeams, setAllTeams] = useState<Team[] | null>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [newTeamName, setNewTeamName] = useState<string>('')
  const [openRenameDialog, setOpenRenameDialog] = useState(false)
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false)
  const [isCreateTeamLoading, setIsCreateTeamLoading] = useState(false)
  const [showInvitation, setShowInvitation] = useState(false)
  const [invitationDetails, setInvitationDetails] = useState<
    InvitationDetails[] | null
  >([])
  const [isAcceptInviteLoading, setIsAcceptInviteLoading] = useState(false)
  const [isDeclineInviteLoading, setIsDeclineInviteLoading] = useState(false)

  const fetchAllTeams = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }

    try {
      const response = await getTeams()

      if (!response.success) {
        setError(response.message || 'An error occurred')
        return
      }

      const teams =
        response.teams?.map((team) => ({
          id: team.team.id,
          name: team.team.name,
          members: team.team.members.length.toString(),
        })) ?? []
      const showInvite = Boolean(response.invitations?.length)
      const invitations = response.invitations?.map(
        (invitation: {
          group_id: number
          name: string
          admin_name: string
          admin_email: string
        }) => ({
          teamId: invitation.group_id,
          teamName: invitation.name,
          adminName: invitation.admin_name,
          adminEmail: invitation.admin_email,
        })
      )
      setInvitationDetails(invitations ?? [])
      setShowInvitation(showInvite)
      setAllTeams(teams ?? [])
      setError(null)
    } catch (err) {
      setError('an error occurred')
      console.error('Failed to fetch pending files:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllTeams(true)
  }, [])

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

  const columns: ColumnDef<Team>[] = [
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
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('name')}</div>
      ),
    },
    {
      accessorKey: 'members',
      header: 'Members',
      cell: ({ row }) => (
        <div className='capitalize font-medium'>{row.getValue('members')}</div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableHiding: false,
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
          <Button
            variant='outline'
            className='border-2 border-customBorder not-rounded w-[140px]'
            onClick={() => {
              setSelectedTeam(row.original)
              setOpenRenameDialog(true)
            }}
          >
            Rename
          </Button>
          <Button
            variant='outline'
            className='border-2 border-customBorder not-rounded w-[140px]'
            onClick={() => {
              setSelectedTeam(row.original)
              setOpenDetailsDialog(true)
            }}
          >
            Manage
          </Button>
        </div>
      ),
    },
  ]

  const handleCreateTeam = async () => {
    if (newTeamName.trim() === '') {
      toast.error('Team name is required')
      return
    }
    setIsCreateTeamLoading(true)
    try {
      const response = await createTeam(newTeamName)
      if (response.success) {
        const tId = toast.success(response.message)
        toast.dismiss(tId)
        fetchAllTeams()
      } else {
        toast.error('Failed to create team')
      }
      setIsCreateTeamLoading(false)
    } catch (error) {
      toast.error('Failed to create team')
      setIsCreateTeamLoading(false)
    }
  }

  const handleAcceptInvite = async (teamId: number) => {
    setIsAcceptInviteLoading(true)
    try {
      const response = await acceptTeamJoinRequest(teamId)
      if (response.success) {
        const tId = toast.success(response.message)
        toast.dismiss(tId)
        fetchAllTeams()
      } else {
        toast.error('Failed to accept invite')
      }
      setIsAcceptInviteLoading(false)
    } catch (error) {
      toast.error('Failed to accept invite')
      setIsAcceptInviteLoading(false)
    }
  }

  const handleDeclineInvite = async (teamId: number) => {
    setIsDeclineInviteLoading(true)
    try {
      const response = await declineTeamJoinRequest(teamId)
      if (response.success) {
        const tId = toast.success(response.message)
        toast.dismiss(tId)
        fetchAllTeams()
      } else {
        toast.error('Failed to decline invite')
      }
      setIsDeclineInviteLoading(false)
    } catch (error) {
      toast.error('Failed to decline invite')
      setIsDeclineInviteLoading(false)
    }
  }

  return (
    <>
      <div className='flex flex-1 flex-col p-4 gap-5'>
        <div className='border-b-2 border-customBorder space-y-4 pb-6'>
          <HeadingDescription
            heading='Team Workspace'
            description='Teams are collaborative workspaces where all members can upload
              files, order transcripts, edit transcripts, etc. To create a team,
              please enter the name below and invite each team member from the
              Details button. To join someone else`s team, please contact the
              team admin and request them to invite you.'
          />
          <UserPermissions />
        </div>

        {showInvitation && !session?.user?.internalTeamUserId && (
          <div className='border-b-2 border-customBorder space-y-4 pb-6'>
            <HeadingDescription
              heading='Your Pending Invitations'
              description='Please click on the Accept button if you wish to join or the Decline
            button to reject this invite. Team is a collaborative workspace
            where all team team members can upload files, orders transcript,
            edit transcripts, etc.'
            />
            <div className='space-y-4'>
              {invitationDetails?.map((invitation, index) => (
                <div key={index} className='flex items-center justify-between'>
                  <p className='text-md'>
                    You have been invited to join the{' '}
                    <b>{invitation.teamName}</b> by{' '}
                    <b>
                      {invitation.adminName} ({invitation.adminEmail})
                    </b>
                    .{' '}
                  </p>
                  <div className='flex gap-2'>
                    {isAcceptInviteLoading ? (
                      <Button disabled variant='default' className='w-full'>
                        <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                        Accept
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleAcceptInvite(invitation.teamId)}
                        variant='default'
                        className='w-full'
                      >
                        Accept
                      </Button>
                    )}

                    {isDeclineInviteLoading ? (
                      <Button disabled variant='destructive' className='w-full'>
                        <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                        Decline
                      </Button>
                    ) : (
                      <Button
                        variant='destructive'
                        onClick={() => handleDeclineInvite(invitation.teamId)}
                        className='w-full'
                      >
                        Decline
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!session?.user?.internalTeamUserId && (
          <div className='space-y-4'>
            <HeadingDescription heading='Teams' />
            <div className='flex items-center justify-between gap-20'>
              <div className='grid w-full items-center gap-1.5'>
                <Label htmlFor='teamName'>New team name</Label>
                <Input
                  id='teamName'
                  type='text'
                  placeholder='Write a name here'
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
              </div>
              <div>
                {isCreateTeamLoading ? (
                  <Button disabled variant='default' className='mt-5 w-full'>
                    Create Team
                    <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                  </Button>
                ) : (
                  <Button
                    variant='default'
                    className='mt-5 w-full'
                    onClick={handleCreateTeam}
                  >
                    Create Team
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <DataTable data={allTeams || []} columns={columns} />
      </div>
      <RenameTeamDialog
        open={openRenameDialog}
        onClose={() => setOpenRenameDialog(false)}
        selectedTeam={selectedTeam!}
        fetchAllTeams={fetchAllTeams}
        session={session!}
      />
      <TeamDetailsDialog
        open={openDetailsDialog}
        onClose={() => setOpenDetailsDialog(false)}
        selectedTeam={selectedTeam!}
        session={session!}
      />
    </>
  )
}
