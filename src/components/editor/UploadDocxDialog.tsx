import { ReloadIcon } from '@radix-ui/react-icons'
import { FileUp } from 'lucide-react'
import { Session } from 'next-auth'
import { ChangeEvent, useEffect, useState } from 'react'
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
import { OrderDetails } from '@/app/editor/[fileId]/page'
import {
  ButtonLoading,
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
  const [requiredFormats, setRequiredFormats] = useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadedExtensions, setUploadedExtensions] = useState<string[]>([])
  const [validFilesSelected, setValidFilesSelected] = useState(false)

  useEffect(() => {
    setIsFormattingOrder(orderDetails.orderType === 'FORMATTING')

    if (orderDetails.orderType === 'FORMATTING' && orderDetails.outputFormat) {
      const formats = orderDetails.outputFormat
        .split(',')
        .map((format) => format.trim().toLowerCase())
        .filter((format) => format !== '')

      setRequiredFormats(formats)
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

    const requiredFormatCounts = requiredFormats.reduce((acc, format) => {
      acc[format] = (acc[format] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const uploadedFormatCounts = uploadedExtensions.reduce((acc, ext) => {
      acc[ext] = (acc[ext] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const exactMatch = Object.entries(requiredFormatCounts).every(
      ([format, count]) => uploadedFormatCounts[format] === count
    )

    const noExtraFormats = Object.keys(uploadedFormatCounts).every(
      (format) => requiredFormatCounts[format] !== undefined
    )

    setValidFilesSelected(exactMatch && noExtraFormats)
  }, [uploadedFiles, uploadedExtensions, requiredFormats, isFormattingOrder])

  const handleUpload = async () => {
    if (isFormattingOrder) {
      if (!validFilesSelected) {
        toast.error('Please select exactly the required file formats')
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

      const extensions = files.map((file) => {
        const parts = file.name.split('.')
        return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
      })

      const requiredFormatCounts = requiredFormats.reduce((acc, format) => {
        acc[format] = (acc[format] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const uploadedFormatCounts = extensions.reduce((acc, ext) => {
        acc[ext] = (acc[ext] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const extraFormats = Object.keys(uploadedFormatCounts).filter(
        (format) => !requiredFormatCounts[format]
      )

      if (extraFormats.length > 0) {
        toast.error(`File format(s) not required: ${extraFormats.join(', ')}`)
        event.target.value = ''
        return
      }

      const excessiveFormats = Object.entries(uploadedFormatCounts).filter(
        ([format, count]) => count > (requiredFormatCounts[format] || 0)
      )

      if (excessiveFormats.length > 0) {
        const formatErrors = excessiveFormats.map(
          ([format, count]) =>
            `${format}: have ${count}, need ${requiredFormatCounts[format]}`
        )
        toast.error(
          `Too many files of certain formats: ${formatErrors.join(', ')}`
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

  const requiredFormatCounts = requiredFormats.reduce((acc, format) => {
    acc[format] = (acc[format] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const uploadedFormatCounts = uploadedExtensions.reduce((acc, ext) => {
    acc[ext] = (acc[ext] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const missingFormats = Object.entries(requiredFormatCounts)
    .filter(([format, count]) => (uploadedFormatCounts[format] || 0) < count)
    .map(([format]) => format)

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
              <div className='flex flex-wrap gap-2 items-center'>
                <p className='text-sm font-medium mr-1'>Required formats:</p>
                {Object.entries(requiredFormatCounts).map(([format, count]) => (
                  <Badge
                    key={format}
                    variant='outline'
                    className={
                      uploadedFormatCounts[format] === count
                        ? 'bg-green-500/20 text-green-700 border-green-500/50'
                        : ''
                    }
                  >
                    {count > 1 ? `${format} (${count})` : format}
                    {uploadedFormatCounts[format] !== undefined
                      ? ` - ${uploadedFormatCounts[format]}/${count}`
                      : ''}
                  </Badge>
                ))}
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
                  <div className='space-y-2 mt-2'>
                    {uploadedFiles.map((file, index) => {
                      const parts = file.name.split('.')
                      const extension =
                        parts.length > 1
                          ? parts[parts.length - 1].toLowerCase()
                          : ''
                      const isRequiredFormat =
                        requiredFormats.includes(extension)

                      const formatCount = uploadedExtensions.filter(
                        (ext) => ext === extension
                      ).length
                      const requiredCount = requiredFormatCounts[extension] || 0
                      const isExcessive = formatCount > requiredCount

                      return (
                        <div
                          key={index}
                          className={`flex justify-between items-center p-2 rounded-md border ${
                            isRequiredFormat && !isExcessive
                              ? 'border-green-500/50 bg-green-50/50'
                              : 'border-yellow-500/50 bg-yellow-50/50'
                          }`}
                        >
                          <div className='flex items-center'>
                            <Badge
                              variant={
                                isRequiredFormat && !isExcessive
                                  ? 'default'
                                  : 'outline'
                              }
                              className='mr-2'
                            >
                              {extension}
                            </Badge>
                            <span className='text-sm truncate max-w-[180px]'>
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
                ) : (
                  <div className='text-muted-foreground text-center mt-2'>
                    No files selected
                  </div>
                )}

                {uploadedFiles.length > 0 && missingFormats.length > 0 && (
                  <div className='mt-3 text-yellow-600 text-sm'>
                    Missing formats: {missingFormats.join(', ')}
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
                    ? undefined
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
