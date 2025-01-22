import { StarFilledIcon, StarIcon } from '@radix-ui/react-icons'
import { useGoogleLogin } from '@react-oauth/google'
import { Session } from 'next-auth'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { SpecialInstructions } from './special-instructions'
import { Tip } from '../../all-files/AllFiles'
import { orderController } from '../controllers'
import { getOrderRating } from '@/app/actions/order/rating'
// import { BoxUploadButton } from '@/components/box-upload-button'
// import { DropboxUploadButton } from '@/components/dropbox-upload-button'
// import OneDriveUploadButton from '@/components/one-drive-upload-button'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog'
import { FILE_CACHE_URL } from '@/constants'
import { uploadToGoogleDrive } from '@/utils/google-drive'

interface CheckAndDownloadProps {
  id: string
  orderId: string
  orderType: string
  filename: string
  toggleCheckAndDownload: boolean
  setToggleCheckAndDownload: (value: boolean) => void
  session: Session
  txtSignedUrl: string
  cfDocxSignedUrl: string
}

export function CheckAndDownload({
  id,
  orderId,
  orderType,
  filename,
  toggleCheckAndDownload,
  setToggleCheckAndDownload,
  session,
  txtSignedUrl,
  cfDocxSignedUrl,
}: CheckAndDownloadProps) {
  const storedrating = Number(localStorage.getItem('rating'))
  const [hover, setHover] = useState<null | number>(null)
  const [showSubtitle, setShowSubtitle] = useState<boolean>(false)
  const [rating, setRating] = useState<null | number>(storedrating || null)
  const [isUploading, setIsUploading] = useState(false)
  const ratingMessages = ['Poor', 'Bad', 'Okay', 'Good', 'Excellent']
  const controller = async (
    payload: {
      fileId: string
      filename?: string
      docType?: string
      rating?: number
    },
    type: string
  ) => {
    const toastId = toast.loading(`Processing your request...`)
    try {
      const response = await orderController(payload, type)
      setTimeout(() => {
        toast.dismiss(toastId)
      }, 100)
      const successToastId = toast.success(`${response}`)
      toast.dismiss(successToastId)
    } catch (err) {
      const errorToastId = toast.error(`Error` + err)
      toast.dismiss(errorToastId)
      toast.dismiss(toastId)
    }
  }

  const [currentFileUrl, setCurrentFileUrl] = useState<string>('')
  const [currentFileName, setCurrentFileName] = useState<string>('')

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const accessToken = tokenResponse.access_token
      localStorage.setItem('gdrive_token', accessToken)
      // If we were in the middle of an upload, retry it
      if (isUploading) {
        handleGDriveUpload(currentFileUrl, currentFileName)
      }
    },
    onError: (errorResponse) => {
      console.error('Google login error:', errorResponse)
      toast.error('Failed to login to Google Drive')
    },
    scope: 'https://www.googleapis.com/auth/drive.file',
  })

  const handleGDriveUpload = async (fileUrl: string, fileName: string) => {
    setCurrentFileUrl(fileUrl)
    setCurrentFileName(fileName)
    const token = localStorage.getItem('gdrive_token')
    if (!token) {
      login()
      return
    }

    setIsUploading(true)
    const toastId = toast.loading('Uploading to Google Drive...')

    try {
      await uploadToGoogleDrive(fileUrl, fileName, token)
      toast.success('File uploaded to Google Drive successfully')
    } catch (error: unknown) {
      console.error('Upload error:', error)
      if (error instanceof Error && error.message.includes('login')) {
        login() // Trigger new login if token expired
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload to Google Drive'
        toast.error(errorMessage)
      }
    } finally {
      setIsUploading(false)
      toast.dismiss(toastId)
    }
  }

  const handleRating = async (rating: number) => {
    localStorage.setItem('rating', JSON.stringify(rating))
    setRating(rating)
    await controller(
      {
        fileId: id,
        filename,
        docType:
          orderType == 'TRANSCRIPTION_FORMATTING'
            ? 'TRANCRIPTIONCF_DOCX'
            : 'TRANSCRIPTION_DOCX',
        rating,
      },
      'rateFile'
    )
  }

  const docx = {
    name: `${filename}`,
  }
  const pdf = {
    name: `${filename}`,
  }

  const subTitile = {
    name: `${filename}`,
    getSubtitleFile: async () => {
      setShowSubtitle(!showSubtitle)
    },
  }

  const txtFile = {
    name: `${filename}`,
  }
  // Rating
  useEffect(() => {
    async function fetchRating() {
      const response = await getOrderRating(id)
      if (response.success && response.rating) {
        localStorage.setItem('rating', response.rating.toString())
        setRating(response.rating)
      }
    }
    fetchRating()
  }, [rating, storedrating, id])
  return (
    <Dialog
      open={toggleCheckAndDownload}
      onOpenChange={setToggleCheckAndDownload}
    >
      <DialogContent className='sm:max-w-[70%]'>
        <DialogHeader className='space-y-4'>
          <br />
          <div className='flex items-center'>
            <div className='flex-1 space-y-1'>
              <p className='text-md font-semibold'>Check File</p>
              {orderType == 'TRANSCRIPTION' && (
                <p className='text-sm text-muted-foreground'>
                  The transcript contains no blanks/inaudibles.{' '}
                  <a href={`/editor/${orderId}`}>Check Online</a>
                </p>
              )}
            </div>
            {orderType == 'TRANSCRIPTION' && (
              <div className='space-x-4'>
                {/* <Button
                  onClick={() =>
                    window.open(
                      `/editor/${orderId}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                >
                  Open Editor
                </Button> */}
                <Button
                  onClick={() =>
                    window.open(
                      `/editor/${id}`,
                      '_blank',
                      'toolbar=no,location=no,menubar=no,width=' +
                      window.screen.width +
                      ',height=' +
                      window.screen.height +
                      ',left=0,top=0'
                    )
                  }
                >
                  Open Editor
                </Button>
                <Button onClick={subTitile?.getSubtitleFile}>
                  {!showSubtitle ? 'Show Subtitles' : 'Hide Subtitles'}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className='items-center space-y-4 w-full'>
          <p className='text-md font-semibold'>Download Links</p>
          {orderType == 'TRANSCRIPTION_FORMATTING' && (
            <div className='space-y-2'>
              <p className='text-sm font-semibold text-slate-700'>
                Custom Formatting
              </p>
              {/* docx  */}
              <div className='max-w-full flex justify-between'>
                <a
                  target='_blank'
                  href={cfDocxSignedUrl}
                  className='text-primary'
                >{`${docx?.name}_cf.docx`}</a>
                <div className='flex space-x-2'>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGDriveUpload(cfDocxSignedUrl, `${docx?.name}_cf.docx`)}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Save to Google Drive'}
                  </Button>
                  {/* <OneDriveUploadButton
                    fileUrl={cfDocxSignedUrl}
                    fileName={`${docx?.name}_cf.docx`}
                  />
                  <BoxUploadButton
                    fileUrl={cfDocxSignedUrl}
                    fileName={`${docx?.name}_cf.docx`}
                  />
                  <DropboxUploadButton
                    fileUrl={cfDocxSignedUrl}
                    fileName={`${docx?.name}_cf.docx`}
                  /> */}
                </div>
              </div>
              {/* pdf  */}
              <div className='max-w-full flex justify-between'>
                <a
                  href={`${FILE_CACHE_URL}/get-cf-pdf/${id}?authToken=${session?.user?.token}`}
                  target='_blank'
                  className='text-primary'
                >{`${pdf?.name}_cf.pdf`}</a>
                <div className='flex space-x-2'>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGDriveUpload(`${FILE_CACHE_URL}/get-cf-pdf/${id}?authToken=${session?.user?.token}`, `${pdf?.name}_cf.pdf`)}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Save to Google Drive'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {orderType == 'TRANSCRIPTION' && (
            <div className='space-y-2'>
              <p className='text-sm font-semibold text-slate-700'>
                Transcription
              </p>
              {/* docx  */}
              <div className='max-w-full flex justify-between'>
                <a
                  href={`${FILE_CACHE_URL}/get-tr-docx/${id}?authToken=${session?.user?.token}`}
                  target='_blank'
                  className='text-primary'
                >{`${docx?.name}.docx`}</a>
                <div className='flex space-x-2'>
                  {/* <div className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem] '>
                  Save to Dropbox
                </div>
                <div className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem]'>
                  Save to Google Drive
                </div> */}
                </div>
              </div>
              {/* pdf  */}
              <div className='max-w-full flex justify-between'>
                <a
                  href={`${FILE_CACHE_URL}/get-tr-pdf/${id}?authToken=${session?.user?.token}`}
                  target='_blank'
                  className='text-primary'
                >{`${pdf?.name}.pdf`}</a>
                <div className='flex space-x-2'>
                  {/* <div className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem]'>
                  Save to Dropbox
                </div>
                <div className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem]'>
                  Save to Google Drive
                </div> */}
                </div>
              </div>
              {/* txt  */}
              <div className='max-w-full flex justify-between'>
                <a
                  target='_blank'
                  href={txtSignedUrl}
                  className='text-primary'
                >{`${txtFile?.name}.txt`}</a>
                <div className='flex space-x-2'>
                  {/* <div className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem] '>
                  Save to Dropbox
                </div>
                <div className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem]'>
                  Save to Google Drive
                </div> */}
                </div>
              </div>
            </div>
          )}

          {showSubtitle && orderType == 'TRANSCRIPTION' && (
            <div className='space-y-2'>
              <p className='text-sm font-semibold text-slate-700'>Subtitles</p>
              {/* srt  */}
              <div className='max-w-full flex justify-between'>
                <a
                  href={`${FILE_CACHE_URL}/get-subtitles/${id}?authToken=${session?.user?.token}&ext=srt`}
                  target='_blank'
                  className='text-primary'
                >{`${filename}.srt`}</a>
                <div className='flex space-x-2'>
                  {/* <div className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem]'>
                    Save to Dropbox
                  </div>
                  <div className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem]'>
                    Save to Google Drive
                  </div> */}
                </div>
              </div>
              {/* vtt  */}

              <div className='max-w-full flex justify-between'>
                <a
                  href={`${FILE_CACHE_URL}/get-subtitles/${id}?authToken=${session?.user?.token}&ext=vtt`}
                  target='_blank'
                  className='text-primary'
                >{`${filename}.vtt`}</a>
                <div className='flex space-x-2'>
                  {/* <div className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem]'>
                    Save to Dropbox
                  </div>
                  <div className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem]'>
                    Save to Google Drive
                  </div> */}
                </div>
              </div>
            </div>
          )}
        </div>

        <hr />

        <div className='flex justify-between items-center'>
          <div>
            <p className='text-md font-semibold'>Ratings</p>
            <p className='text-sm text-muted-foreground'>
              Please click the stars to rate this transcript. Your feedback is
              important for us.
            </p>
          </div>
          <div className='flex gap-2'>
            {ratingMessages.map((message, index) => {
              const currentRating = index + 1
              return (
                <label key={currentRating}>
                  <input
                    className='hidden'
                    type='radio'
                    name='rating'
                    value={currentRating}
                    onClick={() => handleRating(currentRating)}
                  />
                  {currentRating > (hover || rating || 0) ? (
                    <Tip
                      message={message}
                      icon={
                        <StarIcon
                          className='cursor-pointer text-2xl text-primary'
                          onMouseEnter={() => setHover(currentRating)}
                          width={30}
                          height={30}
                        />
                      }
                    />
                  ) : (
                    <Tip
                      message={message}
                      icon={
                        <StarFilledIcon
                          className='cursor-pointer text-2xl text-primary'
                          onMouseLeave={() => {
                            setHover(null)
                          }}
                          width={30}
                          height={30}
                        />
                      }
                    />
                  )}
                </label>
              )
            })}
          </div>
        </div>

        <hr />

        <DialogFooter className='sm:justify-start'>
          <SpecialInstructions
            setToggleCheckAndDownload={setToggleCheckAndDownload}
            fileId={id}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
