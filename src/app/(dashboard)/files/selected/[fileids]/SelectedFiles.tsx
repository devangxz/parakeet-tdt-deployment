/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { ChevronDownIcon, ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { FileWarning } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { DataTable } from '@/app/(dashboard)/files/all-files/components/data-table'
import { CheckAndDownload } from '@/app/(dashboard)/files/delivered/components/check-download'
import { downloadMp3 } from '@/app/actions/file/download-mp3'
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { createOrder } from '@/app/actions/order'
import { getFileDocxSignedUrl } from '@/app/actions/order/file-docx-signed-url'
import { getFileTxtSignedUrl } from '@/app/actions/order/file-txt-signed-url'
import DeleteFileDialog from '@/components/delete-file-modal'
import DownloadModal from '@/components/download-modal'
import DraftTranscriptFileDialog from '@/components/draft-transcript'
import RenameFileDialog from '@/components/file-rename-dialog'
import MoveFileModal from '@/components/move-file-modal'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import FileAudioPlayer from '@/components/utils/FileAudioPlayer'
import formatDateTime from '@/utils/formatDateTime'
import formatDuration from '@/utils/formatDuration'

interface CustomFile {
  id: string
  name: string
  date: string
  duration: number
  fileStatus: string
  status: string
  orderType: string
  orderId: string | number
  folderId: number | null
}

interface SelectedFilesClientProps {
  initialFiles: CustomFile[]
}

export function SelectedFiles({ initialFiles }: SelectedFilesClientProps) {
  console.log(initialFiles)
  const { data: session } = useSession()
  const router = useRouter()

  const [loadingFileOrder, setLoadingFileOrder] = useState<
    Record<string, boolean>
  >({})
  const [toggleCheckAndDownload, setToggleCheckAndDownload] =
    useState<boolean>(false)
  const [openRenameDialog, setOpenRenameDialog] = useState(false)
  const [openDraftTranscriptDialog, setOpenDraftTranscriptDialog] =
    useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [openMoveFileDialog, setOpenMoveFileDialog] = useState(false)
  const [openDownloadDialog, setOpenDownloadDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<{
    fileId: string
    name: string
    orderId: string
    orderType: string
  } | null>(null)
  const [signedUrls, setSignedUrls] = useState<{
    txtSignedUrl: string
    cfDocxSignedUrl: string
  }>({
    txtSignedUrl: '',
    cfDocxSignedUrl: '',
  })
  const [playing, setPlaying] = useState<Record<string, boolean>>({})
  const [currentlyPlayingFileUrl, setCurrentlyPlayingFileUrl] = useState<{
    [key: string]: string
  }>({})
  const [selectedRows, setSelectedRows] = useState<CustomFile[]>([])

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

  const handleSelectedRowsChange = (selectedRowsData: CustomFile[]) => {
    setSelectedRows(selectedRowsData)
  }

  const handleOrderFile = async (fileId: string, orderType: string) => {
    if (session?.user?.status !== 'VERIFIED') {
      router.push('/verify-email')
      return
    }
    setLoadingFileOrder((prev) => ({ ...prev, [fileId]: true }))
    try {
      const response = await createOrder([fileId], orderType)
      if (!response?.success)
        throw new Error(response?.message || 'Unknown error')
      if (response.success && 'inv' in response)
        window.location.assign(
          `/payments/invoice/${response.inv}?orderType=${orderType}`
        )
    } catch (error) {
      console.error('Failed to create order:', error)
    } finally {
      setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
    }
  }

  const handleCheckAndDownload = async (fileId: string) => {
    try {
      setLoadingFileOrder((prev) => ({ ...prev, [fileId]: true }))
      const txtRes = await getFileTxtSignedUrl(fileId)
      const docxRes = await getFileDocxSignedUrl(
        fileId,
        'CUSTOM_FORMATTING_DOC'
      )
      setSignedUrls({
        txtSignedUrl: txtRes.signedUrl || '',
        cfDocxSignedUrl: docxRes ? docxRes.signedUrl || '' : '',
      })
      setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
      setToggleCheckAndDownload(true)
    } catch (error) {
      toast.error('Error downloading files')
      setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
    }
  }

  const handleMP3Download = async (fileId: string) => {
    try {
      setLoadingFileOrder((prev) => ({ ...prev, [fileId]: true }))
      const url = await downloadMp3(fileId)
      if (!url?.success) throw new Error('Failed to download MP3')
      window.open(url.url, '_blank')
    } catch (error) {
      toast.error('Failed to download MP3')
    } finally {
      setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
    }
  }

  const getStatus = (status: string) => {
    const statuses: {
      [key: string]: {
        label: string
        text: string
        controller: (
          fileId: string,
          filename: string,
          orderId: string,
          orderType: string
        ) => void
      }
    } = {
      NOT_ORDERED: {
        label:
          session && session.user?.orderType !== 'TRANSCRIPTION'
            ? 'Format'
            : 'Transcribe',
        text: 'text-black',
        controller: (
          fileId: string,
          _filename: string,
          _orderId: string,
          _orderType: string
        ) =>
          handleOrderFile(fileId, session?.user?.orderType ?? 'TRANSCRIPTION'),
      },
      DELIVERED: {
        label: 'Check & Download',
        text: 'text-black',
        controller: (
          fileId: string,
          filename: string,
          orderId: string,
          orderType: string
        ) => {
          setSelectedFile({ fileId, name: filename, orderId, orderType })
          handleCheckAndDownload(fileId)
        },
      },
      REFUNDED: {
        label: 'Refund',
        text: 'text-[#E75839]',
        controller: (
          fileId: string,
          _filename: string,
          _orderId: string,
          orderType: string
        ) => console.log(fileId, orderType),
      },
      DEFAULT: {
        label: 'Draft Transcript',
        text: 'text-black',
        controller: (
          fileId: string,
          filename: string,
          orderId: string,
          orderType: string
        ) => {
          setSelectedFile({ fileId, name: filename, orderId, orderType })
          setOpenDraftTranscriptDialog(true)
        },
      },
    }
    if (status === 'CANCELLED') return statuses.NOT_ORDERED
    return statuses[status] || statuses.DEFAULT
  }

  const columns: ColumnDef<CustomFile>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <div className='flex items-center gap-5'>
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label='Select all'
          />
        </div>
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
        <div className='font-medium cursor-grab flex items-center gap-2'>
          {row.getValue('name')}
          {row.original.fileStatus === 'DUPLICATE' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <FileWarning size={20} />
              </TooltipTrigger>
              <TooltipContent>Duplicate</TooltipContent>
            </Tooltip>
          )}
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
            : '-'}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableHiding: false,
      cell: ({ row }) => (
        <div className='flex items-center'>
          {loadingFileOrder[row.original.id] ? (
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
              className={`format-button w-[160px] ${
                getStatus(row.original.status).text
              }`}
              onClick={() =>
                getStatus(row.original.status).controller(
                  row.original.id,
                  row.original.name,
                  row.original.orderId?.toString() || '',
                  row.original.orderType || ''
                )
              }
            >
              {getStatus(row.original.status).label}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='order'
                className='h-9 w-8 p-0 format-icon-button'
              >
                <ChevronDownIcon className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onClick={() => handleMP3Download(row.original.id)}
              >
                Download MP3
              </DropdownMenuItem>
              {session?.user?.orderType !== 'TRANSCRIPTION' &&
                row.original.status === 'NOT_ORDERED' && (
                  <DropdownMenuItem
                    onClick={() =>
                      handleOrderFile(row.original.id, 'TRANSCRIPTION')
                    }
                  >
                    Transcribe
                  </DropdownMenuItem>
                )}
              <DropdownMenuItem
                onClick={() => {
                  setSelectedFile({
                    fileId: row.original.id,
                    name: row.original.name,
                    orderId: row.original.orderId?.toString() || '',
                    orderType: row.original.orderType || '',
                  })
                  setOpenRenameDialog(true)
                }}
              >
                Rename
              </DropdownMenuItem>
              {getStatus(row.original.status).label !== 'Draft Transcript' && (
                <DropdownMenuItem
                  className='text-red-500'
                  onClick={() => {
                    setSelectedFile({
                      fileId: row.original.id,
                      name: row.original.name,
                      orderId: row.original.orderId?.toString() || '',
                      orderType: row.original.orderType || '',
                    })
                    setOpenDeleteDialog(true)
                  }}
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable
        data={initialFiles}
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
          session={session as any}
          txtSignedUrl={signedUrls.txtSignedUrl}
          cfDocxSignedUrl={signedUrls.cfDocxSignedUrl}
        />
      )}
      <DraftTranscriptFileDialog
        open={openDraftTranscriptDialog}
        onClose={() => setOpenDraftTranscriptDialog(false)}
        fileId={selectedFile?.fileId || ''}
        filename={selectedFile?.name || ''}
      />
      <RenameFileDialog
        open={openRenameDialog}
        onClose={() => setOpenRenameDialog(false)}
        fileId={selectedFile?.fileId || ''}
        filename={selectedFile?.name || ''}
        refetch={() => {}}
      />
      <DeleteFileDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        fileId={selectedFile?.fileId || ''}
        filename={selectedFile?.name || ''}
        refetch={() => {}}
      />
      <MoveFileModal
        selectedFile={selectedFile}
        isMoveFileDialogOpen={openMoveFileDialog}
        setIsMoveFileDialogOpen={setOpenMoveFileDialog}
        folderId={null}
        refetch={() => {}}
      />
      <DownloadModal
        isDownloadDialogOpen={openDownloadDialog}
        setIsDownloadDialogOpen={setOpenDownloadDialog}
        fileIds={selectedRows.map((file) => file.id) || []}
      />
    </>
  )
}

export default SelectedFiles
