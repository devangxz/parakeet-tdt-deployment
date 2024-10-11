'use client'
import { ChevronDownIcon, ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import axios, { AxiosError } from 'axios'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { DataTable } from './components/data-table'
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
import { BACKEND_URL } from '@/constants'
import { File, User } from '@/types/files'
import axiosInstance from '@/utils/axios'
import formatDateTime from '@/utils/formatDateTime'
import formatDuration from '@/utils/formatDuration'
import getInitials from '@/utils/getInitials'

interface ExtendedFile extends File {
  uploadedByUser: User
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

  const getAudioUrl = async (fileId: string) => {
    try {
      const response = await axiosInstance.get(
        `${BACKEND_URL}/get-audio/${fileId}`,
        { responseType: 'blob' }
      )
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

  const fetchInprogressFiles = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }
    try {
      const response = await axios.get(`/api/files?status=in-progress`)

      const files = response.data
        .map(
          (file: {
            fileId: string
            filename: string
            createdAt: string
            duration: number
            Orders: {
              orderTs: string
            }[]
            uploadedByUser: User
          }) => ({
            id: file.fileId,
            filename: file.filename,
            date: file.Orders[0]?.orderTs,
            duration: file.duration,
            uploadedByUser: file.uploadedByUser,
          })
        )
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
      const data = await axiosInstance.get(
        `${BACKEND_URL}/cancel-order/${fileId}`
      )
      if (data.status === 200) {
        const responseData = data.data
        if (!responseData.success) {
          const errorToastId = toast.error(responseData.message)
          toast.dismiss(errorToastId)
          return
        }
        setRefundedAmount(responseData.amount)
        setCancelOrderDialog(true)
      }
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
      const response = await axiosInstance.get(
        `${BACKEND_URL}/download-mp3?fileId=${fileId}`
      )
      if (response.status === 200) {
        const data = response.data
        window.open(data.url, '_blank')
        setLoadingCancelOrder((prev) => ({ ...prev, [fileId]: false }))
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.message)
        toast.dismiss(errorToastId)
      }
      setLoadingCancelOrder((prev) => ({ ...prev, [fileId]: false }))
    }
  }

  return (
    <>
      <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex bg-muted/40'>
        <div className='flex items-center justify-between space-y-2'>
          <div>
            <h1 className='text-lg font-semibold md:text-lg'>In Progress</h1>
          </div>
          <div>
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
