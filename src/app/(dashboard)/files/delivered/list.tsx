/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { ChevronDownIcon, ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import axios, { AxiosError } from 'axios'
import { Session } from 'next-auth'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import ArchiveFileDialog from './components/archive-file-dialog'
import BulkArchiveFileDialog from './components/bulk-archive-dialog'
import { CheckAndDownload } from './components/check-download'
import { DataTable } from './components/data-table'
import { orderController } from './controllers'
import DeleteBulkFileModal from '@/components/delete-bulk-file'
import DeleteFileDialog from '@/components/delete-file-modal'
import RenameFileDialog from '@/components/file-rename-dialog'
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
import FileAudioPlayer from '@/components/utils/FileAudioPlayer'
import { BACKEND_URL } from '@/constants'
import { User } from '@/types/files'
import axiosInstance from '@/utils/axios'
import formatDateTime from '@/utils/formatDateTime'
import formatDuration from '@/utils/formatDuration'
import getInitials from '@/utils/getInitials'

interface File {
  id: string
  filename: string
  date: string
  duration: number
  orderType: string
  orderId: string
  uploadedByUser: User
}

export default function DeliveredFilesPage({ files }: { files: File[] }) {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [openArchiveDialog, setOpenArchiveDialog] = useState(false)
  const { data: session } = useSession()
  const [toggleCheckAndDownload, setToggleCheckAndDownload] =
    useState<boolean>(false)
  const [selectedFile, setSeletedFile] = useState<{
    fileId: string
    name: string
    orderId: string
  } | null>(null)
  const [playing, setPlaying] = useState<Record<string, boolean>>({})

  const [deliveredFiles, setDeliveredFiles] = useState<File[]>(files)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openRenameDialog, setOpenRenameDialog] = useState(false)
  const [openBulkDeleteDialog, setOpenBulkDeleteDialog] = useState(false)
  const [openBulkArchiveDialog, setOpenBulkArchiveDialog] = useState(false)
  const [loadingOrder, setLoadingOrder] = useState<Record<string, boolean>>({})
  const [currentlyPlayingFileUrl, setCurrentlyPlayingFileUrl] = useState<{
    [key: string]: string
  }>({})

  const getAudioUrl = async (fileId: string) => {
    try {
      const response = await axiosInstance.get(
        `${BACKEND_URL}/get-audio/${fileId}`,
        { responseType: 'blob' }
      ) // Replace with your file name
      const url = URL.createObjectURL(response.data)
      return url
    } catch (error) {
      toast.error('Failed to play audio.')
    }
  }

  useEffect(() => {
    const fileId = Object.keys(playing)[0]
    if (!fileId) return
    getAudioUrl(fileId).then((url) => {
      if (url) {
        setCurrentlyPlayingFileUrl({ [fileId]: url })
      }
    })
  }, [playing])

  const fetchDeliveredFiles = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }

    try {
      const response = await axios.get(`/api/files?status=delivered`)

      const files = response.data.map(
        (file: {
          fileId: string
          filename: string
          createdAt: string
          duration: number
          Orders: { orderType: string; id: string; deliveredTs: string }[]
          uploadedByUser: User
        }) => ({
          id: file.fileId,
          filename: file.filename,
          date: file.Orders[0]?.deliveredTs,
          duration: file.duration,
          orderType: file.Orders[0]?.orderType,
          orderId: file.Orders[0]?.id,
          uploadedByUser: file.uploadedByUser,
        })
      )
      setDeliveredFiles(files ?? [])
      setError(null)
    } catch (err) {
      setError('an error occurred')
      console.error('Failed to fetch pending files:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const [selectedFiles, setSelectedFiles] = useState<string[]>([])

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

  const controller = async (
    payload: { fileId: string; filename?: string; docType?: string },
    type: string
  ) => {
    try {
      const response = await orderController(payload, type)
      const successToastId = toast.success(`${response}`)
      toast.dismiss(successToastId)
      fetchDeliveredFiles()
    } catch (err) {
      const errorToastId = toast.error(`Error` + err)
      toast.dismiss(errorToastId)
      console.log(err)
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
        <div className='flex items-center gap-5'>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label='Select row'
          />
          <FileAudioPlayer
            fileId={row.original.id}
            playing={playing}
            setPlaying={setPlaying}
            url={currentlyPlayingFileUrl[row.original.id]}
          />
        </div>
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
    {
      accessorKey: 'transcription',
      header: 'Transcription',
      cell: ({ row }) => (
        <div className='font-medium cursor-pointer'>
          <p
            onClick={() => {
              controller(
                {
                  fileId: row.original.id,
                  filename: '',
                  docType:
                    session?.user?.organizationName.toLowerCase() ===
                    'remotelegal'
                      ? 'CUSTOM_FORMATTING_DOC'
                      : 'TRANSCRIPTION_DOC',
                },
                'downloadFile'
              )
            }}
            className='underline text-primary'
          >
            File
          </p>
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
        {loadingOrder[row.original.id] ? (
          <Button disabled variant='order' className='format-button w-[140px]'>
            Please wait
            <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
          </Button>
        ) : (
          <Button
            variant='order'
            className='format-button'
            onClick={() => {
              setToggleCheckAndDownload(true)
              setSeletedFile({
                fileId: row?.original?.id,
                name: row?.original?.filename,
                orderId: row?.original?.orderId,
              })
            }}
          >
            Check & Download
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
              onClick={() => handleMP3Download(row.original.id)}
            >
              Download MP3
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSeletedFile({
                  fileId: row.original.id,
                  name: row.original.filename,
                  orderId: row.original.orderId,
                })
                setOpenRenameDialog(true)
              }}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setOpenArchiveDialog(true)
                setSeletedFile({
                  fileId: row?.original?.id,
                  name: row?.original?.filename,
                  orderId: row?.original?.orderId,
                })
              }}
            >
              Archive
            </DropdownMenuItem>

            {/* <DropdownMenuItem
                onClick={() =>
                  controller({ fileId: row?.original?.id }, 'editTranscription')
                }
              >
                Edit Transcriptioin
              </DropdownMenuItem> */}
            <DropdownMenuItem
              className='text-red-500'
              onClick={() => {
                setOpenDeleteDialog(true)
                setSeletedFile({
                  fileId: row?.original?.id,
                  name: row?.original.filename,
                  orderId: row?.original.orderId,
                })
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  })

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file')
      return
    }
    setOpenBulkDeleteDialog(true)
  }

  const handleBulkArchive = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file')
      return
    }
    setOpenBulkArchiveDialog(true)
  }

  const handleMP3Download = async (fileId: string) => {
    try {
      setLoadingOrder((prev) => ({ ...prev, [fileId]: true }))
      const response = await axios.get(
        `/api/file/download-mp3?fileId=${fileId}`
      )
      if (response.status === 200) {
        const data = response.data
        window.open(data.url, '_blank')
        setLoadingOrder((prev) => ({ ...prev, [fileId]: false }))
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.message)
        toast.dismiss(errorToastId)
      }
      setLoadingOrder((prev) => ({ ...prev, [fileId]: false }))
    }
  }

  return (
    <>
      <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex bg-muted/40'>
        <div className='flex items-center justify-between space-y-2'>
          <div>
            <h1 className='text-lg font-semibold md:text-lg'>
              Delivered ({deliveredFiles?.length})
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
              className='format-button text-black w-[140px]'
              onClick={handleBulkArchive}
            >
              Archive
            </Button>

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
          data={deliveredFiles ?? []}
          columns={columns}
          onSelectedRowsChange={handleSelectedRowsChange}
        />
        {selectedFile && toggleCheckAndDownload && deliveredFiles?.length && (
          <CheckAndDownload
            selected={selectedFile.fileId || ''}
            orderId={selectedFile.orderId || ''}
            files={deliveredFiles}
            toggleCheckAndDownload={toggleCheckAndDownload}
            setToggleCheckAndDownload={setToggleCheckAndDownload}
            session={session as Session}
          />
        )}
      </div>
      <DeleteFileDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        fileId={selectedFile?.fileId || ''}
        filename={selectedFile?.name || ''}
        refetch={fetchDeliveredFiles}
      />
      <ArchiveFileDialog
        open={openArchiveDialog}
        onClose={() => setOpenArchiveDialog(false)}
        fileId={selectedFile?.fileId || ''}
        controllerType={'archiveFile'}
        controller={(fileId: string, handlertype: string) =>
          controller({ fileId: fileId }, handlertype)
        }
      />
      <RenameFileDialog
        open={openRenameDialog}
        onClose={() => setOpenRenameDialog(false)}
        fileId={selectedFile?.fileId || ''}
        filename={selectedFile?.name || ''}
        refetch={fetchDeliveredFiles}
      />
      <DeleteBulkFileModal
        open={openBulkDeleteDialog}
        onClose={() => setOpenBulkDeleteDialog(false)}
        fileIds={selectedFiles || []}
        refetch={fetchDeliveredFiles}
      />
      <BulkArchiveFileDialog
        open={openBulkArchiveDialog}
        onClose={() => setOpenBulkArchiveDialog(false)}
        fileId={selectedFiles.join(',') || ''}
        controllerType={'archiveFile'}
        controller={(fileId: string, handlertype: string) =>
          controller({ fileId: fileId }, handlertype)
        }
      />
    </>
  )
}
