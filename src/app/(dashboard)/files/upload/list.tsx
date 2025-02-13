/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronDownIcon, ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { FileWarning } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { DataTable } from './components/data-table'
import { copyFile } from '@/app/actions/file/copy'
import { downloadMp3 } from '@/app/actions/file/download-mp3'
import { getRefundInvoice } from '@/app/actions/file/refund-invoice'
import { refetchFiles } from '@/app/actions/files'
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { createOrder } from '@/app/actions/order'
import { fetchWorkspaces } from '@/app/actions/workspaces'
import DeleteBulkFileModal from '@/components/delete-bulk-file'
import DeleteFileDialog from '@/components/delete-file-modal'
import RenameFileDialog from '@/components/file-rename-dialog'
import PaymentsDetailsModal from '@/components/payment-details-modal'
import TransferFileModal from '@/components/transfer-files'
import TrimFileModal from '@/components/trim-file-modal'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import FileAudioPlayer from '@/components/utils/FileAudioPlayer'
import { User } from '@/types/files'
import formatDateTime from '@/utils/formatDateTime'
import formatDuration from '@/utils/formatDuration'
import getInitials from '@/utils/getInitials'

interface File {
  id: string
  name: string
  date: string
  duration: number
  fileStatus: string
  status: string
  uploadedByUser: User
  isRefunded: boolean
  folderId: number | null
}

const FileList = ({
  setUploadSuccess,
  uploadSuccess,
}: {
  setUploadSuccess: (uploadSuccess: boolean) => void
  uploadSuccess: boolean
}) => {
  const router = useRouter()
  const { data: session } = useSession()
  const [loadingFileOrder, setLoadingFileOrder] = useState<
    Record<string, boolean>
  >({})
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSeletedFile] = useState<{
    fileId: string
    name: string
    duration: number
  } | null>(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [openRenameDialog, setOpenRenameDialog] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [openBulkDeleteDialog, setOpenBulkDeleteDialog] = useState(false)
  const [openTrimFileDialog, setOpenTrimFileDialog] = useState(false)
  const [playing, setPlaying] = useState<Record<string, boolean>>({})
  const [currentlyPlayingFileUrl, setCurrentlyPlayingFileUrl] = useState<{
    [key: string]: string
  }>({})
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')
  const [workspaces, setWorkspaces] = useState<
    {
      id: string
      name: string
    }[]
  >([])
  const [openTransferDialog, setOpenTransferDialog] = useState(false)

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

  const fetchPendingFiles = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }

    try {
      const updatedFiles = await refetchFiles('pending')

      const files = updatedFiles?.map((file: any) => ({
        id: file.fileId,
        name: file.filename,
        date: file.createdAt,
        duration: file.duration,
        fileStatus: file?.fileStatus,
        status: file?.status,
        uploadedByUser: file.uploadedByUser,
        folderId: file.parentId,
        isRefunded: file.Orders[0]?.status === 'REFUNDED',
      }))
      setPendingFiles(files ?? [])
      setError(null)
    } catch (err) {
      setError('an error occurred')
      console.error('Failed to fetch pending files:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getWorkspaces = async () => {
    try {
      const response = await fetchWorkspaces()
      if (response.success) {
        const fetchedTeams = response.data?.data?.map((team: any) => ({
          name: team.teamName,
          id: String(team.internalAdminUserId),
        }))
        setWorkspaces(fetchedTeams ?? [])
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error)
    }
  }

  useEffect(() => {
    fetchPendingFiles(true)
    getWorkspaces()
  }, [])

  useEffect(() => {
    if (uploadSuccess) {
      fetchPendingFiles()
      setUploadSuccess(false)
    }
  }, [uploadSuccess])

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
          height: '20vh',
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
  const orderFile = async (fileId: string, orderType: string) => {
    if (session?.user?.status !== 'VERIFIED') {
      router.push('/verify-email')
      return
    }
    setLoadingFileOrder((prev) => ({ ...prev, [fileId]: true }))
    try {
      const response = await createOrder([fileId], orderType)

      if (response.success) {
        if (response.success && 'inv' in response) {
          window.location.assign(
            `/payments/invoice/${response.inv}?orderType=${orderType}`
          )
        }
        setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
      } else {
        setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
        console.error('Failed to process the order')
      }
    } catch (error) {
      setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
    }
  }

  const orderBulkFile = async (fileIds: string, orderType: string) => {
    if (session?.user?.status !== 'VERIFIED') {
      router.push('/verify-email')
      return
    }

    if (fileIds.length === 0) {
      toast.error('Please select at least one file')
      return
    }

    setBulkLoading(true)
    try {
      const response = await createOrder(fileIds.split(','), orderType)

      if (response.success && 'inv' in response) {
        window.location.assign(
          `/payments/invoice/${response.inv}?orderType=${orderType}`
        )
        setBulkLoading(false)
      } else {
        setBulkLoading(false)
        console.error('Failed to process the order')
      }
    } catch (error) {
      setBulkLoading(false)
    }
  }

  const refundStatus = async (fileId: string) => {
    setLoadingFileOrder((prev) => ({ ...prev, [fileId]: true }))
    const response = await getRefundInvoice(fileId)
    if (response.success && response.invoiceId) {
      setSelectedInvoiceId(response.invoiceId)
      setOpenDetailsDialog(true)
    } else {
      toast.error('Failed to get refund invoice')
    }
    setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
  }

  const copyFileHandler = async (fileId: string) => {
    setLoadingFileOrder((prev) => ({ ...prev, [fileId]: true }))
    try {
      const response = await copyFile(fileId)

      if (response.success) {
        fetchPendingFiles()
        toast.success('File copied successfully')
      } else {
        toast.error('Failed to copy file')
      }
    } catch (error) {
      toast.error('Failed to copy file')
    } finally {
      setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
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
      accessorKey: 'name',
      header: 'File name',
      cell: ({ row }) => (
        <div>
          <div className='font-medium cursor-grab flex items-center gap-2'>
            {row.getValue('name')}
            {row.original.fileStatus === 'DUPLICATE' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <FileWarning size={20} />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Duplicate</p>
                </TooltipContent>
              </Tooltip>
            )}{' '}
          </div>
        </div>
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
          {row.getValue('duration')
            ? formatDuration(row.getValue('duration'))
            : ''}
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
          <>
            {row.original.isRefunded ? (
              <Button
                variant='order'
                className='format-button text-red w-[140px]'
                style={{
                  color: '#ef4444',
                }}
                onClick={() => refundStatus(row.original.id)}
              >
                Refund Status
              </Button>
            ) : (
              <Button
                variant='order'
                className='format-button w-[140px]'
                onClick={() =>
                  orderFile(row.original.id, session?.user?.orderType as string)
                }
              >
                {session && session.user?.orderType !== 'TRANSCRIPTION'
                  ? 'Format'
                  : 'Transcribe'}
              </Button>
            )}
          </>
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
            {session?.user?.orderType !== 'TRANSCRIPTION' && (
              <DropdownMenuItem
                onClick={() => orderFile(row.original.id, 'TRANSCRIPTION')}
              >
                Transcribe
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                setSeletedFile({
                  fileId: row.original.id,
                  name: row.original.name,
                  duration: row.original.duration,
                })
                setOpenRenameDialog(true)
              }}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSeletedFile({
                  fileId: row.original.id,
                  name: row.original.name,
                  duration: row.original.duration,
                })
                setOpenTrimFileDialog(true)
              }}
            >
              Trim Audio
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                copyFileHandler(row.original.id)
              }}
            >
              Copy File
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                goToFolder(row.original.folderId)
              }}
            >
              Go to folder
            </DropdownMenuItem>
            <DropdownMenuItem
              className='text-red-500'
              onClick={() => {
                setSeletedFile({
                  fileId: row.original.id,
                  name: row.original.name,
                  duration: row.original.duration,
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

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file')
      return
    }
    setOpenBulkDeleteDialog(true)
  }

  const handleMP3Download = async (fileId: string) => {
    try {
      setLoadingFileOrder((prev) => ({ ...prev, [fileId]: true }))
      const response = await downloadMp3(fileId)
      if (response.success) {
        const data = response
        window.open(data.url, '_blank')
        setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
      }
    } catch (error) {
      toast.error('Failed to download MP3')
      setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
    }
  }

  const goToFolder = (folderId: number | null) => {
    if (folderId) {
      router.push(`/files/all-files?folderId=${folderId}`)
    } else {
      router.push(`/files/all-files`)
    }
  }

  return (
    <div className='h-full flex-1 flex-col md:flex'>
      <div className='flex items-start justify-between mb-3'>
        <h2 className='text-lg font-semibold md:text-xl'>
          Uploads ({pendingFiles?.length})
        </h2>
        <div className='flex items-center'>
          {(session?.user?.role === 'ADMIN' || session?.user?.adminAccess) && (
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
              onClick={() =>
                orderBulkFile(
                  selectedFiles.join(','),
                  session?.user?.orderType as string
                )
              }
            >
              {session && session.user?.orderType !== 'TRANSCRIPTION'
                ? 'Format'
                : 'Transcribe'}
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
              {session?.user?.orderType !== 'TRANSCRIPTION' && (
                <DropdownMenuItem
                  onClick={() =>
                    orderBulkFile(selectedFiles.join(','), 'TRANSCRIPTION')
                  }
                >
                  Transcribe
                </DropdownMenuItem>
              )}

              {workspaces.length > 0 && (
                <DropdownMenuItem
                  onClick={() => {
                    if (selectedFiles.length === 0) {
                      toast.error('Please select at least one file')
                      return
                    }
                    setOpenTransferDialog(true)
                  }}
                >
                  Transfer Files
                </DropdownMenuItem>
              )}

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
        data={pendingFiles ?? []}
        columns={columns as ColumnDef<File, unknown>[]}
        onSelectedRowsChange={handleSelectedRowsChange}
      />
      <DeleteFileDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        fileId={selectedFile?.fileId || ''}
        filename={selectedFile?.name || ''}
        refetch={fetchPendingFiles}
      />
      <RenameFileDialog
        open={openRenameDialog}
        onClose={() => setOpenRenameDialog(false)}
        fileId={selectedFile?.fileId || ''}
        filename={selectedFile?.name || ''}
        refetch={fetchPendingFiles}
      />
      <DeleteBulkFileModal
        open={openBulkDeleteDialog}
        onClose={() => setOpenBulkDeleteDialog(false)}
        fileIds={selectedFiles || []}
        refetch={fetchPendingFiles}
      />
      <TrimFileModal
        open={openTrimFileDialog}
        onClose={() => setOpenTrimFileDialog(false)}
        fileId={selectedFile?.fileId || ''}
        endDuration={selectedFile?.duration || 0}
        refetch={fetchPendingFiles}
      />
      <PaymentsDetailsModal
        open={openDetailsDialog}
        onClose={() => setOpenDetailsDialog(false)}
        selectedInvoiceId={selectedInvoiceId}
        session={session!}
      />
      <TransferFileModal
        open={openTransferDialog}
        onClose={() => setOpenTransferDialog(false)}
        fileIds={selectedFiles}
        teams={workspaces}
        refetch={fetchPendingFiles}
      />
    </div>
  )
}
export default FileList
