import { zodResolver } from '@hookform/resolvers/zod'
import { StarFilledIcon, StarIcon } from '@radix-ui/react-icons'
import { useGoogleLogin } from '@react-oauth/google'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Tip } from '../../all-files/AllFiles'
import { orderController } from '../controllers'
import { fileCacheTokenAction } from '@/app/actions/auth/file-cache-token'
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import {
  getOrderComments,
  updateOrderComments,
} from '@/app/actions/order/comments'
import { getOrderRating } from '@/app/actions/order/rating'
import { BoxUploadButton } from '@/components/box-upload-button'
import { DropboxUploadButton } from '@/components/dropbox-upload-button'
import OneDriveUploadButton from '@/components/one-drive-upload-button'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { FILE_CACHE_URL } from '@/constants'
import { uploadToGoogleDrive } from '@/utils/google-drive'

interface CheckAndDownloadProps {
  id: string
  orderType: string
  filename: string
  toggleCheckAndDownload: boolean
  setToggleCheckAndDownload: (value: boolean) => void
  txtSignedUrl: string
  cfDocxSignedUrl: string
  customFormatFilesSignedUrls: {
    signedUrl: string
    filename: string
    extension: string
  }[]
  isFromEditor?: boolean
}

interface DownloadFileProps {
  name: string
  url: string
  fileType: string
  isUploading: boolean
  handleGDriveUpload: (url: string, name: string) => void
}

const DownloadFile = ({
  name,
  url,
  fileType,
  isUploading,
  handleGDriveUpload,
}: DownloadFileProps) => (
  <div className='p-4 rounded-lg bg-secondary'>
    <div className='flex items-center gap-3 mb-5'>
      <FileText className='w-6 h-6 text-foreground' />
      <a target='_blank' href={url} className='text-primary hover:underline'>
        {name}
        {fileType}
      </a>
    </div>

    <div className='grid grid-cols-6 gap-2'>
      <Button variant='outline' size='sm' asChild className='w-full'>
        <a href={url} target='_blank'>
          Save to device
        </a>
      </Button>
      <Button
        variant='outline'
        size='sm'
        onClick={() => handleGDriveUpload(url, `${name}${fileType}`)}
        disabled={isUploading}
        className='w-full'
      >
        {isUploading ? 'Uploading...' : 'Save to Google Drive'}
      </Button>
      <OneDriveUploadButton fileUrl={url} fileName={`${name}${fileType}`} />
      <BoxUploadButton fileUrl={url} fileName={`${name}${fileType}`} />
      <DropboxUploadButton
        files={[
          {
            filename: `${name}${fileType}`,
            url: url,
          },
        ]}
      />
    </div>
  </div>
)

const FormSchema = z.object({
  comments: z.string(),
})

export function CheckAndDownload({
  id,
  orderType,
  filename,
  toggleCheckAndDownload,
  setToggleCheckAndDownload,
  txtSignedUrl,
  cfDocxSignedUrl,
  customFormatFilesSignedUrls,
  isFromEditor = false,
}: CheckAndDownloadProps) {
  const storedrating = Number(localStorage.getItem('rating'))
  const [hover, setHover] = useState<null | number>(null)
  const [rating, setRating] = useState<null | number>(storedrating || null)
  const [isUploading, setIsUploading] = useState(false)
  const [authToken, setAuthToken] = useState<string | undefined>('')
  const ratingMessages = ['Poor', 'Bad', 'Okay', 'Good', 'Excellent']
  const [showMoreFormats, setShowMoreFormats] = useState(false)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  })

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
  const [subtitleUrls, setSubtitleUrls] = useState({
    srtUrl: '',
    vttUrl: '',
  })

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
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to upload to Google Drive'
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
          orderType == 'TRANSCRIPTION_FORMATTING' || orderType == 'FORMATTING'
            ? 'TRANSCRIPTION_CF_DOCX'
            : 'TRANSCRIPTION_DOCX',
        rating,
      },
      'rateFile'
    )
  }

  const fetchSubtitleUrls = async () => {
    try {
      const srtResponse = await getSignedUrlAction(`${id}.srt`, 3600)
      const vttResponse = await getSignedUrlAction(`${id}.vtt`, 3600)

      setSubtitleUrls({
        srtUrl:
          srtResponse.success && srtResponse.signedUrl
            ? srtResponse.signedUrl
            : '',
        vttUrl:
          vttResponse.success && vttResponse.signedUrl
            ? vttResponse.signedUrl
            : '',
      })
    } catch (error) {
      toast.error('Failed to fetch subtitle files')
    }
  }

  useEffect(() => {
    if (orderType === 'TRANSCRIPTION') {
      fetchSubtitleUrls()
    }
  }, [orderType, id])

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

  const getAuthToken = async () => {
    const tokenRes = await fileCacheTokenAction()
    setAuthToken(tokenRes.token)
  }

  useEffect(() => {
    if (toggleCheckAndDownload) {
      getAuthToken()
    }
  }, [toggleCheckAndDownload])

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const toastId = toast.loading(`Submitting.`)
    const { comments } = data
    try {
      await updateOrderComments(id, comments)
      toast.dismiss(toastId)
      const successToastId = toast.success(`Submitted Successfully`)
      toast.dismiss(successToastId)
      setToggleCheckAndDownload(false)
    } catch (err) {
      const errorToastId = toast.error(`Error` + err)
      toast.dismiss(errorToastId)
      toast.dismiss(toastId)
      console.log(err)
    }
  }

  useEffect(() => {
    const loadComments = async () => {
      const comments = await getOrderComments(id)
      form.setValue('comments', comments?.comments ?? '')
    }
    loadComments()
  }, [id, form])

  return (
    <Dialog
      open={toggleCheckAndDownload}
      onOpenChange={setToggleCheckAndDownload}
    >
      <DialogContent className='p-0 gap-0 sm:max-w-5xl'>
        <DialogHeader className='p-4'>
          <DialogTitle>Download Transcript Files</DialogTitle>
          <DialogDescription>
            Download your transcript in multiple formats and save to your
            preferred storage.
          </DialogDescription>
        </DialogHeader>

        <div className='m-4 mt-1 rounded-md border'>
          <ScrollArea className='h-full max-h-[70vh]'>
            {orderType == 'TRANSCRIPTION' && !isFromEditor && (
              <div className='border-b p-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex-1 space-y-1'>
                    <h3 className='text-lg font-semibold'>Check File</h3>
                    <p className='text-sm text-muted-foreground'>
                      The transcript contains no blanks/inaudibles.
                    </p>
                  </div>
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
                </div>
              </div>
            )}

            <div className='border-b p-4'>
              <div className='flex items-start justify-between mb-4'>
                <h3 className='text-lg font-semibold'>Download Files</h3>
              </div>

              {orderType == 'TRANSCRIPTION_FORMATTING' && (
                <div className='space-y-6'>
                  <div>
                    <h4 className='text-base font-medium text-muted-foreground mb-4'>
                      Custom Formatting Files
                    </h4>

                    <div className='space-y-4'>
                      <DownloadFile
                        name={`${filename}_cf`}
                        url={cfDocxSignedUrl}
                        fileType='.docx'
                        isUploading={isUploading}
                        handleGDriveUpload={handleGDriveUpload}
                      />

                      <div
                        className='overflow-hidden transition-all duration-300 ease-in-out'
                        style={{
                          maxHeight: showMoreFormats ? '1000px' : '0',
                          opacity: showMoreFormats ? 1 : 0,
                          marginTop: showMoreFormats ? '16px' : '0',
                        }}
                      >
                        <DownloadFile
                          name={`${filename}_cf`}
                          url={`${FILE_CACHE_URL}/get-cf-pdf/${id}?authToken=${authToken}`}
                          fileType='.pdf'
                          isUploading={isUploading}
                          handleGDriveUpload={handleGDriveUpload}
                        />
                      </div>
                    </div>

                    <span
                      className="w-fit flex items-center mt-4 text-sm text-muted-foreground hover:text-primary cursor-pointer" 
                      onClick={() => setShowMoreFormats(!showMoreFormats)}
                    >
                      {showMoreFormats ? (
                        <>Hide additional formats <ChevronUp className="ml-1 h-4 w-4" /></>
                      ) : (
                        <>Show more formats <ChevronDown className="ml-1 h-4 w-4" /></>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {orderType == 'FORMATTING' && (
                <div className='space-y-6'>
                  <div>
                    <h4 className='text-base font-medium text-muted-foreground mb-4'>
                      Custom Formatting Files
                    </h4>

                    <div className='space-y-4'>
                      {customFormatFilesSignedUrls.map((file) => (
                        <DownloadFile
                          key={file.filename}
                          name={file.filename}
                          url={file.signedUrl}
                          fileType={`.${file.extension}`}
                          isUploading={isUploading}
                          handleGDriveUpload={handleGDriveUpload}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {orderType == 'TRANSCRIPTION' && (
                <div className='space-y-6'>
                  <div>
                    <h4 className='text-base font-medium text-muted-foreground mb-4'>
                      Transcription Files
                    </h4>

                    <div className='space-y-4'>
                      <DownloadFile
                        name={filename}
                        url={`${FILE_CACHE_URL}/get-tr-docx/${id}?authToken=${authToken}`}
                        fileType='.docx'
                        isUploading={isUploading}
                        handleGDriveUpload={handleGDriveUpload}
                      />

                      <div
                        className='overflow-hidden transition-all duration-300 ease-in-out'
                        style={{
                          maxHeight: showMoreFormats ? '1000px' : '0',
                          opacity: showMoreFormats ? 1 : 0,
                          marginTop: showMoreFormats ? '16px' : '0',
                        }}
                      >
                        <div className='space-y-4'>
                          <DownloadFile
                            name={filename}
                            url={`${FILE_CACHE_URL}/get-tr-pdf/${id}?authToken=${authToken}`}
                            fileType='.pdf'
                            isUploading={isUploading}
                            handleGDriveUpload={handleGDriveUpload}
                          />

                          <DownloadFile
                            name={filename}
                            url={txtSignedUrl}
                            fileType='.txt'
                            isUploading={isUploading}
                            handleGDriveUpload={handleGDriveUpload}
                          />

                          {subtitleUrls.srtUrl || subtitleUrls.vttUrl ? (
                            <div className='pt-2'>
                              <h4 className='text-base font-medium text-muted-foreground mb-4'>
                                Subtitle Files
                              </h4>

                              <div className='space-y-4'>
                                {subtitleUrls.srtUrl ? (
                                  <DownloadFile
                                    name={filename}
                                    url={subtitleUrls.srtUrl}
                                    fileType='.srt'
                                    isUploading={isUploading}
                                    handleGDriveUpload={handleGDriveUpload}
                                  />
                                ) : null}

                                {subtitleUrls.vttUrl ? (
                                  <DownloadFile
                                    name={filename}
                                    url={subtitleUrls.vttUrl}
                                    fileType='.vtt'
                                    isUploading={isUploading}
                                    handleGDriveUpload={handleGDriveUpload}
                                  />
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <span
                      className="w-fit flex items-center mt-4 text-sm text-muted-foreground hover:text-primary cursor-pointer" 
                      onClick={() => setShowMoreFormats(!showMoreFormats)}
                    >
                      {showMoreFormats ? (
                        <>Hide additional formats <ChevronUp className="ml-1 h-4 w-4" /></>
                      ) : (
                        <>Show more formats <ChevronDown className="ml-1 h-4 w-4" /></>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className='border-b p-4'>
              <div className='flex justify-between items-center'>
                <div>
                  <h3 className='text-lg font-semibold'>Ratings</h3>
                  <p className='text-sm text-muted-foreground'>
                    Please click the stars to rate this transcript. Your
                    feedback is important for us.
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
            </div>

            <div className='p-4'>
              <h3 className='text-lg font-semibold mb-4'>Comments</h3>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className='gap-y-4 flex flex-col'
                >
                  <FormField
                    control={form.control}
                    name='comments'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Feedback</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder='Enter Here'
                            className='resize-none'
                            {...field}
                            rows={5}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button className='self-end' type='submit'>
                    Submit
                  </Button>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </div>

        <div className='flex justify-end items-center gap-x-2 m-4 mt-1'>
          <Button
            onClick={() => setToggleCheckAndDownload(false)}
            variant='outline'
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
