/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { ChevronDownIcon, ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { Session } from 'next-auth'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import ArchiveFileDialog from './components/archive-file-dialog'
import BulkArchiveFileDialog from './components/bulk-archive-dialog'
import { CheckAndDownload } from './components/check-download'
import { DataTable } from './components/data-table'
import ShareFileDialog from './components/share-file'
import { orderController } from './controllers'
import { downloadMp3 } from '@/app/actions/file/download-mp3'
import { refetchFiles } from '@/app/actions/files'
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { getFileDocxSignedUrl } from '@/app/actions/order/file-docx-signed-url'
import { getFileTxtSignedUrl } from '@/app/actions/order/file-txt-signed-url'
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
import { User } from '@/types/files'
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
    orderType: string
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
  const [openShareFileDialog, setOpenShareFileDialog] = useState(false)
  const [fileIds, setFileIds] = useState<string[]>([])
  const [filenames, setFilenames] = useState<string[]>([])
  const [signedUrls, setSignedUrls] = useState({
    txtSignedUrl: '',
    cfDocxSignedUrl: '',
  })
  const setAudioUrl = async () => {
    const fileId = Object.keys(playing)[0]
    if (!fileId) return
    const res = await getSignedUrlAction(`${fileId}.mp3`, 3600)
    if (res.success && res.signedUrl) {
      setCurrentlyPlayingFileUrl({ [fileId]: res.signedUrl })
    }
  }

  useEffect(() => {
    setAudioUrl()
  }, [playing])

  const fetchDeliveredFiles = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }

    try {
      const updatedFiles = await refetchFiles('delivered')
      const files: File[] = []

      if (updatedFiles) {
        for (const file of updatedFiles as any[]) {
          files.push({
            id: file.fileId,
            filename: file.filename,
            date: file.Orders[0]?.deliveredTs,
            duration: Number(file.duration),
            orderType: file.Orders[0]?.orderType,
            orderId: file.Orders[0]?.id,
            uploadedByUser: file.uploadedByUser,
          })
        }
      }

      setDeliveredFiles(files)
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
    setFilenames(selectedRowsData.map((file) => file.filename))
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
              setSeletedFile({
                fileId: row?.original?.id,
                name: row?.original?.filename,
                orderId: row?.original?.orderId,
                orderType: row?.original?.orderType,
              })
              handleCheckAndDownload(row.original.id)
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
              onClick={() =>
                window.open(
                  `/editor/${row.original.id}`,
                  '_blank',
                  'toolbar=no,location=no,menubar=no,width=' +
                    window.screen.width +
                    ',height=' +
                    window.screen.height +
                    ',left=0,top=0'
                )
              }
            >
              Open Editor
            </DropdownMenuItem>
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
                  orderType: row.original.orderType,
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
                  orderType: row?.original?.orderType,
                })
              }}
            >
              Archive
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                setFileIds([row.original.id])
                setFilenames([row.original.filename])
                setOpenShareFileDialog(true)
              }}
            >
              Share
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
                  orderType: row?.original.orderType,
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
      const result = await downloadMp3(fileId)
      if (result.success) {
        const data = result
        window.open(data.url, '_blank')
        setLoadingOrder((prev) => ({ ...prev, [fileId]: false }))
      }
    } catch (error) {
      toast.error('Error downloading MP3')
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
                  onClick={() => {
                    if (selectedFiles.length === 0) {
                      toast.error('Please select at least one file')
                      return
                    }
                    setFileIds(selectedFiles)
                    setOpenShareFileDialog(true)
                  }}
                >
                  Share Files
                </DropdownMenuItem>
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
        {selectedFile && toggleCheckAndDownload && (
          <CheckAndDownload
            id={selectedFile.fileId || ''}
            orderId={selectedFile.orderId || ''}
            orderType={selectedFile.orderType || ''}
            filename={selectedFile.name || ''}
            toggleCheckAndDownload={toggleCheckAndDownload}
            setToggleCheckAndDownload={setToggleCheckAndDownload}
            session={session as Session}
            txtSignedUrl={signedUrls.txtSignedUrl || ''}
            cfDocxSignedUrl={signedUrls.cfDocxSignedUrl || ''}
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
      <ShareFileDialog
        open={openShareFileDialog}
        onClose={() => setOpenShareFileDialog(false)}
        fileIds={fileIds}
        filenames={filenames}
      />
    </>
  )
}
