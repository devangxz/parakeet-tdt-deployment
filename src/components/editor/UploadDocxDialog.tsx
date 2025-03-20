import { ReloadIcon } from '@radix-ui/react-icons'
import { FileUp } from 'lucide-react'
import { Session } from 'next-auth'
import { ChangeEvent, useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { ScrollArea } from '../ui/scroll-area'
import { OrderDetails } from '@/app/editor/[fileId]/page'
import {
  ButtonLoading,
  getMaxFormatFiles,
  handleFilesUpload,
  uploadFile,
  uploadFormattingFiles,
} from '@/utils/editorUtils'

type UploadDocxDialogProps = {
  orderDetails: OrderDetails
  setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>
  buttonLoading: ButtonLoading
  setFileToUpload: React.Dispatch<
    React.SetStateAction<{
      renamedFile: File | null
      originalFile: File | null
      isUploaded?: boolean
    }>
  >
  fileToUpload: {
    renamedFile: File | null
    originalFile: File | null
    isUploaded?: boolean
  }
  session: Session | null
}

const UploadDocxDialog = ({
  orderDetails,
  setButtonLoading,
  buttonLoading,
  setFileToUpload,
  fileToUpload,
  session,
}: UploadDocxDialogProps) => {
  const [open, setOpen] = useState(false)
  const [isFormattingOrder, setIsFormattingOrder] = useState(false)
  const [allowedFormats, setAllowedFormats] = useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadedExtensions, setUploadedExtensions] = useState<string[]>([])
  const [validFilesSelected, setValidFilesSelected] = useState(false)
  
  const maxFiles = useMemo(() => 
    getMaxFormatFiles(orderDetails.email || null), 
    [orderDetails.email]
  )

  useEffect(() => {
    setIsFormattingOrder(orderDetails.orderType === 'FORMATTING')

    if (orderDetails.orderType === 'FORMATTING' && orderDetails.outputFormat) {
      const formats = orderDetails.outputFormat
        .split(',')
        .map((format) => format.trim().toLowerCase())
        .filter((format) => format !== '')

      setAllowedFormats(Array.from(new Set(formats)))
    }
  }, [orderDetails])

  useEffect(() => {
    if (!open) {
      setUploadedFiles([])
      setUploadedExtensions([])
      setValidFilesSelected(false)
    }
  }, [open])

  useEffect(() => {
    if (!isFormattingOrder || uploadedFiles.length === 0) {
      setValidFilesSelected(false)
      return
    }

    const allFilesValid = uploadedExtensions.every((ext) =>
      allowedFormats.includes(ext)
    )

    const validFileCount =
      uploadedFiles.length > 0 && (maxFiles === null || uploadedFiles.length <= maxFiles)

    setValidFilesSelected(allFilesValid && validFileCount)
  }, [uploadedFiles, uploadedExtensions, allowedFormats, isFormattingOrder, maxFiles])

  const handleUpload = async () => {
    if (isFormattingOrder) {
      if (!validFilesSelected) {
        if (maxFiles !== null && uploadedFiles.length > maxFiles) {
          toast.error(`Maximum ${maxFiles} files allowed`)
        } else {
          toast.error('Please select files with the allowed formats')
        }
        return
      }

      const uploadSuccessful = await uploadFormattingFiles(
        uploadedFiles,
        setButtonLoading,
        session,
        setFileToUpload,
        orderDetails.fileId
      )

      if (uploadSuccessful) {
        setOpen(false)
      }
    } else {
      try {
        await uploadFile(
          fileToUpload,
          setButtonLoading,
          session,
          setFileToUpload,
          orderDetails.fileId
        )
        setOpen(false)
      } catch (error) {
        toast.error('Failed to upload file')
      }
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return

    if (isFormattingOrder) {
      const files = Array.from(event.target.files)

      if (maxFiles !== null && files.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`)
        event.target.value = ''
        return
      }

      const extensions = files.map((file) => {
        const parts = file.name.split('.')
        return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
      })

      const invalidExtensions = extensions.filter(
        (ext) => !allowedFormats.includes(ext)
      )

      if (invalidExtensions.length > 0) {
        toast.error(
          `Invalid file format(s): ${invalidExtensions.join(', ')}. 
          Allowed formats: ${allowedFormats.join(', ')}`
        )
        event.target.value = ''
        return
      }

      setUploadedFiles(files)
      setUploadedExtensions(extensions)
    } else {
      handleFilesUpload(
        { files: event.target.files, type: 'files' },
        orderDetails.fileId,
        setFileToUpload
      )
    }
  }

  const extensionCounts = uploadedExtensions.reduce((acc, ext) => {
    acc[ext] = (acc[ext] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen !== open) {
      setOpen(newOpen)

      if (!newOpen) {
        setUploadedFiles([])
        setUploadedExtensions([])
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger>
        <Button
          className='flex items-center border-primary border-2 justify-center px-2 py-1 text-sm font-medium text-primary rounded-[32px] cursor-pointer transition-all duration-200 hover:opacity-90'
          variant='outline'
        >
          Upload File
        </Button>
      </DialogTrigger>
      <DialogContent className='p-0 gap-0'>
        <DialogHeader className='p-4'>
          <DialogTitle>
            {isFormattingOrder ? 'Upload Formatted Files' : 'Upload Docx File'}
          </DialogTitle>
        </DialogHeader>

        <div className='m-4 mt-1 flex flex-col gap-4'>
          {isFormattingOrder && (
            <div className='border rounded-md p-3 bg-muted/30'>
              <div className='flex flex-col gap-2'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='text-muted-foreground font-medium text-sm'>
                    Allowed formats:
                  </span>
                  {allowedFormats.map((format, index) => (
                    <Badge
                      key={index}
                      variant='outline'
                      className='px-1.5 pt-0 pb-[2px] text-xs bg-primary/10 border-primary/20 text-primary'
                    >
                      {format}
                    </Badge>
                  ))}
                </div>
                {uploadedFiles.length > 0 && (
                  <div className='mt-1 text-sm'>
                    <span className='font-medium'>
                      {uploadedFiles.length === 1 ? '1 file selected:' : `${uploadedFiles.length} files selected:`}
                    </span>{' '}
                    {Object.entries(extensionCounts).map(
                      ([ext, count], index, arr) => (
                        <span key={ext}>
                          {count} {ext}
                          {index < arr.length - 1 ? ', ' : ''}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className='flex flex-col gap-3 items-center p-[32px] rounded-md border border-primary border-dashed md:w-full'>
            <div className='flex gap-3 text-base font-medium leading-6'>
              <FileUp className='w-5 h-5' />
              <span>Upload {isFormattingOrder ? 'file(s)' : 'file'}</span>
            </div>

            {isFormattingOrder ? (
              <div className='w-full'>
                {uploadedFiles.length > 0 ? (
                  <ScrollArea className={`w-full mt-2 ${uploadedFiles.length > 4 ? 'h-[200px]' : ''}`}>
                    <div className='space-y-2'>
                      {uploadedFiles.map((file, index) => {
                        const parts = file.name.split('.')
                        const extension =
                          parts.length > 1
                            ? parts[parts.length - 1].toLowerCase()
                            : ''
                        const isAllowedFormat = allowedFormats.includes(extension)

                        return (
                          <div
                            key={index}
                            className={`flex justify-between items-center p-2 rounded-md border ${
                              isAllowedFormat
                                ? 'border-green-500/50 bg-green-50/50'
                                : 'border-yellow-500/50 bg-yellow-50/50'
                            }`}
                          >
                            <div className='flex items-center'>
                              <Badge
                                variant={isAllowedFormat ? 'default' : 'outline'}
                                className='mr-2'
                              >
                                {extension}
                              </Badge>
                              <span className='text-sm truncate max-w-[180px]' title={file.name}>
                                {file.name}
                              </span>
                            </div>
                            <span className='text-xs text-muted-foreground'>
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className='text-muted-foreground text-center mt-2'>
                    No files selected
                  </div>
                )}
              </div>
            ) : (
              fileToUpload.originalFile && (
                <span>{fileToUpload.originalFile.name}</span>
              )
            )}

            <div className='flex gap-4 font-semibold text-muted-foreground'>
              <input
                id='fileInput'
                type='file'
                multiple={isFormattingOrder}
                hidden
                onChange={handleFileChange}
                accept={
                  isFormattingOrder
                    ? allowedFormats.map((format) => `.${format}`).join(',')
                    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                }
              />
              <label
                htmlFor='fileInput'
                className='justify-center px-5 py-2 rounded-[32px] cursor-pointer hover:bg-secondary'
              >
                Choose {isFormattingOrder ? 'file(s)' : 'file'}
              </label>
            </div>
          </div>

          <Button
            disabled={
              buttonLoading.upload ||
              (isFormattingOrder && !validFilesSelected) ||
              (!isFormattingOrder && !fileToUpload.originalFile)
            }
            onClick={handleUpload}
          >
            {buttonLoading.upload && (
              <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
            )}
            Upload File{isFormattingOrder ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default UploadDocxDialog
