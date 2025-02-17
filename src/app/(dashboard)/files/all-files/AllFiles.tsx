/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChevronDownIcon, ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import {
  FileWarning,
  FolderClosed,
  FolderPlusIcon,
  Undo2Icon,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Session } from 'next-auth'
import { useSession } from 'next-auth/react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { DataTable } from './components/data-table'
import { CheckAndDownload } from '../delivered/components/check-download'
import { getAllFilesAction } from '@/app/actions/all-files'
import { downloadMp3 } from '@/app/actions/file/download-mp3'
import { moveFileAction } from '@/app/actions/files/move'
import { getFolders } from '@/app/actions/folders'
import { deleteFolderAction } from '@/app/actions/folders/delete'
import { getFolderHierarchy } from '@/app/actions/folders/parent'
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { createOrder } from '@/app/actions/order'
import { getFileDocxSignedUrl } from '@/app/actions/order/file-docx-signed-url'
import { getFileTxtSignedUrl } from '@/app/actions/order/file-txt-signed-url'
import CreateFolderModal from '@/components/create-folder-modal'
import DeleteBulkFileModal from '@/components/delete-bulk-file'
import DeleteFileDialog from '@/components/delete-file-modal'
import DownloadModal from '@/components/download-modal'
import DraftTranscriptFileDialog from '@/components/draft-transcript'
import RenameFileDialog from '@/components/file-rename-dialog'
import MoveFileModal from '@/components/move-file-modal'
import RenameFolderModal from '@/components/rename-folder-modal'
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
  orderType: string
  orderId: number
  folderId: number | null
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
  folderId: number | null
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
    orderId: string
    orderType: string
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
  const [signedUrls, setSignedUrls] = useState({
    txtSignedUrl: '',
    cfDocxSignedUrl: '',
  })

  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState({
    id: 0,
    name: '',
  })
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false)
  const [isMoveFileDialogOpen, setIsMoveFileDialogOpen] = useState(false)
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] =
    useState(false)

  const [selectedFiles, setSelectedFiles] = useState<CustomFile[]>([])

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

  useEffect(() => {
    setFileIdsLength(fileIds?.length || null)
  }, [fileIds])

  const fetchAllFiles = async () => {
    try {
      setIsAllFilesLoading(true)
      const response = await getAllFilesAction(
        folderId,
        fileIds?.join(',') || null
      )
      if (!response?.success) {
        throw new Error(response?.message)
      }
      const files = []
      for (const file of response?.data?.filesWithStatus || []) {
        files.push({
          id: file.fileId,
          name: file.filename,
          date: file.createdAt.toString(),
          duration: file.duration,
          fileStatus: file?.fileStatus,
          status: file?.status,
          orderType: file?.orderType ?? '',
          orderId: file?.orderId ?? '',
          folderId: file.parentId,
        })
      }
      setAllFiles(files)
    } catch (err) {
      console.error('Failed to fetch all files:', err)
    } finally {
      setIsAllFilesLoading(false)
    }
  }

  const fetchAllFolders = async () => {
    try {
      setIsAllFoldersLoading(true)
      const folders = await getFolders(folderId || 'null')
      if (!folders?.success) {
        throw new Error(folders?.message)
      }
      const formattedFolders =
        folders?.folders?.map((folder) => ({
          ...folder,
          createdAt: folder.createdAt.toString(),
          updatedAt: folder.updatedAt.toString(),
          date: folder.createdAt.toString(),
        })) ?? []
      setAllFolders(formattedFolders)
    } catch (err) {
      console.error('Failed to fetch folders:', err)
    } finally {
      setIsAllFoldersLoading(false)
    }
  }

  const fetchParentFolders = async () => {
    try {
      setIsLoading(false)
      const folders = await getFolderHierarchy(folderId ?? 'null')
      if (!folders?.success) {
        throw new Error(folders?.message)
      }
      const formattedHierarchy =
        folders?.folderHierarchy?.map((folder) => ({
          ...folder,
          createdAt: folder.createdAt.toString(),
          updatedAt: folder.updatedAt.toString(),
        })) ?? []
      setParentFolders(formattedHierarchy)
    } catch (err) {
      console.error('Failed to fetch parent folders:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllFiles()
    fetchAllFolders()
    fetchParentFolders()
  }, [folderId])

  const isPageLoading = isAllFilesLoading || isAllFoldersLoading || isLoading

  const handleSelectedRowsChange = (selectedRowsData: CustomFile[]) => {
    setSelectedFiles(selectedRowsData)
  }

  const handleDeleteFolder = async (folderId: number) => {
    const toastId = toast.loading('Deleting folder...')
    const res = await deleteFolderAction(folderId)
    if (res.success && allFolders) {
      toast.success('Folder deleted successfully')
      const newFolders = allFolders.filter((folder) => folder.id !== folderId)
      setAllFolders(newFolders)
      toast.dismiss(toastId)
    } else {
      toast.dismiss(toastId)
      if (res.message === 'Folder is not empty') {
        toast.error('Folder is not empty')
      } else {
        toast.error('Failed to delete folder')
      }
    }
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

  const handleOrderFile = async (fileId: string, orderType: string) => {
    if (session?.user?.status !== 'VERIFIED') {
      router.push('/verify-email')
      return
    }
    setLoadingFileOrder((prev) => ({ ...prev, [fileId]: true }))
    try {
      const response = await createOrder([fileId], orderType)
      if (!response?.success) {
        throw new Error(response?.message || 'Unknown error')
      }
      if (response.success && 'inv' in response) {
        window.location.assign(
          `/payments/invoice/${response.inv}?orderType=${orderType}`
        )
      }
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

  const getStatus = (status: string) => {
    const statuses = {
      NOT_ORDERED: {
        label:
          session && session.user?.orderType !== 'TRANSCRIPTION'
            ? 'Format'
            : 'Transcribe',
        text: 'text-black',
        controller: (
          fileId: string,
          filename: string,
          orderId: string,
          orderType: string
        ) => handleOrderFile(fileId, orderType),
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
          setSeletedFile({
            fileId,
            name: filename,
            orderId,
            orderType,
          })
          handleCheckAndDownload(fileId)
        },
      },
      REFUNDED: {
        label: 'Refund',
        text: 'text-[#E75839]',
        controller: (
          fileId: string,
          filename: string,
          orderId: string,
          orderType: string
        ) => {
          console.log(fileId, orderType)
        },
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
          setSeletedFile({
            fileId,
            name: filename,
            orderId,
            orderType,
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
            : '-'}
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
            <div className='flex items-center'>
              <Button
                variant='order'
                className='format-button w-[140px]'
                onClick={() => {
                  setSelectedFolder({
                    id: Number(row.original.id),
                    name: row.original.name,
                  })
                  setIsRenameDialogOpen(true)
                }}
              >
                Rename folder
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
                    onClick={() => handleDeleteFolder(Number(row.original.id))}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
                      row.original.name,
                      row.original?.orderId?.toString() ?? '',
                      row.original?.orderType ?? ''
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
                        handleOrderFile(row.original.id, 'TRANSCRIPTION')
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
                        orderId: row.original?.orderId?.toString() ?? '',
                        orderType: row.original?.orderType ?? '',
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
                        orderId: row.original?.orderId?.toString() ?? '',
                        orderType: row.original?.orderType ?? '',
                      })
                      setIsMoveFileDialogOpen(true)
                    }}
                  >
                    Move File
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/files/permalink/${row.original.id}`)
                    }
                  >
                    Permalink
                  </DropdownMenuItem>
                  {getStatus(row.original.status)?.label !==
                    'Draft Transcript' && (
                    <DropdownMenuItem
                      className='text-red-500'
                      onClick={() => {
                        setSeletedFile({
                          fileId: row.original.id,
                          name: row.original.name,
                          orderId: row.original?.orderId?.toString() ?? '',
                          orderType: row.original?.orderType ?? '',
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
      const response = await createOrder(
        pendingFiles.map((file) => file.id),
        orderType
      )

      if (!response?.success) {
        throw new Error(response?.message || 'Unknown error')
      }

      if (response.success && 'inv' in response) {
        window.location.assign(
          `/payments/invoice/${response.inv}?orderType=${orderType}`
        )
      }
    } catch (error) {
      console.error('Failed to create order:', error)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleMP3Download = async (fileId: string) => {
    try {
      setLoadingFileOrder((prev) => ({ ...prev, [fileId]: true }))
      const url = await downloadMp3(fileId)
      if (!url?.success) {
        throw new Error('Failed to download MP3')
      }
      window.open(url.url, '_blank')
    } catch (error) {
      toast.error('Failed to download MP3')
    } finally {
      setLoadingFileOrder((prev) => ({ ...prev, [fileId]: false }))
    }
  }

  const handleFileDrop = async (fileId: string, folderId: number) => {
    const toastId = toast.loading('Moving file...')
    try {
      await moveFileAction(fileId, folderId)
      await fetchAllFiles()
      toast.dismiss(toastId)
      toast.success('File moved successfully')
    } catch (error) {
      toast.dismiss(toastId)
      toast.error('Failed to move file')
    }
  }

  const handleBulkPermalink = () => {
    const fileIds = selectedFiles
      .filter((file) => 'orderType' in file && file.orderType)
      .map((file) => file.id)
    if (fileIds.length === 0) {
      toast.error('No files selected for permalink')
      return
    }
    router.push(`/files/permalink/${fileIds.join(',')}`)
  }

  return (
    <>
      <div className='h-full flex-1 flex-col p-4 md:flex'>
        <div className='flex items-start justify-between mb-1'>
          <div>
            <h1 className='text-lg font-semibold md:text-lg'>
              All ({(allFiles?.length || 0) + (allFolders?.length || 0)})
            </h1>
          </div>
          <div className='flex items-center space-x-2'>
            {fileIdsLength !== null && (
              <span className='rounded-md bg-primary/10 flex items-center gap-[4px] text-primary p-[8px] text-[13px]'>
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
                  className='format-button w-[140px]'
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
                    onClick={() => setIsDownloadDialogOpen(true)}
                  >
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBulkPermalink}>
                    Permalink
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
        </div>

        <div className='space-y-2 mb-3'>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink>
                  <Link href={`/files/all-files`}>My Workspace</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {parentFolders?.map((item, index: number) => (
                <BreadcrumbItem key={item?.id}>
                  {0 == index && <BreadcrumbSeparator />}
                  <BreadcrumbLink>
                    <Link href={`/files/all-files?folderId=${item?.id}`}>
                      {item?.name}
                    </Link>
                  </BreadcrumbLink>
                  {parentFolders?.length - 1 > index && <BreadcrumbSeparator />}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <div className='flex items-center gap-x-2'>
            <Button
              variant='outline'
              className='not-rounded gap-2 border-2 border-customBorder'
              onClick={() =>
                router.push(
                  `/files/all-files${
                    parentFolders?.[parentFolders.length - 1]?.parentId
                      ? `?folderId=${
                          parentFolders[parentFolders.length - 1].parentId
                        }`
                      : ''
                  }`
                )
              }
              disabled={!folderId}
            >
              <Undo2Icon size={18} />
            </Button>
            <Button
              onClick={() => setIsCreateFolderDialogOpen(true)}
              variant='outline'
              className='not-rounded gap-2 border-2 border-customBorder'
            >
              Create folder
              <FolderPlusIcon size={18} />
            </Button>
          </div>
        </div>

        <DataTable
          data={
            [
              ...(allFiles ?? []),
              ...(allFolders ?? []),
            ] as unknown as CustomFile[]
          }
          columns={columns as ColumnDef<CustomFile, unknown>[]}
          onSelectedRowsChange={handleSelectedRowsChange}
          onFileDrop={handleFileDrop}
        />
      </div>

      {selectedFile && toggleCheckAndDownload && (
        <CheckAndDownload
          id={selectedFile.fileId || ''}
          orderId={selectedFile.orderId || ''}
          orderType={selectedFile.orderType || ''}
          filename={selectedFile.name || ''}
          toggleCheckAndDownload={toggleCheckAndDownload}
          setToggleCheckAndDownload={setToggleCheckAndDownload}
          txtSignedUrl={signedUrls.txtSignedUrl || ''}
          cfDocxSignedUrl={signedUrls.cfDocxSignedUrl || ''}
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
        refetch={fetchAllFiles}
      />
      <DeleteFileDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        fileId={selectedFile?.fileId || ''}
        filename={selectedFile?.name || ''}
        refetch={fetchAllFiles}
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
        refetch={fetchAllFiles}
      />

      <RenameFolderModal
        selectedFolder={selectedFolder}
        isRenameDialogOpen={isRenameDialogOpen}
        setIsRenameDialogOpen={setIsRenameDialogOpen}
        refetch={fetchAllFolders}
      />
      <MoveFileModal
        selectedFile={selectedFile}
        isMoveFileDialogOpen={isMoveFileDialogOpen}
        setIsMoveFileDialogOpen={setIsMoveFileDialogOpen}
        folderId={folderId}
        refetch={fetchAllFiles}
      />

      <CreateFolderModal
        isCreateFolderDialogOpen={isCreateFolderDialogOpen}
        setIsCreateFolderDialogOpen={setIsCreateFolderDialogOpen}
        folderId={folderId}
        refetch={fetchAllFolders}
      />
      <DownloadModal
        isDownloadDialogOpen={isDownloadDialogOpen}
        setIsDownloadDialogOpen={setIsDownloadDialogOpen}
        fileIds={selectedFiles.map((file) => file.id) || []}
      />
    </>
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
