import { ReloadIcon, StarFilledIcon, StarIcon } from '@radix-ui/react-icons'
import axios from 'axios'
import Link from 'next/link'
import { Session } from 'next-auth'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { SpecialInstructions } from './special-instructions'
import { Tip } from '../../all-files/AllFiles'
import { orderController } from '../controllers'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog'
interface FileItem {
  id: string
  filename: string
  date: string
  duration: number
  orderType: string
}
interface CheckAndDownloadProps {
  selected: string
  files: FileItem[]
  toggleCheckAndDownload: boolean
  setToggleCheckAndDownload: (value: boolean) => void
  session: Session
  orderId: string
}

export function CheckAndDownload({
  selected,
  files,
  toggleCheckAndDownload,
  setToggleCheckAndDownload,
  orderId,
}: CheckAndDownloadProps) {
  const { filename, id, orderType } =
    files &&
    (files?.find((file: FileItem) => file?.id === selected) as FileItem)
  const storedrating = Number(localStorage.getItem('rating'))
  const [hover, setHover] = useState<null | number>(null)
  const [docxLoading, setDocxLoading] = useState<boolean>(false)
  const [pdfLoading, setPdfLoading] = useState<boolean>(false)
  const [cfDocxLoading, setCfDocxLoading] = useState<boolean>(false)
  const [cfPdfLoading, setCfPdfLoading] = useState<boolean>(false)
  const [srtLoading, setSRTLoading] = useState<boolean>(false)
  const [vttLoading, setVTTLoading] = useState<boolean>(false)
  const [txtLoading, setTxtLoading] = useState<boolean>(false)
  const [showSubtitle, setShowSubtitle] = useState<boolean>(false)
  const [rating, setRating] = useState<null | number>(storedrating || null)
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
      toast.dismiss(toastId)
      const successToastId = toast.success(`${response}`)
      toast.dismiss(successToastId)
    } catch (err) {
      const errorToastId = toast.error(`Error` + err)
      toast.dismiss(errorToastId)
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
    signedUrl: async (docType: string) => {
      docType == 'CUSTOM_FORMATTING_DOC'
        ? setCfDocxLoading(true)
        : setDocxLoading(true)
      await controller(
        { fileId: id, filename, docType: docType },
        'downloadFile'
      )
      docType == 'CUSTOM_FORMATTING_DOC'
        ? setCfDocxLoading(false)
        : setDocxLoading(false)
    },
  }
  const pdf = {
    name: `${filename}`,
    signedUrl: async (docType: string) => {
      docType == 'CUSTOM_FORMATTING_DOC'
        ? setCfPdfLoading(true)
        : setPdfLoading(true)
      await controller(
        { fileId: id, filename, docType: docType },
        'downloadPDFFile'
      )
      docType == 'CUSTOM_FORMATTING_DOC'
        ? setCfPdfLoading(false)
        : setPdfLoading(false)
    },
  }

  const subTitile = {
    name: `${filename}`,
    getSubtitleFile: async () => {
      setShowSubtitle(!showSubtitle)
    },
    downloadSubtitle: async (docType: string) => {
      try {
        docType == 'VTT' ? setVTTLoading(true) : setSRTLoading(true)
        await controller(
          { fileId: id, filename: filename, docType: docType },
          'downloadSubtitle'
        )
      } catch (err) {
        console.error(err)
      } finally {
        docType == 'VTT' ? setVTTLoading(false) : setSRTLoading(false)
      }
    },
  }

  const txtFile = {
    name: `${filename}`,
    downloadTxt: async (docType: string) => {
      try {
        setTxtLoading(true)
        await controller(
          { fileId: id, filename: filename, docType: docType },
          'downloadTxt'
        )
      } catch (err) {
        console.error(err)
      } finally {
        setTxtLoading(false)
      }
    },
  }
  // Rating
  useEffect(() => {
    axios
      .get(`/api/order/rating?fileId=${selected}`)
      .then((response) => {
        localStorage.setItem('rating', response.data.rating)
        setRating(response.data.rating)
      })
      .catch((err) => console.log(err))
  }, [rating, storedrating, selected])
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
                <Button asChild>
                  <Link href={`/editor/${id}`}>Open Editor</Link>
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
                <div className='text-primary'>{`${docx?.name}_cf.docx`}</div>
                <div className='flex space-x-2'>
                  {cfDocxLoading ? (
                    <div className='border-2 rounded-md p-[3px] cursor-pointer flex items-center text-[0.875rem] md:px-[.5rem]'>
                      <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                      Saving to Device
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        docx?.signedUrl('CUSTOM_FORMATTING_DOC')
                      }}
                      className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem]'
                    >
                      Save to Device
                    </div>
                  )}
                  {/* <div className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem]'>
                    Save to Dropbox
                  </div>
                  <div className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem]'>
                    Save to Google Drive
                  </div> */}
                </div>
              </div>
              {/* pdf  */}
              <div className='max-w-full flex justify-between'>
                <div className='text-primary'>{`${pdf?.name}_cf.pdf`}</div>
                <div className='flex space-x-2'>
                  {cfPdfLoading ? (
                    <div className='border-2 rounded-md p-[3px] cursor-pointer flex items-center text-[0.875rem] md:px-[.5rem]'>
                      <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                      Saving to Device
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        pdf?.signedUrl('CUSTOM_FORMATTING_DOC')
                      }}
                      className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem]'
                    >
                      Save to Device
                    </div>
                  )}
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

          {orderType == 'TRANSCRIPTION' && (
            <div className='space-y-2'>
              <p className='text-sm font-semibold text-slate-700'>
                Transcription
              </p>
              {/* docx  */}
              <div className='max-w-full flex justify-between'>
                <div className='text-primary'>{`${docx?.name}.docx`}</div>
                <div className='flex space-x-2'>
                  {docxLoading ? (
                    <div className='border-2 rounded-md p-[3px] cursor-pointer flex items-center text-[0.875rem] md:px-[.5rem]'>
                      <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                      Saving to Device
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        docx?.signedUrl('TRANSCRIPTION_DOC')
                      }}
                      className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem]'
                    >
                      Save to Device
                    </div>
                  )}
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
                <div className='text-primary'>{`${pdf?.name}.pdf`}</div>
                <div className='flex space-x-2'>
                  {pdfLoading ? (
                    <div className='border-2 rounded-md p-[3px] cursor-pointer flex items-center text-[0.875rem] md:px-[.5rem]'>
                      <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                      Saving to Device
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        pdf?.signedUrl('TRANSCRIPTION_DOC')
                      }}
                      className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem]'
                    >
                      Save to Device
                    </div>
                  )}
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
                <div className='text-primary'>{`${txtFile?.name}.txt`}</div>
                <div className='flex space-x-2'>
                  {txtLoading ? (
                    <div className='border-2 rounded-md p-[3px] cursor-pointer flex items-center text-[0.875rem] md:px-[.5rem]'>
                      <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                      Saving to Device
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        txtFile?.downloadTxt('TXT')
                      }}
                      className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem]'
                    >
                      Save to Device
                    </div>
                  )}
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
                <div className='text-primary'>{`${filename}.srt`}</div>
                <div className='flex space-x-2'>
                  {srtLoading ? (
                    <div className='border-2 rounded-md p-[3px] cursor-pointer flex items-center text-[0.875rem] md:px-[.5rem]'>
                      <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                      Saving to Device
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        subTitile?.downloadSubtitle('SRT')
                      }}
                      className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem]'
                    >
                      Save to Device
                    </div>
                  )}
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
                <div className='text-primary'>{`${filename}.vtt`}</div>
                <div className='flex space-x-2'>
                  {vttLoading ? (
                    <div className='border-2 rounded-md p-[3px] cursor-pointer flex items-center text-[0.875rem] md:px-[.5rem]'>
                      <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                      Saving to Device
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        subTitile?.downloadSubtitle('VTT')
                      }}
                      className='border-2 rounded-md p-[3px] cursor-pointer text-[0.875rem] md:px-[.5rem]'
                    >
                      Save to Device
                    </div>
                  )}
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
            fileId={selected}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
