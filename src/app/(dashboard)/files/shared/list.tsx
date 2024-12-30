/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { ChevronDownIcon, ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { Session } from 'next-auth'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'sonner'

import { DataTable } from './components/data-table'
import { CheckAndDownload } from '../delivered/components/check-download'
import { getFileDocxSignedUrl } from '@/app/actions/order/file-docx-signed-url'
import { getFileTxtSignedUrl } from '@/app/actions/order/file-txt-signed-url'
import { getFiles } from '@/app/actions/share-file/get-files'
import { removeSharedFiles } from '@/app/actions/share-file/remove'
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
import formatDuration from '@/utils/formatDuration'
import getInitials from '@/utils/getInitials'

interface File {
  id: number
  fileId: string
  permission: string
  filename: string
  duration: number
  fromUserId: number
  email: string
  fullname: string
  status: string
  deliveredTs: string
  rating: string
  orderType: string
  orderId: number
}

export default function SharedFilesPage({ files }: { files: File[] }) {
  const { data: session } = useSession()
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedFile, setSeletedFile] = useState<{
    fileId: string
    name: string
    orderId: string
    orderType: string
  } | null>(null)
  const [sharedFiles, setSharedFiles] = useState<File[] | null>(files)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toggleCheckAndDownload, setToggleCheckAndDownload] =
    useState<boolean>(false)

  const [deleteLoading, setDeleteLoading] = useState(false)
  const [signedUrls, setSignedUrls] = useState({
    txtSignedUrl: '',
    cfDocxSignedUrl: '',
  })
  const [loadingOrder, setLoadingOrder] = useState<Record<string, boolean>>({})

  const fetchSharedFiles = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }

    try {
      const response = await getFiles()
      if (response.success && 'data' in response) {
        setSharedFiles((response.data as File[]) ?? [])
        setError(null)
      } else {
        setSharedFiles([])
        setError('Failed to load files')
      }
    } catch (err) {
      setSharedFiles([])
      setError('An error occurred while loading files')
    } finally {
      setIsLoading(false)
    }
  }

  const [selectedFiles, setSelectedFiles] = useState<string[]>([])

  const handleSelectedRowsChange = (selectedRowsData: File[]) => {
    setSelectedFiles(selectedRowsData.map((file) => file.fileId.toString()))
  }

  const handleCheckAndDownload = async (fileId: string) => {
    try {
      setLoadingOrder((prev) => ({ ...prev, [fileId]: true }))
      const txtRes = await getFileTxtSignedUrl(fileId)
      const docxRes = await getFileDocxSignedUrl(
        fileId,
        'CUSTOM_FORMATTING_DOC'
      )
      setSignedUrls({
        txtSignedUrl: txtRes.signedUrl || '',
        cfDocxSignedUrl: docxRes ? docxRes.signedUrl || '' : '',
      })
      setLoadingOrder((prev) => ({ ...prev, [fileId]: false }))
      setToggleCheckAndDownload(true)
    } catch (error) {
      toast.error('Error downloading files')
      setLoadingOrder((prev) => ({ ...prev, [fileId]: false }))
    }
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
      accessorKey: 'fileId',
      header: 'Shared by',
      cell: ({ row }) => (
        <HoverCard>
          <HoverCardTrigger asChild className='cursor-pointer'>
            <Avatar>
              <AvatarFallback>
                {getInitials(`${row.original.fullname} ${row.original.email}`)}
              </AvatarFallback>
            </Avatar>
          </HoverCardTrigger>
          <HoverCardContent className='w-80'>
            <div className='font-medium flex items-center gap-4'>
              <Avatar>
                <AvatarFallback>
                  {getInitials(
                    `${row.original.fullname} ${row.original.email}`
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                {row.original.fullname} <br />
                <span>{row.original.email}</span>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      ),
      enableSorting: false,
      enableHiding: false,
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
    {
      id: 'actions',
      header: 'Actions',
      enableHiding: false,
      cell: ({ row }) => (
        <div className='flex items-center'>
          {loadingOrder[row.original.id] ? (
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
              onClick={() => {
                setSeletedFile({
                  fileId: row.original.fileId,
                  name: row.original.filename,
                  orderId: row.original.orderId.toString(),
                  orderType: row.original.orderType,
                })
                handleCheckAndDownload(row.original.fileId.toString())
              }}
            >
              Check & Download
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
              {row.original.permission === 'EDITOR' && (
                <DropdownMenuItem
                  onClick={() => {
                    window.open(
                      `/editor/${row.original.orderId}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }}
                >
                  Edit Transcript
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                className='text-red-500'
                onClick={() => {
                  setSelectedFiles([row.original.fileId])
                  setOpenDeleteDialog(true)
                }}
              >
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  const removeShare = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file')
      return
    }

    setDeleteLoading(true)
    try {
      const response = await removeSharedFiles(selectedFiles)

      if (response.success) {
        toast.success('Files removed successfully')
        setDeleteLoading(false)
        fetchSharedFiles()
        setOpenDeleteDialog(false)
      } else {
        setDeleteLoading(false)
        toast.error('Failed to remove files')
      }
    } catch (error) {
      setDeleteLoading(false)
      toast.error('Failed to remove files')
    }
  }

  return (
    <>
      <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex bg-muted/40'>
        <div className='flex items-center justify-between space-y-2'>
          <div>
            <h1 className='text-lg font-semibold md:text-lg'>
              Shared Files ({sharedFiles?.length})
            </h1>
          </div>
          <div className='flex items-center'>
            {(session?.user?.role === 'ADMIN' ||
              session?.user?.adminAccess) && (
              <Button
                variant='order'
                className='not-rounded text-black w-[140px] mr-3'
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
            <Button
              variant='order'
              className='not-rounded text-black w-[140px]'
              onClick={() => {
                if (selectedFiles.length === 0) {
                  toast.error('Please select at least one file')
                  return
                }
                setOpenDeleteDialog(true)
              }}
            >
              Remove Share
            </Button>
          </div>
        </div>
        <DataTable
          data={sharedFiles ?? []}
          columns={columns}
          onSelectedRowsChange={handleSelectedRowsChange}
        />
      </div>

      {selectedFile && toggleCheckAndDownload && (
        <CheckAndDownload
          id={selectedFile?.fileId ?? ''}
          orderId={selectedFile?.orderId || ''}
          orderType={selectedFile?.orderType || ''}
          filename={selectedFile?.name || ''}
          toggleCheckAndDownload={toggleCheckAndDownload}
          setToggleCheckAndDownload={setToggleCheckAndDownload}
          session={session as Session}
          txtSignedUrl={signedUrls.txtSignedUrl || ''}
          cfDocxSignedUrl={signedUrls.cfDocxSignedUrl || ''}
        />
      )}
      <AlertDialog open={openDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure, you want to remove the share of the file?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-red-500'>
              Note: This action is permanent and irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={removeShare}>
              {deleteLoading ? (
                <>
                  Please wait
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                </>
              ) : (
                'Remove Share'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
