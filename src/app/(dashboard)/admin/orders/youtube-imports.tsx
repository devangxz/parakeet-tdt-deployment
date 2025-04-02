'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { DataTableColumnHeader } from './components/column-header'
import { DataTable } from './components/data-table'
import YouTubeVideoUploader from '@/app/(dashboard)/admin/dashboard/components/youtube-video-uploader'
import { fetchYoutubeFilesForImport } from '@/app/actions/om/fetch-youtube-files'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import formatDateTime from '@/utils/formatDateTime'

interface YouTubeFile {
  fileId: string
  youtubeUrl: string
  createdAt: Date
  filename: string
  orderStatus: string
  orderTs: Date | null
  deliveryTs: Date | null
  userId: string
  teamUserId: string
  userEmail: string
}

export default function YouTubeImportsPage() {
  const [youtubeFiles, setYoutubeFiles] = useState<YouTubeFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFiles = async () => {
    setIsLoading(true)
    try {
      const response = await fetchYoutubeFilesForImport()
      if (response.success && response.files) {
        setYoutubeFiles(response.files)
        setError(null)
      } else {
        setError(response.message || 'Failed to fetch YouTube files')
      }
    } catch (err) {
      setError('An error occurred while fetching YouTube files')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

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
        <p className='text-red-500'>{error}</p>
      </div>
    )
  }

  const columns: ColumnDef<YouTubeFile>[] = [
    {
      accessorKey: 'fileId',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='File ID' />
      ),
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('fileId')}</div>
      ),
    },
    {
      accessorKey: 'filename',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Filename' />
      ),
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('filename') || '—'}</div>
      ),
    },
    {
      accessorKey: 'youtubeUrl',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='YouTube URL' />
      ),
      cell: ({ row }) => (
        <div className='max-w-[300px] truncate'>
          <a
            href={row.getValue('youtubeUrl') as string}
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-600 hover:underline'
          >
            {row.getValue('youtubeUrl') as string}
          </a>
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Created At' />
      ),
      cell: ({ row }) => (
        <div className='font-medium'>
          {formatDateTime(row.original.createdAt.toString())}
        </div>
      ),
    },
    {
      accessorKey: 'orderStatus',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Order Status' />
      ),
      cell: ({ row }) => (
        <div className='capitalize font-medium'>
          {row.getValue('orderStatus') || '—'}
        </div>
      ),
    },
    {
      accessorKey: 'userEmail',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='User' />
      ),
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('userEmail') || '—'}</div>
      ),
    },
    {
      accessorKey: 'userId',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='User ID' />
      ),
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('userId') || '—'}</div>
      ),
    },
    {
      accessorKey: 'deliveryTs',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Delivery Date' />
      ),
      cell: ({ row }) => (
        <div className='font-medium'>
          {row.original.deliveryTs
            ? formatDateTime(row.original.deliveryTs.toString())
            : '—'}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const file = row.original
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='order'
                size='sm'
                className='not-rounded'
                onClick={() => {
                  navigator.clipboard.writeText(file.youtubeUrl)
                  toast.success('Copied YouTube URL to clipboard')
                }}
              >
                Copy URL
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Copy import details to clipboard</p>
            </TooltipContent>
          </Tooltip>
        )
      },
    },
  ]

  return (
    <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex'>
      <div className='flex items-center justify-between space-y-2'>
        <div>
          <h2 className='text-lg font-semibold md:text-lg'>
            YouTube Files Pending Import ({youtubeFiles.length})
          </h2>
          <p className='text-sm text-muted-foreground'>
            These YouTube files need to be imported before they can be processed
          </p>
        </div>
        <div>
          <Button
            variant='order'
            size='sm'
            className='flex items-center gap-1 not-rounded'
            onClick={fetchFiles}
          >
            <ReloadIcon className='h-4 w-4' />
            Refresh
          </Button>
        </div>
      </div>
      <DataTable
        data={youtubeFiles}
        columns={columns}
        renderRowSubComponent={undefined}
      />
      <YouTubeVideoUploader />
    </div>
  )
}
