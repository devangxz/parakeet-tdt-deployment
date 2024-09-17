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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { BACKEND_URL } from '@/constants'
import { Team } from '@/types/teams'
import axiosInstance from '@/utils/axios'

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
      const response = await axiosInstance.get(`${BACKEND_URL}/teams`)

      const teams = response.data.teams.map(
        (team: { team: { id: number; name: string; members: string[] } }) => ({
          id: team.team.id,
          name: team.team.name,
          members: team.team.members.length,
        })
      )
      const showInvite = response.data.invitations.length > 0
      const invitations = response.data.invitations.map(
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
            className='not-rounded'
            onClick={() => {
              setSelectedTeam(row.original)
              setOpenRenameDialog(true)
            }}
          >
            Rename
          </Button>
          <Button
            variant='outline'
            className='not-rounded'
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
      const responseCreateTeam = await axiosInstance.post(
        `${BACKEND_URL}/team`,
        {
          name: newTeamName,
        }
      )
      if (responseCreateTeam.status === 200) {
        const tId = toast.success(responseCreateTeam.data.message)
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
      const response = await axiosInstance.post(
        `${BACKEND_URL}/accept-join-team-request`,
        {
          teamId,
        }
      )
      if (response.status === 200) {
        const tId = toast.success(response.data.message)
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
      const response = await axiosInstance.post(
        `${BACKEND_URL}/decline-join-team-request`,
        {
          teamId,
        }
      )
      if (response.status === 200) {
        const tId = toast.success(response.data.s)
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
      <div className='h-full flex-1 flex-col space-y-[1.5rem] md:flex'>
        <div className='flex items-center justify-between space-y-2'>
          <div>
            <h1 className='text-lg font-semibold md:text-lg'>Team workspace</h1>
            <p className='text-sm mt-1 text-muted-foreground'>
              Teams are collaborative workspaces where all members can upload
              files, order transcripts, edit transcripts, etc. To create a team,
              please enter the name below and invite each team member from the
              Details button. To join someone else`s team, please contact the
              team admin and request them to invite you.
            </p>
          </div>
        </div>
        <UserPermissions />
        {showInvitation && !session?.user?.internalTeamUserId && (
          <>
            <Separator />
            <div>
              <h1 className='text-lg font-semibold md:text-lg'>
                Your pending Invitations
              </h1>
              <p className='text-sm mt-1 text-muted-foreground'>
                Please click on the Accept button if you wish to join or the
                Decline button to reject this invite. Team is a collaborative
                workspace where all team team members can upload files, orders
                transcript, edit transcripts, etc.
              </p>
              <div>
                {invitationDetails?.map((invitation, index) => (
                  <div key={index}>
                    <p className='text-md mt-5'>
                      You have been invited to join the{' '}
                      <b>{invitation.teamName}</b> by{' '}
                      <b>
                        {invitation.adminName} ({invitation.adminEmail})
                      </b>
                      .{' '}
                    </p>
                    <div className='flex gap-2 mt-2 justify-end'>
                      {isAcceptInviteLoading ? (
                        <Button disabled>
                          Please wait
                          <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleAcceptInvite(invitation.teamId)}
                        >
                          Accept
                        </Button>
                      )}

                      {isDeclineInviteLoading ? (
                        <Button disabled>
                          Please wait
                          <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                        </Button>
                      ) : (
                        <Button
                          variant='destructive'
                          onClick={() => handleDeclineInvite(invitation.teamId)}
                        >
                          Decline
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!session?.user?.internalTeamUserId && (
          <>
            <h1 className='text-lg font-semibold md:text-lg'>Teams</h1>
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
              {isCreateTeamLoading ? (
                <Button disabled className='mt-5'>
                  Please wait
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                </Button>
              ) : (
                <Button className='mt-5' onClick={handleCreateTeam}>
                  Create team
                </Button>
              )}
            </div>
          </>
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
