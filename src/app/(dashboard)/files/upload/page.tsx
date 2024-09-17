'use client'
import { UploadIcon } from '@radix-ui/react-icons'
import { FileUp } from 'lucide-react'
import { useSession } from 'next-auth/react'
import React, { ChangeEvent, Suspense, useState, useCallback } from 'react'
import Dropzone from 'react-dropzone'
import { toast } from 'sonner'

import AllUploads from './list'
import { UploadFilesType, uploadFiles } from './upload-controllers'
import GooglePicker from '@/components/google-picker'
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs'
import { FILE_TYPES } from '@/constants'
import { cn } from '@/lib/utils'

interface CustomInputAttributes
  extends React.InputHTMLAttributes<HTMLInputElement> {
  directory?: string
  webkitdirectory?: string
}

const Dashboard = () => {
  const { data: session } = useSession()
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const handleFilesUpload = async (payload: UploadFilesType) => {
    try {
      await uploadFiles(payload)
      setUploadSuccess(true)
    } catch (error) {
      throw error
    }
  }
  const searchParamsComponent = (
    <Suspense fallback={<div>Loading...</div>}>
      <AlluploadsComponent
        setUploadSuccess={setUploadSuccess}
        uploadSuccess={uploadSuccess}
      />
    </Suspense>
  )

  const fetchFiles = () => {
    setUploadSuccess(true)
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      handleFilesUpload({
        files: acceptedFiles,
        type:
          session?.user?.organizationName.toLocaleLowerCase() !== 'remotelegal'
            ? 'files'
            : 'folder',
        toast,
        session,
        fetchFiles: fetchFiles,
      })
    },
    [session]
  )

  return (
    <main className='flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40'>
      <div className='flex items-center justify-between'>
        <Tabs defaultValue='hard-drive' className='w-full mt-4'>
          <div className='flex items-center justify-between mb-4'>
            <h1 className='text-lg font-semibold md:text-lg'>File Uploader</h1>
            <TabsList className='bg-transparent'>
              {/* <TabsTrigger value='hard-drive' className='h-8'>
                <Image
                  loading='lazy'
                  src='/assets/images/files/hardrive.png'
                  alt='Scribie'
                  width={15}
                  height={15}
                />
              </TabsTrigger> 
               <TabsTrigger value='youtube' className='h-8'>
                <Image
                  loading='lazy'
                  src='/assets/images/files/yt.png'
                  alt='Scribie'
                  width={15}
                  height={15}
                />
              </TabsTrigger>
              <TabsTrigger value='link' className='h-8'>
                <Image
                  loading='lazy'
                  src='/assets/images/files/link.png'
                  alt='Scribie'
                  width={15}
                  height={15}
                />
              </TabsTrigger>
              <TabsTrigger value='dropbox' className='h-8'>
                <Image
                  loading='lazy'
                  src='/assets/images/files/dropbox.png'
                  alt='Scribie'
                  width={15}
                  height={15}
                />
              </TabsTrigger>
              <TabsTrigger value='vimeo' className='h-8'>
                <Image
                  loading='lazy'
                  src='/assets/images/files/vimeo.png'
                  alt='Scribie'
                  width={15}
                  height={15}
                />
              </TabsTrigger>

              <TabsTrigger value='box' className='h-8'>
                <Image
                  loading='lazy'
                  src='/assets/images/files/box.png'
                  alt='Scribie'
                  width={15}
                  height={15}
                />
              </TabsTrigger>
              <TabsTrigger value='cloud' className='h-8'>
                <Image
                  loading='lazy'
                  src='/assets/images/files/cloud.png'
                  alt='Scribie'
                  width={15}
                  height={15}
                />
              </TabsTrigger>
              <TabsTrigger value='drive' className='h-8'>
                <Image
                  loading='lazy'
                  src='/assets/images/files/drive.png'
                  alt='Scribie'
                  width={15}
                  height={15}
                />
              </TabsTrigger>
              <TabsTrigger value='amplify' className='h-8'>
                <Image
                  loading='lazy'
                  src='/assets/images/files/amplify.png'
                  alt='Scribie'
                  width={15}
                  height={15}
                />
              </TabsTrigger> */}
            </TabsList>
          </div>
          <TabsContent
            value='hard-drive'
            className='bg-primary flex flex-col p-[12px] items-center justify-center rounded-[12px] border shadow-sm text-white'
          >
            <Dropzone onDrop={onDrop} multiple>
              {({ getRootProps, getInputProps, isDragActive }) => (
                <div
                  {...getRootProps({
                    onClick: (event) => event.stopPropagation(),
                  })}
                  className={cn(
                    'group relative grid h-52 w-full place-items-center rounded-lg border-2 border-dashed border-white px-5 py-2.5 text-center transition',
                    'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isDragActive && 'border-white/50'
                  )}
                >
                  <input {...getInputProps()} />
                  {isDragActive ? (
                    <div className='flex flex-col items-center justify-center gap-4 sm:px-5'>
                      <div className='rounded-full border border-dashed border-white p-3'>
                        <UploadIcon
                          className='size-7 text-white'
                          aria-hidden='true'
                        />
                      </div>
                      <p className='font-medium text-white'>
                        Drop the files here
                      </p>
                    </div>
                  ) : (
                    <div className='flex flex-col items-center justify-center gap-4 sm:px-5'>
                      <div className='flex gap-3 text-base font-medium leading-6'>
                        <FileUp />
                        <div>Upload files</div>
                      </div>
                      <div className='text-xs self-stretch mt-3.5 leading-5 text-center max-md:mr-1 max-md:max-w-full'>
                        Drag & drop files here or use the options below.
                        <br />
                        <span className='text-xs'>
                          mp3,wav,wma,wmv, avi,flv,mpeg,m4a, please contact
                          support@scribie.com for other file formats.
                        </span>{' '}
                      </div>
                      <div className='flex gap-4 mt-4 font-semibold text-indigo-600 leading-[133%]'>
                        {session?.user?.organizationName.toLocaleLowerCase() !==
                          'remotelegal' && (
                          <>
                            <input
                              id='fileInput'
                              type='file'
                              multiple
                              hidden
                              onChange={(
                                event: ChangeEvent<HTMLInputElement>
                              ) =>
                                event.target.files &&
                                handleFilesUpload({
                                  files: event.target.files,
                                  type: 'files',
                                  toast,
                                  session,
                                  fetchFiles: fetchFiles,
                                })
                              }
                              accept={FILE_TYPES.join(',')}
                            />
                            <label
                              data-testid='file-uploader'
                              htmlFor='fileInput'
                              className='justify-center px-5 py-2 bg-white rounded-[32px] cursor-pointer hover:bg-gray-200'
                            >
                              Choose File
                            </label>
                          </>
                        )}

                        <input
                          id='folderInput'
                          type='file'
                          multiple
                          hidden
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            event.target.files &&
                            handleFilesUpload({
                              files: event.target.files,
                              type: 'folder',
                              toast,
                              session,
                              fetchFiles: fetchFiles,
                            })
                          }
                          webkitdirectory='true'
                          directory='true'
                          accept={FILE_TYPES.join(',')}
                          {...({
                            webkitdirectory: 'true',
                            directory: 'true',
                          } as CustomInputAttributes)}
                        />
                        <label
                          data-testid='folder-uploader'
                          htmlFor='folderInput'
                          className='justify-center px-5 py-2 bg-white rounded-[32px] cursor-pointer hover:bg-gray-200'
                        >
                          Choose Folder
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Dropzone>
          </TabsContent>
          <TabsContent
            value='drive'
            className='flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm'
          >
            <GooglePicker />
          </TabsContent>
          {/* { TabContents[tabValue] } */}
        </Tabs>
      </div>

      {searchParamsComponent}
    </main>
  )
}

export default Dashboard

function AlluploadsComponent({
  setUploadSuccess,
  uploadSuccess,
}: {
  setUploadSuccess: (uploadSuccess: boolean) => void
  uploadSuccess: boolean
}) {
  return (
    <AllUploads
      setUploadSuccess={setUploadSuccess}
      uploadSuccess={uploadSuccess}
    />
  )
}
