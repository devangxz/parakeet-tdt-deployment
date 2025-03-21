'use client'

import { Role } from '@prisma/client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { DataTable } from './components/data-table'
import {
  getUsersWithoutTests,
  getActiveTestUsers,
  inviteUsers,
  removeTestInvitations,
} from '@/app/actions/test-invitations'
import { DataTableColumnHeader } from '@/components/table-components/column-header'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

interface User {
  id: number
  firstname: string | null
  lastname: string | null
  email: string
  role: Role
  createdAt: Date
}

interface TestUser extends User {
  invitationId: number
}

export default function TestInvitationsPage() {
  const [usersWithoutTests, setUsersWithoutTests] = useState<User[]>([])
  const [activeTestUsers, setActiveTestUsers] = useState<TestUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInviting, setIsInviting] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isRemovingSingle, setIsRemovingSingle] = useState<number | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [selectedTestUsers, setSelectedTestUsers] = useState<TestUser[]>([])
  const { data: session } = useSession()

  const fetchData = async () => {
    try {
      const [usersWithoutTestsRes, activeTestUsersRes] = await Promise.all([
        getUsersWithoutTests(),
        getActiveTestUsers(),
      ])

      if (usersWithoutTestsRes.success) {
        setUsersWithoutTests(usersWithoutTestsRes.data || [])
      } else {
        toast.error(usersWithoutTestsRes.error)
      }

      if (activeTestUsersRes.success) {
        setActiveTestUsers(activeTestUsersRes.data || [])
      } else {
        toast.error(activeTestUsersRes.error)
      }
    } catch (error) {
      toast.error('Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleInviteUsers = async () => {
    if (!session?.user) {
      toast.error('Not authenticated')
      return
    }

    if (selectedUsers.length === 0) {
      toast.error('No users selected')
      return
    }

    setIsInviting(true)
    try {
      const result = await inviteUsers(
        selectedUsers.map((user) => user.id),
        Number(session.user.userId)
      )

      if (result.success) {
        toast.success('Users invited successfully')
        setSelectedUsers([])
        fetchData()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to invite users')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveUsers = async (users: TestUser[] = selectedTestUsers) => {
    if (users.length === 0) {
      toast.error('No users selected')
      return
    }

    if (users.length === 1) {
      setIsRemovingSingle(users[0].id)
    } else {
      setIsRemoving(true)
    }

    try {
      const result = await removeTestInvitations(users.map((user) => user.id))

      if (result.success) {
        toast.success('Users removed successfully')
        setSelectedTestUsers([])
        fetchData()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to remove users')
    } finally {
      setIsRemoving(false)
      setIsRemovingSingle(null)
    }
  }

  const userColumns: ColumnDef<User>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Select row'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Name' />
      ),
      cell: ({ row }) => (
        <div>
          {row.original.firstname} {row.original.lastname}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Email' />
      ),
      cell: ({ row }) => <div>{row.original.email}</div>,
      filterFn: 'includesString',
    },
    {
      accessorKey: 'role',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Role' />
      ),
      cell: ({ row }) => <div>{row.original.role}</div>,
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Created At' />
      ),
      cell: ({ row }) => (
        <div>{format(new Date(row.original.createdAt), 'PPP')}</div>
      ),
    },
  ]

  const testUserColumns: ColumnDef<TestUser>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Select row'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Name' />
      ),
      cell: ({ row }) => (
        <div>
          {row.original.firstname} {row.original.lastname}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Email' />
      ),
      cell: ({ row }) => <div>{row.original.email}</div>,
      filterFn: 'includesString',
    },
    {
      accessorKey: 'role',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Role' />
      ),
      cell: ({ row }) => <div>{row.original.role}</div>,
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Created At' />
      ),
      cell: ({ row }) => (
        <div>{format(new Date(row.original.createdAt), 'PPP')}</div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant='order'
          onClick={() => handleRemoveUsers([row.original])}
          className='not-rounded'
          disabled={isRemovingSingle === row.original.id}
        >
          {isRemovingSingle === row.original.id ? (
            <>
              Removing
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </>
          ) : (
            'Remove'
          )}
        </Button>
      ),
    },
  ]

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

  return (
    <div className='h-full flex-1 flex-col space-y-8 p-5 md:flex'>
      <h1 className='text-lg font-semibold md:text-lg'>
        Transcriber Test System
      </h1>
      <div>
        {' '}
        <div className=''>
          <div>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-xl font-semibold'>
                Transcribers Without Tests
              </h3>
              <Button
                onClick={handleInviteUsers}
                disabled={selectedUsers.length === 0 || isInviting}
                variant='order'
                className='not-rounded'
              >
                {isInviting ? (
                  <>
                    Inviting
                    <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                  </>
                ) : (
                  `Invite Selected Transcribers (${selectedUsers.length})`
                )}
              </Button>
            </div>
            <DataTable
              data={usersWithoutTests}
              columns={userColumns}
              onSelectedRowsChange={setSelectedUsers}
            />
          </div>
          <hr className='my-10' />
          <div className='mt-10'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-xl font-semibold'>
                Active Test Transcribers
              </h3>
              <Button
                variant='order'
                onClick={() => handleRemoveUsers()}
                className='not-rounded'
                disabled={selectedTestUsers.length === 0 || isRemoving}
              >
                {isRemoving ? (
                  <>
                    Removing
                    <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                  </>
                ) : (
                  `Remove Selected Transcribers (${selectedTestUsers.length})`
                )}
              </Button>
            </div>
            <DataTable
              data={activeTestUsers}
              columns={testUserColumns}
              onSelectedRowsChange={setSelectedTestUsers}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
