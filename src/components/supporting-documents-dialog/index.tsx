/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { FileUp } from 'lucide-react'
import { ChangeEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { uploadSupportingDocumentsAction } from '@/app/actions/upload-supporting-documents'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const MAX_FILES = 5
const MAX_FILE_SIZE = 1024 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt']

interface SupportingDocumentsDialogProps {
  fileId: string
}

const SupportingDocumentsDialog = ({
  fileId,
}: SupportingDocumentsDialogProps) => {
  const [open, setOpen] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedExtensions, setUploadedExtensions] = useState<string[]>([])

  useEffect(() => {
    if (!open) {
      setUploadedFiles([])
      setUploadedExtensions([])
    }
  }, [open])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return

    const files = Array.from(event.target.files)

    if (uploadedFiles.length + files.length > MAX_FILES) {
      toast.error(
        `Maximum ${MAX_FILES} files allowed. Please contact support for more.`
      )
      event.target.value = ''
      return
    }

    const invalidFiles = files.filter((file) => {
      const parts = file.name.split('.')
      const extension =
        parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
      return !ALLOWED_EXTENSIONS.includes(extension)
    })

    if (invalidFiles.length > 0) {
      const invalidFileNames = invalidFiles.map((f) => f.name).join(', ')
      toast.error(
        `Invalid file type(s): ${invalidFileNames}. Allowed types: ${ALLOWED_EXTENSIONS.join(
          ', '
        )}`
      )
      event.target.value = ''
      return
    }

    const oversizedFiles = files.filter((file) => file.size > MAX_FILE_SIZE)
    if (oversizedFiles.length > 0) {
      const oversizedFileNames = oversizedFiles.map((f) => f.name).join(', ')
      toast.error(
        `File(s) exceed the maximum size of 1GB: ${oversizedFileNames}`
      )
      event.target.value = ''
      return
    }

    const extensions = files.map((file) => {
      const parts = file.name.split('.')
      return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
    })

    setUploadedFiles((prev) => [...prev, ...files])
    setUploadedExtensions((prev) => [...prev, ...extensions])
  }

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please select at least one file to upload')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('fileId', fileId)
      formData.append('fileCount', uploadedFiles.length.toString())

      uploadedFiles.forEach((file, index) => {
        formData.append(`file-${index}`, file)
      })

      const response = await uploadSupportingDocumentsAction(formData)

      if (response.success) {
        toast.success('Supporting documents uploaded successfully')
        setOpen(false)
      } else {
        toast.error(response.message || 'Failed to upload supporting documents')
      }
    } catch (error) {
      toast.error('Failed to upload supporting documents')
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => {
      const newFiles = [...prev]
      newFiles.splice(index, 1)
      return newFiles
    })

    setUploadedExtensions((prev) => {
      const newExtensions = [...prev]
      newExtensions.splice(index, 1)
      return newExtensions
    })
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen !== open) {
      setOpen(newOpen)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger>
        <Button
          className='flex items-center border border-2 justify-center px-4 py-2 text-sm font-medium rounded-[32px] cursor-pointer transition-all duration-200 hover:opacity-90 not-rounded'
          variant='outline'
        >
          Upload Supporting Documents
        </Button>
      </DialogTrigger>
      <DialogContent className='p-0 gap-0'>
        <DialogHeader className='p-4'>
          <DialogTitle>Upload Supporting Documents</DialogTitle>
        </DialogHeader>

        <div className='m-4 mt-1 flex flex-col gap-4'>
          <div className='border rounded-md p-3 bg-muted/30'>
            <div className='flex flex-wrap gap-2 items-center'>
              <p className='text-sm font-medium mr-1'>Requirements:</p>
              <Badge variant='outline'>Max 5 files</Badge>
              <Badge variant='outline'>Max 1GB per file</Badge>
              <Badge variant='outline'>PDF, DOCX, TXT formats only</Badge>
            </div>
          </div>

          <div className='flex flex-col gap-3 items-center p-[32px] rounded-md border border-primary border-dashed md:w-full'>
            <div className='flex gap-3 text-base font-medium leading-6'>
              <FileUp className='w-5 h-5' />
              <span>Upload supporting documents</span>
            </div>

            <div className='w-full'>
              {uploadedFiles.length > 0 ? (
                <div className='space-y-2 mt-2'>
                  {uploadedFiles.map((file, index) => {
                    const parts = file.name.split('.')
                    const extension =
                      parts.length > 1
                        ? parts[parts.length - 1].toLowerCase()
                        : ''

                    return (
                      <div
                        key={index}
                        className='flex justify-between items-center p-2 rounded-md border border-green-500/50 bg-green-50/50'
                      >
                        <div className='flex items-center'>
                          <Badge variant='default' className='mr-2'>
                            {extension}
                          </Badge>
                          <span className='text-sm truncate max-w-[180px]'>
                            {file.name}
                          </span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs text-muted-foreground'>
                            {(file.size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-6 w-6 p-0'
                            onClick={() => removeFile(index)}
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className='text-muted-foreground text-center mt-2'>
                  No files selected
                </div>
              )}

              {uploadedFiles.length > 0 && (
                <div className='mt-2 text-sm'>
                  {uploadedFiles.length} files selected
                </div>
              )}
            </div>

            <div className='flex gap-4 font-semibold text-muted-foreground'>
              <input
                id='fileInput'
                type='file'
                multiple
                hidden
                onChange={handleFileChange}
                accept='.pdf,.docx,.txt'
              />
              <label
                htmlFor='fileInput'
                className='justify-center px-5 py-2 rounded-[32px] cursor-pointer hover:bg-secondary'
              >
                Choose files
              </label>
            </div>
          </div>

          <Button
            disabled={isUploading || uploadedFiles.length === 0}
            onClick={handleUpload}
          >
            {isUploading && (
              <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
            )}
            Upload Documents
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SupportingDocumentsDialog
