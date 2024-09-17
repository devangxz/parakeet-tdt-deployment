'use client'

import { ColumnDef } from '@tanstack/react-table'
import { CircleX, CircleCheckBig } from 'lucide-react'
import * as React from 'react'

import { MemberDataTable } from './member-data-table'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface Permission {
  action: string
  user: boolean
  supervisor: boolean
  manager: boolean
  admin: boolean
}

export default function UserPermissions() {
  const permissions = [
    {
      action: 'Upload files',
      user: true,
      supervisor: true,
      manager: true,
      admin: true,
    },
    {
      action: 'View/edit transcript of files uploaded by self',
      user: true,
      supervisor: true,
      manager: true,
      admin: true,
    },
    {
      action: 'View/edit transcript of files uploaded by anyone',
      user: false,
      supervisor: true,
      manager: true,
      admin: true,
    },
    {
      action: 'Place order, cancel order, approve additional charges',
      user: false,
      supervisor: true,
      manager: true,
      admin: true,
    },
    {
      action: 'View invoice',
      user: false,
      supervisor: false,
      manager: true,
      admin: true,
    },
    {
      action: 'Delete files',
      user: false,
      supervisor: false,
      manager: true,
      admin: true,
    },
    {
      action: 'Add, remove, promote team members',
      user: false,
      supervisor: false,
      manager: false,
      admin: true,
    },
    {
      action: 'Add credit, add or delete payment method',
      user: false,
      supervisor: false,
      manager: false,
      admin: true,
    },
  ]

  const columns: ColumnDef<Permission>[] = [
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('action')}</div>
      ),
    },
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => (
        <div className='capitalize font-medium'>
          {row.getValue('user') ? (
            <CircleCheckBig className='h-4 w-4 text-green-500' />
          ) : (
            <CircleX className='h-4 w-4 text-red-500' />
          )}
        </div>
      ),
    },
    {
      accessorKey: 'supervisor',
      header: 'Supervisor',
      cell: ({ row }) => (
        <div className='capitalize font-medium'>
          {row.getValue('supervisor') ? (
            <CircleCheckBig className='h-4 w-4 text-green-500' />
          ) : (
            <CircleX className='h-4 w-4 text-red-500' />
          )}
        </div>
      ),
    },
    {
      accessorKey: 'manager',
      header: 'Manager',
      cell: ({ row }) => (
        <div className='capitalize font-medium'>
          {row.getValue('manager') ? (
            <CircleCheckBig className='h-4 w-4 text-green-500' />
          ) : (
            <CircleX className='h-4 w-4 text-red-500' />
          )}
        </div>
      ),
    },
    {
      accessorKey: 'admin',
      header: 'Team Admin',
      cell: ({ row }) => (
        <div className='capitalize font-medium'>
          {row.getValue('admin') ? (
            <CircleCheckBig className='h-4 w-4 text-green-500' />
          ) : (
            <CircleX className='h-4 w-4 text-red-500' />
          )}
        </div>
      ),
    },
    {
      accessorKey: 'admin',
      header: 'Super Admin',
      cell: ({ row }) => (
        <div className='capitalize font-medium'>
          {row.getValue('admin') ? (
            <CircleCheckBig className='h-4 w-4 text-green-500' />
          ) : (
            <CircleX className='h-4 w-4 text-red-500' />
          )}
        </div>
      ),
    },
  ]

  return (
    <Accordion
      type='single'
      collapsible
      className='w-full'
      style={{ marginTop: '-10px' }}
    >
      <AccordionItem value='item-1'>
        <AccordionTrigger className='underline text-primary'>
          View User Permissions
        </AccordionTrigger>
        <AccordionContent>
          <MemberDataTable data={permissions} columns={columns} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
