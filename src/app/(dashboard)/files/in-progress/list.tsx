/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { ChevronDownIcon, ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { DataTable } from './components/data-table'
import { getRefundAmountAction } from '@/app/actions/file/cancel-order'
import { downloadMp3 } from '@/app/actions/file/download-mp3'
import { refetchFiles } from '@/app/actions/files'
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import DraftTranscriptFileDialog from '@/components/draft-transcript'
import CanceOrderDialog from '@/components/draft-transcript/cancel-order'
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
import { File, User } from '@/types/files'
import formatDateTime from '@/utils/formatDateTime'
import formatDuration from '@/utils/formatDuration'
import getInitials from '@/utils/getInitials'

interface ExtendedFile extends File {
  uploadedByUser: User
  folderId: number | null
}

interface ListProps {
  files: ExtendedFile[]
}

export default function InprogressFilesPage({ files }: ListProps) {
  const [inprogressFiles, setInprogressFiles] = useState<ExtendedFile[] | null>(
    files
  )
  const [isLoading, setIsLoading] = useState(false)
  const { data: session } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [openDraftTranscriptDialog, setDraftTranscriptDialog] = useState(false)
  const [openCancelOrderDialog, setCancelOrderDialog] = useState(false)
  const [selectedFile, setSeletedFile] = useState<{
    fileId: string
    name: string
  } | null>(null)
  const [openRenameDialog, setOpenRenameDialog] = useState(false)
  const [refundedAmount, setRefundedAmount] = useState(0)
  const [loadingCancelOrder, setLoadingCancelOrder] = useState<
    Record<string, boolean>
  >({})
  const [playing, setPlaying] = useState<Record<string, boolean>>({})
  const [currentlyPlayingFileUrl, setCurrentlyPlayingFileUrl] = useState<{
    [key: string]: string
  }>({})
  const router = useRouter()

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

  const fetchInprogressFiles = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }
    try {
      const updatedFiles = await refetchFiles('in-progress')

      const files = updatedFiles
        ?.map((file: any) => ({
          id: file.fileId,
          filename: file.filename,
          date: file.Orders[0]?.orderTs,
          duration: file.duration,
          uploadedByUser: file.uploadedByUser,
          folderId: file.parentId,
        }))
        .sort((a: ExtendedFile, b: ExtendedFile) => {
          if (a.date && b.date) {
            return new Date(b.date).getTime() - new Date(a.date).getTime()
          }
          return 0
        })
      setInprogressFiles(files ?? [])
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

  const handleBulkPermalink = () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file')
      return
    }
    router.push(`/files/permalink/${selectedFiles.join(',')}`)
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

  const columns: ColumnDef<ExtendedFile>[] = [
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

  const goToFolder = (folderId: number | null) => {
    if (folderId) {
      router.push(`/files/all-files?folderId=${folderId}`)
    } else {
      router.push(`/files/all-files`)
    }
  }

  columns.push({
    id: 'actions',
    header: 'Actions',
    enableHiding: false,
    cell: ({ row }) => (
      <div className='flex items-center'>
        {loadingCancelOrder[row.original.id] ? (
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
                fileId: row.original.id,
                name: row.original.filename,
              })
              setDraftTranscriptDialog(true)
            }}
          >
            Draft Transcript
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
                })
                setOpenRenameDialog(true)
              }}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                goToFolder(row.original.folderId)
              }}
            >
              Go to folder
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(`/files/permalink/${row.original.id}`)}
            >
              Permalink
            </DropdownMenuItem>
            <DropdownMenuItem
              className='text-red-500'
              onClick={() => {
                handleCancelOrder(row.original.id, row.original.filename)
              }}
            >
              Cancel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  })

  const handleCancelOrder = async (fileId: string, filename: string) => {
    setSeletedFile({ fileId, name: filename })
    setLoadingCancelOrder((prev) => ({ ...prev, [fileId]: true }))
    try {
      const response = await getRefundAmountAction(fileId)
      if (!response.success) {
        const errorToastId = toast.error(response.s)
        toast.dismiss(errorToastId)
        return
      }
      setRefundedAmount(Number(response.amount))
      setCancelOrderDialog(true)
      setLoadingCancelOrder((prev) => ({ ...prev, [fileId]: false }))
    } catch (err) {
      const errorToastId = toast.error(`Error cancelling order`)
      toast.dismiss(errorToastId)
      setLoadingCancelOrder((prev) => ({ ...prev, [fileId]: false }))
    }
  }

  const handleMP3Download = async (fileId: string) => {
    try {
      setLoadingCancelOrder((prev) => ({ ...prev, [fileId]: true }))
      const response = await downloadMp3(fileId)
      if (response.success) {
        window.open(response.url, '_blank')
      } else {
        toast.error(response.s)
      }
      setLoadingCancelOrder((prev) => ({ ...prev, [fileId]: false }))
    } catch (error) {
      toast.error('Failed to download MP3')
      setLoadingCancelOrder((prev) => ({ ...prev, [fileId]: false }))
    }
  }

  return (
    <>
      <div className='h-full flex-1 flex-col p-4 md:flex space-y-3'>
        <div className='flex items-start justify-between'>
          <div>
            <h1 className='text-lg font-semibold md:text-xl'>In Progress</h1>
          </div>
          <div>
            {(session?.user?.role === 'ADMIN' ||
              session?.user?.adminAccess) && (
              <Button
                variant='order'
                className='not-rounded w-[140px] mr-2'
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
              className='not-rounded text-black w-[140px] ml-2'
              onClick={handleBulkPermalink}
            >
              Permalink
            </Button>
          </div>
        </div>
        <DataTable
          data={inprogressFiles || []}
          columns={columns}
          onSelectedRowsChange={handleSelectedRowsChange}
        />
      </div>
      <DraftTranscriptFileDialog
        open={openDraftTranscriptDialog}
        onClose={() => setDraftTranscriptDialog(false)}
        fileId={selectedFile?.fileId || ''}
        filename={selectedFile?.name || ''}
      />
      <RenameFileDialog
        open={openRenameDialog}
        onClose={() => setOpenRenameDialog(false)}
        fileId={selectedFile?.fileId || ''}
        filename={selectedFile?.name || ''}
        refetch={fetchInprogressFiles}
      />
      <CanceOrderDialog
        open={openCancelOrderDialog}
        onClose={() => setCancelOrderDialog(false)}
        fileId={selectedFile?.fileId || ''}
        filename={selectedFile?.name || ''}
        refetch={fetchInprogressFiles}
        amount={refundedAmount}
      />
    </>
  )
}
