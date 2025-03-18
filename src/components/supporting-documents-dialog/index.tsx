/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { FileUp, FileIcon, ExternalLinkIcon, Trash2 } from 'lucide-react'
import { ChangeEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { deleteSupportingDocumentAction } from '@/app/actions/delete-supporting-document'
import {
  getSupportingDocumentsAction,
  SupportingDocument,
} from '@/app/actions/get-supporting-documents'
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
import { Separator } from '@/components/ui/separator'

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
  const [existingDocuments, setExistingDocuments] = useState<
    SupportingDocument[]
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [deletingDocIds, setDeletingDocIds] = useState<number[]>([])

  useEffect(() => {
    if (open) {
      fetchExistingDocuments()
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setUploadedFiles([])
      setUploadedExtensions([])
    }
  }, [open])

  const fetchExistingDocuments = async () => {
    setIsLoading(true)
    try {
      const response = await getSupportingDocumentsAction(fileId)
      if (response.success && response.documents) {
        setExistingDocuments(response.documents)
      } else {
        toast.error(response.message || 'Failed to fetch supporting documents')
      }
    } catch (error) {
      toast.error('Failed to fetch supporting documents')
    } finally {
      setIsLoading(false)
    }
  }

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
        fetchExistingDocuments()
        setUploadedFiles([])
        setUploadedExtensions([])
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

  const handleFileDownload = (url: string, filename: string) => {
    window.open(url, '_blank')
  }

  const handleDeleteDocument = async (documentId: number) => {
    // Add document ID to loading state
    setDeletingDocIds((prev) => [...prev, documentId])

    try {
      const response = await deleteSupportingDocumentAction(documentId)

      if (response.success) {
        toast.success('Document deleted successfully')
        // Remove the document from the list
        setExistingDocuments((prev) =>
          prev.filter((doc) => doc.id !== documentId)
        )
      } else {
        toast.error(response.message || 'Failed to delete document')
      }
    } catch (error) {
      toast.error('Failed to delete document')
    } finally {
      // Remove document ID from loading state
      setDeletingDocIds((prev) => prev.filter((id) => id !== documentId))
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
          <DialogTitle>Supporting Documents</DialogTitle>
        </DialogHeader>

        <div className='m-4 mt-2 flex flex-col gap-4'>
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
            {isUploading ? (
              <>
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </Button>

          {/* Existing documents section */}
          <Separator className='my-2' />

          <div className='flex flex-col gap-2'>
            <h3 className='text-sm font-medium mb-2'>Uploaded Documents</h3>

            {isLoading ? (
              <div className='flex items-center justify-center py-4'>
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                <span>Loading documents...</span>
              </div>
            ) : existingDocuments.length > 0 ? (
              <div className='w-full space-y-2'>
                {existingDocuments.map((doc) => {
                  const extension = doc.fileExtension || 'unknown'
                  const isDeleting = deletingDocIds.includes(doc.id)

                  return (
                    <div
                      key={doc.id}
                      className='flex justify-between items-center p-3 rounded-md border'
                    >
                      <div className='flex items-center'>
                        <FileIcon className='mr-2 h-5 w-5 text-primary' />
                        <div>
                          <div className='flex items-center'>
                            <Badge variant='outline' className='mr-2'>
                              {extension.toUpperCase()}
                            </Badge>
                            <span className='text-sm font-medium truncate max-w-[250px]'>
                              {doc.filename}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className='flex gap-2'>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-8 w-8 p-0'
                          onClick={() =>
                            handleFileDownload(doc.url, doc.filename)
                          }
                        >
                          <ExternalLinkIcon className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-8 w-8 p-0 text-destructive hover:text-destructive/80'
                          onClick={() => handleDeleteDocument(doc.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <ReloadIcon className='h-4 w-4 animate-spin' />
                          ) : (
                            <Trash2 className='h-4 w-4' />
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className='text-muted-foreground text-center py-4 border rounded-md p-3'>
                No supporting documents uploaded yet
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SupportingDocumentsDialog
