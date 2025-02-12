/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { ChevronDownIcon, ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'sonner'

import { DataTable } from './components/data-table'
import { unarchiveFileAction } from '@/app/actions/file/un-archive'
import { refetchFiles } from '@/app/actions/files'
import DeleteBulkFileModal from '@/components/delete-bulk-file'
import DeleteFileDialog from '@/components/delete-file-modal'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { User } from '@/types/files'
import formatDateTime from '@/utils/formatDateTime'
import formatDuration from '@/utils/formatDuration'
import getInitials from '@/utils/getInitials'

interface File {
  id: string
  filename: string
  date: string
  duration: number
  uploadedByUser: User
}

export default function ArchivedFilesPage({ files }: { files: File[] }) {
  const { data: session } = useSession()
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedFile, setSeletedFile] = useState<{
    fileId: string
    name: string
  } | null>(null)
  const [archivedFiles, setArchivedFiles] = useState<File[] | null>(files)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [openBulkDeleteDialog, setOpenBulkDeleteDialog] = useState(false)

  const fetchArchivedFiles = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }

    try {
      const updatedFiles = await refetchFiles('archived')

      const files =
        updatedFiles?.map((file: any) => ({
          id: file.fileId,
          filename: file.filename,
          date: file.createdAt,
          duration: file.duration,
          uploadedByUser: file.uploadedByUser,
        })) || []
      setArchivedFiles(files)
      setError(null)
    } catch (err) {
      setError('an error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [loadingFileOrder, setLoadingFileOrder] = useState<
    Record<string, boolean>
  >({})

  const handleSelectedRowsChange = (selectedRowsData: File[]) => {
    setSelectedFiles(selectedRowsData.map((file) => file.id))
  }

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

  const unarchiveFile = async (fileId: string) => {
    setLoadingFileOrder((prev) => ({ ...prev, [fileId]: true }))
    try {
      const response = await unarchiveFileAction(fileId)

      if (response.success) {
        toast.success('File unarchived successfully')
        setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
        fetchArchivedFiles()
      } else {
        setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
        toast.error('Failed to unarchive file')
      }
    } catch (error) {
      setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
      toast.error('Failed to unarchive file')
    }
  }

  const columns: ColumnDef<File>[] = [
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
      accessorKey: 'filename',
      header: 'File name',
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('filename')}</div>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <div className='font-medium'>
          {formatDateTime(row.getValue('date'))}
        </div>
      ),
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ row }) => (
        <div className='font-medium'>
          {formatDuration(row.getValue('duration'))}
        </div>
      ),
    },
  ]

  if (session?.user?.internalTeamUserId) {
    columns.push({
      accessorKey: 'uploadedBy',
      header: 'Uploaded By',
      cell: ({ row }) => (
        <HoverCard>
          <HoverCardTrigger asChild className='cursor-pointer'>
            <Avatar>
              <AvatarFallback>
                {getInitials(
                  `${row.original.uploadedByUser.firstName} ${row.original.uploadedByUser.lastName}`
                )}
              </AvatarFallback>
            </Avatar>
          </HoverCardTrigger>
          <HoverCardContent className='w-80'>
            <div className='font-medium flex items-center gap-4'>
              <Avatar>
                <AvatarFallback>
                  {getInitials(
                    `${row.original.uploadedByUser.firstName} ${row.original.uploadedByUser.lastName}`
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                {row.original.uploadedByUser.firstName}{' '}
                {row.original.uploadedByUser.lastName}
                <br />
                <span>{row.original.uploadedByUser.email}</span>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      ),
      enableSorting: false,
      enableHiding: false,
    })
  }

  columns.push({
    id: 'actions',
    header: 'Actions',
    enableHiding: false,
    cell: ({ row }) => (
      <div className='flex items-center'>
        {loadingFileOrder[row.original.id] ? (
          <Button disabled variant='order' className='format-button w-[140px]'>
            Please wait
            <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
          </Button>
        ) : (
          <Button
            variant='order'
            className='format-button w-[140px]'
            onClick={() => unarchiveFile(row.original.id)}
          >
            Unarchive
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='order' className='h-9 w-8 p-0 format-icon-button'>
              <span className='sr-only'>Open menu</span>
              <ChevronDownIcon className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem
              className='text-red-500'
              onClick={() => {
                setSeletedFile({
                  fileId: row.original.id,
                  name: row.original.filename,
                })
                setOpenDeleteDialog(true)
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  })

  const unarchiveBulkFile = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file')
      return
    }

    setBulkLoading(true)
    try {
      const response = await unarchiveFileAction(selectedFiles.join(','))

      if (response.success) {
        toast.success('Files unarchived successfully')
        setBulkLoading(false)
        fetchArchivedFiles()
      } else {
        setBulkLoading(false)
        toast.error('Failed to unarchive files')
      }
    } catch (error) {
      setBulkLoading(false)
      toast.error('Failed to unarchive files')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file')
      return
    }
    setOpenBulkDeleteDialog(true)
  }

  return (
    <>
      <div className='h-full flex-1 flex-col p-4 md:flex space-y-1'>
        <div className='flex items-start justify-between'>
          <div>
            <h1 className='text-lg font-semibold md:text-xl'>
              Archived ({archivedFiles?.length})
            </h1>
          </div>
          <div className='flex items-center'>
            {(session?.user?.role === 'ADMIN' ||
              session?.user?.adminAccess) && (
              <Button
                variant='order'
                className='not-rounded w-[140px]'
                onClick={async () => {
                  try {
                    if (selectedFiles.length === 0) {
                      toast.error('Please select at least one file')
                      return
                    }
                    await navigator.clipboard.writeText(selectedFiles.join(','))
                    toast.success('File Ids copied to clipboard')
                  } catch (error) {
                    toast.error('Failed to copy file Ids')
                  }
                }}
              >
                Copy file Ids
              </Button>
            )}
            {bulkLoading ? (
              <Button
                disabled
                variant='order'
                className='format-button w-[140px]'
              >
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </Button>
            ) : (
              <Button
                variant='order'
                className='format-button w-[140px]'
                onClick={unarchiveBulkFile}
              >
                Unarchive
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='order'
                  className='h-9 w-8 p-0 format-icon-button'
                >
                  <span className='sr-only'>Open menu</span>
                  <ChevronDownIcon className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem
                  className='text-red-500'
                  onClick={handleBulkDelete}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <DataTable
          data={archivedFiles ?? []}
          columns={columns}
          onSelectedRowsChange={handleSelectedRowsChange}
        />
      </div>
      <DeleteFileDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        fileId={selectedFile?.fileId || ''}
        filename={selectedFile?.name || ''}
        refetch={fetchArchivedFiles}
      />
      <DeleteBulkFileModal
        open={openBulkDeleteDialog}
        onClose={() => setOpenBulkDeleteDialog(false)}
        fileIds={selectedFiles || []}
        refetch={fetchArchivedFiles}
      />
    </>
  )
}
