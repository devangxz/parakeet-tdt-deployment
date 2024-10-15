import { ChevronDownIcon, ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import axios, { AxiosError } from 'axios'
import { FileWarning, FolderClosed, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Session } from 'next-auth'
import { useSession } from 'next-auth/react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ZodNumberCheck } from 'zod'

import { DataTable } from './components/data-table'
import { CheckAndDownload } from '../delivered/components/check-download'
import DeleteBulkFileModal from '@/components/delete-bulk-file'
import DeleteFileDialog from '@/components/delete-file-modal'
import DraftTranscriptFileDialog from '@/components/draft-transcript'
import RenameFileDialog from '@/components/file-rename-dialog'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
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
import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'
import formatDateTime from '@/utils/formatDateTime'
import formatDuration from '@/utils/formatDuration'

interface CustomFile {
  id: string
  name: string
  size: number
  type: string
  fileStatus: string
  status: string
  date: Date
}

interface AllFile {
  id: string
  name: string
  date: string
  duration: number
  fileStatus: string
  status: string
  orderType: string
  orderId: number
}

interface Folder {
  id: number
  name: string
  parentId: number | null
  createdAt: string
  updatedAt: string
  userId: number
}

const AllFiles = ({ folderId = null }: { folderId: string | null }) => {
  const router = useRouter()
  const { data: session } = useSession()
  const isClient = typeof window === 'object'
  let fileIds: string[] | null = null
  if (isClient) {
    const queryParams = new URLSearchParams(window.location.search)
    const ids = queryParams.get('ids')
    fileIds = ids?.split(',') || null
  }
  const [selected, setSelected] = useState<string>('')
  const [toggleCheckAndDownload, setToggleCheckAndDownload] =
    useState<boolean>(false)
  const [loadingFileOrder, setLoadingFileOrder] = useState<
    Record<string, boolean>
  >({})
  const [openRenameDialog, setOpenRenameDialog] = useState(false)
  const [openDraftTranscriptDialog, setDraftTranscriptDialog] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedFile, setSeletedFile] = useState<{
    fileId: string
    name: string
  } | null>(null)
  const [fileIdsLength, setFileIdsLength] = useState<number | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [openBulkDeleteDialog, setOpenBulkDeleteDialog] = useState(false)
  const [playing, setPlaying] = useState<Record<string, boolean>>({})
  const [currentlyPlayingFileUrl, setCurrentlyPlayingFileUrl] = useState<{
    [key: string]: string
  }>({})

  const [parentFolders, setParentFolders] = useState<Folder[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAllFoldersLoading, setIsAllFoldersLoading] = useState(true)
  const [allFolders, setAllFolders] = useState<Folder[] | null>(null)
  const [allFiles, setAllFiles] = useState<AllFile[] | null>(null)
  const [isAllFilesLoading, setIsAllFilesLoading] = useState(true)

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

  useEffect(() => {
    setFileIdsLength(fileIds?.length || null)
  }, [fileIds])

  const getAllFiles = async () => {
    try {
      const response = await axios.get(
        `/api/all-files?parentId=${folderId}&fileIds=${fileIds}`
      )

      const files = response?.data?.filesWithStatus?.map(
        (file: {
          fileId: string
          filename: string
          createdAt: string
          duration: ZodNumberCheck
          fileStatus: string
          status: string
          orderType: string
          orderId: string
        }) => ({
          id: file.fileId,
          name: file.filename,
          date: file.createdAt,
          duration: file.duration,
          fileStatus: file?.fileStatus,
          status: file?.status,
          orderType: file?.orderType,
          orderId: file?.orderId,
        })
      )

      setAllFiles(files ?? [])
    } catch (err) {
      console.error('Failed to fetch all files:', err)
    } finally {
      setIsAllFilesLoading(false)
    }
  }

  const getAllFolders = async () => {
    try {
      const response = await axios.get(`/api/folders?parentId=${folderId}`)

      setAllFolders(response.data.folders ?? [])
    } catch (err) {
      console.error('Failed to fetch pending files:', err)
    } finally {
      setIsAllFoldersLoading(false)
    }
  }
  const getParentFolders = async () => {
    try {
      const response = await axios.get(
        `/api/folders/parent?folderId=${folderId}`
      )

      setParentFolders(response.data.folderHierarchy ?? [])
    } catch (err) {
      console.error('Failed to fetch pending files:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    getAllFiles()
    getAllFolders()
    getParentFolders()
  }, [folderId])

  const isPageLoading = isAllFilesLoading || isAllFoldersLoading || isLoading

  const [selectedFiles, setSelectedFiles] = useState<CustomFile[]>([])

  const handleSelectedRowsChange = (selectedRowsData: CustomFile[]) => {
    setSelectedFiles(selectedRowsData)
  }

  if (isPageLoading) {
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

  const orderFile = async (fileId: string, orderType: string) => {
    if (session?.user?.status !== 'VERIFIED') {
      router.push('/verify-email')
      return
    }
    setLoadingFileOrder((prev) => ({ ...prev, [fileId]: true }))
    try {
      const response = await axios.post(`/api/order`, {
        fids: fileId,
        orderType,
      })

      if (response.status === 200) {
        window.location.assign(
          `/payments/invoice/${response.data.inv}?orderType=${orderType}`
        )
        setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
      } else {
        setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
        console.error('Failed to process the order', response.data)
      }
    } catch (error) {
      setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
    }
  }

  const getStatus = (status: string) => {
    const statuses = {
      NOT_ORDERED: {
        label:
          session && session.user?.orderType !== 'TRANSCRIPTION'
            ? 'Format'
            : 'Transcribe',
        text: 'text-black',
        controller: (fileId: string, orderType: string) =>
          orderFile(fileId, orderType),
      },
      DELIVERED: {
        label: 'Check & Download',
        text: 'text-black',
        controller: (fileId: string, orderType: string) => {
          setSelected(fileId)
          setToggleCheckAndDownload(true)
          console.log(orderType)
        },
      },
      REFUNDED: {
        label: 'Refund',
        text: 'text-[#E75839]',
        controller: (fileId: string, orderType: string) => {
          console.log(fileId, orderType)
        },
      },
      DEFAULT: {
        label: 'Draft Transcript',
        text: 'text-black',
        controller: (fileId: string, orderType: string, filename: string) => {
          setSeletedFile({
            fileId,
            name: filename,
          })
          setDraftTranscriptDialog(true)
        },
      },
    }

    if (status === 'CANCELLED') {
      return statuses.NOT_ORDERED
    }

    return statuses[status as keyof typeof statuses] || statuses.DEFAULT
  }

  const columns: ColumnDef<CustomFile>[] = [
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
          {'parentId' in row.original && 'id' in row.original ? (
            ''
          ) : (
            <FileAudioPlayer
              fileId={row.original.id}
              playing={playing}
              setPlaying={setPlaying}
              url={currentlyPlayingFileUrl[row.original.id]}
            />
          )}
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
          {'parentId' in row.original && 'id' in row.original ? (
            <Link
              href={`/files/all-files?folderId=${row.original?.id}`}
              className='font-medium cursor-pointer'
            >
              <div className='flex gap-2'>
                {row.getValue('name')} <FolderClosed size={20} />
              </div>
            </Link>
          ) : (
            <div className='font-medium cursor-grab flex items-center gap-2'>
              {row.getValue('name')}
              {row.original.fileStatus === 'DUPLICATE' && (
                <Tip message={'Duplicate'} icon={<FileWarning size={20} />} />
              )}{' '}
            </div>
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
            : ''}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableHiding: false,
      cell: ({ row }) => (
        <div>
          {'parentId' in row.original && 'id' in row.original ? (
            <></>
          ) : (
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
                  className={`format-button w-[140px] ${getStatus(
                    row.original.status
                  )}`}
                  onClick={() =>
                    getStatus(row.original.status).controller(
                      row.original.id,
                      session?.user?.orderType as string,
                      row.original.name
                    )
                  }
                >
                  {getStatus(row.original.status)?.label}
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
                    onClick={() => handleMP3Download(row.original.id)}
                  >
                    Download MP3
                  </DropdownMenuItem>
                  {session?.user?.orderType !== 'TRANSCRIPTION' && (
                    <DropdownMenuItem
                      onClick={() =>
                        orderFile(row.original.id, 'TRANSCRIPTION')
                      }
                    >
                      Transcribe
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                      setSeletedFile({
                        fileId: row.original.id,
                        name: row.original.name,
                      })
                      setOpenRenameDialog(true)
                    }}
                  >
                    Rename
                  </DropdownMenuItem>
                  {getStatus(row.original.status)?.label !==
                    'Draft Transcript' && (
                    <DropdownMenuItem
                      className='text-red-500'
                      onClick={() => {
                        setSeletedFile({
                          fileId: row.original.id,
                          name: row.original.name,
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
          )}
        </div>
      ),
    },
  ]

  const handleBulkDelete = async () => {
    const filteredFiles = selectedFiles.filter(
      (file) => file.status !== undefined
    )

    const deletableFiles = filteredFiles.filter(
      (file) => file.status === 'NOT_ORDERED' || file.status === 'DELIVERED'
    )

    if (deletableFiles.length === 0) {
      toast.error('Please select at least one file')
      return
    }
    setOpenBulkDeleteDialog(true)
  }

  const orderBulkFile = async (orderType: string) => {
    if (session?.user?.status !== 'VERIFIED') {
      router.push('/verify-email')
      return
    }

    const filteredFiles = selectedFiles.filter(
      (file) => file.status !== undefined
    )

    const pendingFiles = filteredFiles.filter(
      (file) => file.status === 'NOT_ORDERED'
    )

    if (pendingFiles.length === 0) {
      toast.error('Please select at least pending file')
      return
    }

    setBulkLoading(true)
    try {
      const response = await axios.post(`/api/order`, {
        fids: pendingFiles.map((file) => file.id).join(','),
        orderType,
      })

      if (response.status === 200) {
        window.location.assign(
          `/payments/invoice/${response.data.inv}?orderType=${orderType}`
        )
        setBulkLoading(false)
      } else {
        setBulkLoading(false)
        console.error('Failed to process the order', response.data)
      }
    } catch (error) {
      setBulkLoading(false)
    }
  }

  const handleMP3Download = async (fileId: string) => {
    try {
      setLoadingFileOrder((prev) => ({ ...prev, [fileId]: true }))
      const response = await axios.get(
        `/api/file/download-mp3?fileId=${fileId}`
      )
      if (response.status === 200) {
        const data = response.data
        window.open(data.url, '_blank')
        setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.message)
        toast.dismiss(errorToastId)
      }
      setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
    }
  }

  return (
    <div>
      <div className='flex items-center justify-between space-y-2'>
        <div>
          <h1 className='text-lg font-semibold md:text-lg'>
            All ({allFiles?.length})
          </h1>
        </div>
        <div className='flex items-center space-x-2'>
          {fileIdsLength !== null && (
            <span className='rounded-md bg-purple-200 flex items-center gap-[4px] h-10 text-indigo-600 px-[10px] text-[13px]'>
              {fileIdsLength} <span>Selected</span>{' '}
              <a href='/files/all-files'>
                <X width={13} height={13} />
              </a>
            </span>
          )}
          <div className='flex items-center'>
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
                className='format-button text-black w-[140px]'
                onClick={() =>
                  orderBulkFile(session?.user?.orderType as string)
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
                    onClick={() => orderBulkFile('TRANSCRIPTION')}
                  >
                    Transcribe
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
      </div>
      <br />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={`/files/all-files`}>
              My WorkSpace
            </BreadcrumbLink>
          </BreadcrumbItem>
          {parentFolders?.map((item, index: number) => (
            <BreadcrumbItem key={item?.id}>
              {0 == index && <BreadcrumbSeparator />}
              <BreadcrumbLink href={`/files/all-files?folderId=${item?.id}`}>
                {item?.name}
              </BreadcrumbLink>
              {parentFolders?.length - 1 > index && <BreadcrumbSeparator />}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <br />
      <DataTable
        data={
          [
            ...(allFiles ?? []),
            ...(allFolders ?? []),
          ] as unknown as CustomFile[]
        }
        columns={columns as ColumnDef<CustomFile, unknown>[]}
        onSelectedRowsChange={handleSelectedRowsChange}
      />
      {selected && toggleCheckAndDownload && allFiles?.length && (
        <CheckAndDownload
          selected={selected}
          files={allFiles?.map((file) => ({
            id: file.id,
            filename: file.name,
            date: file.date,
            duration: file.duration,
            orderType: file.orderType,
          }))}
          toggleCheckAndDownload={toggleCheckAndDownload}
          setToggleCheckAndDownload={setToggleCheckAndDownload}
          session={session as Session}
          orderId=''
        />
      )}
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
        refetch={getAllFiles}
      />
      <DeleteFileDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        fileId={selectedFile?.fileId || ''}
        filename={selectedFile?.name || ''}
        refetch={getAllFiles}
      />
      <DeleteBulkFileModal
        open={openBulkDeleteDialog}
        onClose={() => setOpenBulkDeleteDialog(false)}
        fileIds={
          selectedFiles
            .filter((file) => file.status !== undefined)
            .filter((file) => file.status === 'NOT_ORDERED')
            .map((file) => file.id) || []
        }
        refetch={getAllFiles}
      />
    </div>
  )
}
export default AllFiles

export function Tip({ message, icon }: { message: string; icon: JSX.Element }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{icon}</TooltipTrigger>
      <TooltipContent>
        <p>{message}</p>
      </TooltipContent>
    </Tooltip>
  )
}
