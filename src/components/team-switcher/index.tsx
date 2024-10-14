'use client'

import {
  CaretSortIcon,
  CheckIcon,
  PlusCircledIcon,
} from '@radix-ui/react-icons'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import * as React from 'react'

import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const initialTeams = [
  {
    label: 'Personal Workspace',
    teams: [
      {
        label: 'My Workspace',
        value: 'null',
        backgroundColor: '#000000',
      },
    ],
  },
  {
    label: 'Teams',
    teams: [],
  },
]

type Team = (typeof initialTeams)[number]['teams'][number]

type PopoverTriggerProps = React.ComponentPropsWithoutRef<typeof PopoverTrigger>

interface TeamSwitcherProps extends PopoverTriggerProps {}

type Workspaces = {
  teamName: string
  userRole: string
  internalAdminUserId: number
}

const backgroundColors = [
  '#FF5733',
  '#33FF57',
  '#3357FF',
  '#FF33A1',
  '#A133FF',
  '#33FFF7',
  '#FFD633',
  '#FF8333',
  '#33FF83',
  '#5733FF',
]

export default function TeamSwitcher({ className }: TeamSwitcherProps) {
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const [open, setOpen] = React.useState(false)
  const [teams, setTeams] = React.useState(initialTeams)
  const [selectedTeam, setSelectedTeam] = React.useState<Team>(
    teams[0].teams[0]
  )

  const fetchAllTeams = async () => {
    if (status !== 'authenticated' || !session?.user?.token) return

    try {
      const response = await axios.get(`/api/workspaces`)

      const fetchedTeams = response.data.data.map(
        (team: Workspaces, index: number) => ({
          label: team.teamName,
          value: String(team.internalAdminUserId),
          backgroundColor: backgroundColors[index % backgroundColors.length],
        })
      )

      const selectedTeamId = session.user.internalTeamUserId

      setTeams((prevTeams) => {
        const newTeams = [...prevTeams]
        newTeams[1].teams = fetchedTeams
        return newTeams
      })

      const matchingTeam = fetchedTeams.find(
        (team: { value: string }) => team.value === String(selectedTeamId)
      )
      if (matchingTeam) {
        setSelectedTeam(matchingTeam)
      }
    } catch (err) {
      console.error('Failed to fetch workspaces:', err)
    }
  }

  React.useEffect(() => {
    fetchAllTeams()
  }, [status])

  const handleTeamSwitch = async (team: Team) => {
    try {
      const response = await axios.post(`/api/workspaces/switch`, {
        internalTeamUserId: team.value,
      })
      if (response.status === 200) {
        const data = response.data.details
        await update({
          ...session,
          user: {
            ...session?.user,
            token: data.token,
            internalTeamUserId: data.internalTeamUserId,
            teamName: data.teamName,
            selectedUserTeamRole: data.selectedUserTeamRole,
            customPlan: data.customPlan,
            orderType: data.orderType,
            organizationName: data.organizationName,
          },
        })
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to switch workspace')
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          aria-label='Select a team'
          className={cn(
            'w-[250px] justify-between not-rounded bg-primary/10 text-primary border-primary/0',
            className
          )}
        >
          <Avatar
            className='mr-2 h-5 w-5'
            style={{ backgroundColor: selectedTeam.backgroundColor }}
          ></Avatar>
          {selectedTeam.label}
          <CaretSortIcon className='ml-auto h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[250px] p-0'>
        <Command>
          <CommandList>
            <CommandInput placeholder='Search team...' />
            <CommandEmpty>No team found.</CommandEmpty>
            {teams.map((team) => (
              <CommandGroup key={team.label} heading={team.label}>
                {team.teams.map((team) => (
                  <CommandItem
                    key={team.value}
                    onSelect={() => {
                      handleTeamSwitch(team)
                      setSelectedTeam(team)
                      setOpen(false)
                    }}
                    className='text-sm'
                  >
                    <Avatar
                      className='mr-2 h-5 w-5'
                      style={{ backgroundColor: team.backgroundColor }}
                    ></Avatar>
                    {team.label}
                    <CheckIcon
                      className={cn(
                        'ml-auto h-4 w-4',
                        selectedTeam.value === team.value
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
          <CommandSeparator />
          <CommandList>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  router.push(`/settings/teams`)
                }}
                className='cursor-pointer'
              >
                <PlusCircledIcon className='mr-2 h-5 w-5' />
                Create Team
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
