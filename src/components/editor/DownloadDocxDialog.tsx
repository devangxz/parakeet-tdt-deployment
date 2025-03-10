import { ReloadIcon } from '@radix-ui/react-icons'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { fileCacheTokenAction } from '@/app/actions/auth/file-cache-token'
import { downloadBlankDocxAction } from '@/app/actions/editor/download-docx'
import { getCustomFormatFilesSignedUrl } from '@/app/actions/order/custom-format-files-signed-url'
import { OrderDetails } from '@/app/editor/[fileId]/page'
import { FILE_CACHE_URL } from '@/constants'

type DownloadDocxDialogProps = {
  orderDetails: OrderDetails
  downloadableType: string
  setDownloadableType: React.Dispatch<React.SetStateAction<string>>
  verifyTranscriptForDownload: () => {
    hasMarkedSections: boolean
    hasTimestamps: boolean
  }
}

const DownloadDocxDialog = ({
  orderDetails,
  downloadableType,
  setDownloadableType,
  verifyTranscriptForDownload,
}: DownloadDocxDialogProps) => {
  const [docxUrl, setDocxUrl] = useState('')
  const [confirmationDialogMessage, setConfirmationDialogMessage] = useState('')
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] =
    useState(false)
  const [authToken, setAuthToken] = useState<string | undefined>('')
  const [isLoading, setIsLoading] = useState(false)
  const [formattingFiles, setFormattingFiles] = useState<
    {
      signedUrl: string
      filename: string
      extension: string
    }[]
  >([])

  const markingDocxUrl = useMemo(
    () =>
      `${FILE_CACHE_URL}/get-cf-docx/${orderDetails.fileId}?orgName=${orderDetails.orgName}&templateName=${orderDetails.templateName}&type=marking&authToken=${authToken}`,
    [
      orderDetails.fileId,
      orderDetails.orgName,
      orderDetails.templateName,
      authToken,
    ]
  )
  const withoutMarkingUrl = useMemo(
    () =>
      `${FILE_CACHE_URL}/get-qc-txt/${orderDetails.fileId}?orgName=${orderDetails.orgName}&authToken=${authToken}`,
    [orderDetails.fileId, orderDetails.orgName, authToken]
  )

  const getDocxUrl = async () => {
    const response = await downloadBlankDocxAction(
      orderDetails.fileId,
      downloadableType
    )

    if (response.success && response.url) {
      setDocxUrl(response.url)
    }
  }

  const getFormattingFiles = async () => {
    if (orderDetails.orderType === 'FORMATTING') {
      setIsLoading(true)
      try {
        const result = await getCustomFormatFilesSignedUrl(
          orderDetails.fileId,
          orderDetails.status === 'FINALIZER_ASSIGNED',
          orderDetails.status === 'PRE_DELIVERED'
        )
        if (result.success && result.signedUrls) {
          setFormattingFiles(result.signedUrls)
        } else {
          toast.error('Could not retrieve formatting files')
        }
      } catch (error) {
        toast.error('Error loading formatting files')
      } finally {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    if (
      orderDetails.status === 'FINALIZER_ASSIGNED' ||
      orderDetails.status === 'PRE_DELIVERED'
    ) {
      getDocxUrl()
      setDownloadableType('cf-rev-submit')
    }
  }, [])

  const handleDownloadMarkingDocx = (downloadableType: string) => {
    if (downloadableType === 'marking') {
      const { hasMarkedSections, hasTimestamps } = verifyTranscriptForDownload()

      if (!hasMarkedSections || hasTimestamps) {
        setConfirmationDialogMessage(
          `The transcript is missing marked sections or contains timestamps. Do you still want to continue?`
        )
        setIsConfirmationDialogOpen(true)
        return
      }
    }
    // If no confirmation needed or not marking type, download directly
    downloadFile(downloadableType)
  }

  const downloadFile = async (markingType: string) => {
    const toastId = toast.loading('Downloading file')
    try {
      const url = markingType === 'marking' ? markingDocxUrl : withoutMarkingUrl
      const response = await fetch(url)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }
      const fileId = orderDetails.fileId
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download =
        markingType === 'marking' ? `${fileId}.docx` : `${fileId}.txt`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(downloadUrl)
      // Close the dialog after successful download
      toast.dismiss(toastId)
      toast.success('File downloaded successfully')
    } catch (error) {
      toast.dismiss(toastId)
      if (error instanceof Error) {
        toast.error(`Error: ${error.message}`)
      } else {
        toast.error('Something went wrong')
        throw error
      }
    }
  }

  const getAuthToken = async () => {
    const tokenRes = await fileCacheTokenAction()
    setAuthToken(tokenRes.token)
  }

  const filesByExtension = formattingFiles.reduce((acc, file) => {
    if (!acc[file.extension]) {
      acc[file.extension] = []
    }
    acc[file.extension].push(file)
    return acc
  }, {} as Record<string, typeof formattingFiles>)

  return (
    <>
      <Dialog
        onOpenChange={(open) => {
          if (open) {
            getAuthToken()
            getFormattingFiles()
          }
        }}
      >
        <DialogTrigger>
          <Button
            className='flex items-center border-primary border-2 justify-center px-2 py-1 text-sm font-medium text-primary rounded-[32px] cursor-pointer transition-all duration-200 hover:opacity-90'
            onClick={() => getDocxUrl()}
            variant='outline'
          >
            Download File
          </Button>
        </DialogTrigger>
        <DialogContent className='p-0 gap-0'>
          <DialogHeader className='p-4'>
            <DialogTitle>
              {orderDetails.orderType === 'FORMATTING'
                ? 'Download Formatted Files'
                : 'Choose transcript type to download'}
            </DialogTitle>
          </DialogHeader>

          {orderDetails.orderType === 'FORMATTING' ? (
            <div className='m-4 mt-1 rounded-md border border-customBorder p-4'>
              {isLoading ? (
                <div className='flex justify-center items-center py-8'>
                  <ReloadIcon className='h-4 w-4 animate-spin' />
                  <span className='ml-2 text-sm text-muted-foreground'>
                    Loading formatted files...
                  </span>
                </div>
              ) : formattingFiles.length === 0 ? (
                <div className='text-center py-4 text-muted-foreground'>
                  No files available for download
                </div>
              ) : (
                <div className='space-y-4'>
                  <h3 className='text-sm font-medium tracking-tight'>
                    Available Files:
                  </h3>

                  {Object.entries(filesByExtension).map(
                    ([extension, files]) => (
                      <div
                        key={extension}
                        className='border rounded-md p-3 shadow-sm mb-4'
                      >
                        <div className='flex items-center mb-2'>
                          <Badge
                            variant='outline'
                            className='mr-2 uppercase text-xs font-semibold px-2 py-0.5 bg-secondary'
                          >
                            {extension}
                          </Badge>
                          <span className='text-sm font-medium text-muted-foreground'>
                            {files.length} file{files.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className='space-y-2'>
                          {files.map((file, index) => (
                            <div
                              key={index}
                              className={`flex justify-between items-center ${
                                index !== files.length - 1
                                  ? 'border-b pb-2'
                                  : ''
                              }`}
                            >
                              <span className='text-sm truncate max-w-[250px] font-medium'>
                                {files.length > 1
                                  ? `${file.filename}(${index + 1}).${
                                      file.extension
                                    }`
                                  : `${file.filename}.${file.extension}`}
                              </span>
                              <Button
                                size='sm'
                                asChild
                                className='bg-primary hover:bg-primary/90'
                              >
                                <a
                                  href={file.signedUrl}
                                  target='_blank'
                                  rel='noreferrer'
                                  className='flex items-center'
                                >
                                  Download
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className='m-4 mt-1 flex flex-col gap-4'>
              <div className='rounded-md border border-customBorder p-4'>
                <RadioGroup
                  value={downloadableType}
                  onValueChange={setDownloadableType}
                  className={`flex ${docxUrl ? 'gap-5' : 'gap-10'}`}
                >
                  <div className='flex items-center space-x-2'>
                    <RadioGroupItem value='marking' id='marking' />
                    <Label htmlFor='marking'>With Markings</Label>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <RadioGroupItem value='no-marking' id='no-marking' />
                    <Label htmlFor='no-marking'>Without Markings</Label>
                  </div>

                  {(orderDetails.status === 'FINALIZER_ASSIGNED' ||
                    orderDetails.status === 'PRE_DELIVERED') && (
                    <div className='flex items-center space-x-2'>
                      <RadioGroupItem
                        disabled={!docxUrl}
                        value='cf-rev-submit'
                        id='cf-rev-submit'
                      />
                      <Label htmlFor='cf-rev-submit'>CF File</Label>
                    </div>
                  )}
                </RadioGroup>
              </div>
              <DialogClose asChild>
                <>
                  {downloadableType === 'no-marking' && (
                    <Button
                      onClick={() =>
                        handleDownloadMarkingDocx(downloadableType)
                      }
                    >
                      Download File
                    </Button>
                  )}
                  {downloadableType === 'marking' && (
                    <Button
                      onClick={() =>
                        handleDownloadMarkingDocx(downloadableType)
                      }
                    >
                      Download File
                    </Button>
                  )}

                  {downloadableType === 'cf-rev-submit' && (
                    <Button asChild>
                      <a href={docxUrl} target='_blank'>
                        Download File
                      </a>
                    </Button>
                  )}
                </>
              </DialogClose>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {isConfirmationDialogOpen && (
        <Dialog
          open={isConfirmationDialogOpen}
          onOpenChange={setIsConfirmationDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmation</DialogTitle>
            </DialogHeader>
            <p className='text-sm text-gray-500'>
              {confirmationDialogMessage}
            </p>
            <div className='flex justify-end space-x-2'>
              <Button
                variant='outline'
                onClick={() => setIsConfirmationDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setIsConfirmationDialogOpen(false)
                  downloadFile('marking')
                }}
              >
                Continue
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

export default DownloadDocxDialog
