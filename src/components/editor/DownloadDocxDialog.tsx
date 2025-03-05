import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

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
import { OrderDetails } from '@/app/editor/[fileId]/page'
import { FILE_CACHE_URL } from '@/constants'

type DownloadDocxDialogProps = {
  orderDetails: OrderDetails
  downloadableType: string
  setDownloadableType: React.Dispatch<React.SetStateAction<string>>
}

const DownloadDocxDialog = ({
  orderDetails,
  downloadableType,
  setDownloadableType,
}: DownloadDocxDialogProps) => {
  const [docxUrl, setDocxUrl] = useState('')
  const [authToken, setAuthToken] = useState<string | undefined>('')
  const markingDocxUrl = useMemo(() => `${FILE_CACHE_URL}/get-cf-docx/${orderDetails.fileId}?orgName=${orderDetails.orgName}&templateName=${orderDetails.templateName}&type=marking&authToken=${authToken}`, [orderDetails.fileId, orderDetails.orgName, orderDetails.templateName, authToken])
  const withoutMarkingUrl = useMemo(() => `${FILE_CACHE_URL}/get-qc-txt/${orderDetails.fileId}?orgName=${orderDetails.orgName}&authToken=${authToken}`, [orderDetails.fileId, orderDetails.orgName, authToken])

  const getDocxUrl = async () => {
    const response = await downloadBlankDocxAction(
      orderDetails.fileId,
      downloadableType
    )

    if (response.success && response.url) {
      setDocxUrl(response.url)
    }
  }

  useEffect(() => {
    if (
      orderDetails.status === 'FINALIZER_ASSIGNED' ||
      orderDetails.status === 'PRE_DELIVERED'
    ) {
      getDocxUrl()
    }
  }, [])

  const handleDownloadMarkingDocx = async (markingType: string) => {
    const toastId = toast.loading('Downloading Docx file')
    try {
      const url = markingType === 'marking' ? markingDocxUrl : withoutMarkingUrl
      const response = await fetch(url)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }
      const fileId = orderDetails.fileId;
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = markingType === 'marking' ? `${fileId}.docx` : `${fileId}.txt` // Set the desired file name
      document.body.appendChild(a)
      a.click()
      a.remove()
      toast.dismiss(toastId)
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast.dismiss(toastId)
      if (error instanceof Error) {
        toast.error(`Error: ${error.message}`)
      } else {
        toast.error(`Something went wrong`)
        throw error
      }
    }
  }

  const getAuthToken = async () => {
    const tokenRes = await fileCacheTokenAction()
    setAuthToken(tokenRes.token)
  }

  return (
    <Dialog onOpenChange={(open) => {
      if (open) {
        getAuthToken()
      }
    }}>
      <DialogTrigger>
        <Button
          className='flex items-center border-primary border-2 justify-center px-2 py-1 text-sm font-medium text-primary rounded-[32px] cursor-pointer transition-all duration-200 hover:opacity-90'
          onClick={() => getDocxUrl()}
          variant='outline'
        >
          Download File
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose transcript type to download</DialogTitle>
          <div className='pt-5'>
            <RadioGroup
              value={downloadableType}
              onValueChange={setDownloadableType}
              className={`flex ${docxUrl ? 'gap-2' : 'gap-10'}`}
            >
              <div className='flex items-center space-x-2'>
                <RadioGroupItem
                  value='marking'
                  id='marking'
                />
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
        </DialogHeader>
        <DialogClose asChild>
          <>
            {downloadableType === 'no-marking' && (
              <Button onClick={() => handleDownloadMarkingDocx(downloadableType)}>
                  Download File
              </Button>
            )}
            {downloadableType === 'marking' && (
              <Button onClick={() => handleDownloadMarkingDocx(downloadableType)}>
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
      </DialogContent>
    </Dialog>
  )
}

export default DownloadDocxDialog
