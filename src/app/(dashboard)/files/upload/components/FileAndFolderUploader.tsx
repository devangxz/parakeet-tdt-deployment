'use client'

import { UploadIcon } from '@radix-ui/react-icons'
import axios from 'axios'
import { FileUp, FolderUp } from 'lucide-react'
import { useSession } from 'next-auth/react'
import React, { useState, useCallback, ChangeEvent, useEffect, useRef } from 'react'
import Dropzone from 'react-dropzone'
import { toast } from 'sonner'

import { useUpload } from '@/app/context/UploadProvider'
import { FILE_TYPES } from '@/constants'
import { cn } from '@/lib/utils'

interface CustomInputAttributes
  extends React.InputHTMLAttributes<HTMLInputElement> {
  directory?: string
  webkitdirectory?: string
}

interface FileAndFolderUploaderProps {
  onUploadSuccess: (success: boolean) => void
}

interface UploadPart {
  ETag?: string;
  PartNumber: number;
}

const SINGLE_PART_UPLOAD_LIMIT = 20 * 1024 * 1024;
const CHUNK_SIZE = 20 * 1024 * 1024;

const FileAndFolderUploader: React.FC<FileAndFolderUploaderProps> = ({ onUploadSuccess }) => {
  const { data: session } = useSession()
  const { uploadingFiles, setUploadingFiles, updateUploadProgress, clearUpload } = useUpload();

  const [uploadedFiles, setUploadedFiles] = useState<Set<string>>(new Set());

  const uploadedBytesRef = useRef<{ [key: string]: number }>({});
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    eventSourceRef.current = new EventSource('/api/sse');

    eventSourceRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data?.status === 'METADATA_EXTRACTED') {
        updateUploadProgress(data?.result?.fileName, 100);
        setUploadedFiles(prev => new Set(prev).add(data?.result?.fileName));
        onUploadSuccess(true);
      }
    };

    eventSourceRef.current.onerror = () => {
      eventSourceRef.current?.close();
    };

    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (uploadedFiles.size > 0 && uploadedFiles.size === uploadingFiles.length) {
      clearUpload();
      setUploadedFiles(new Set());
    }
  }, [uploadedFiles, uploadingFiles, clearUpload, onUploadSuccess]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (uploadingFiles.length > 0) {
        event.preventDefault()
        event.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [uploadingFiles])

  const singlePartUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('/api/s3-upload/single-part', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            updateUploadProgress(file.name, Math.min(progress, 99));
          }
        },
      });
      return;
    } catch (error) {
      console.error(`Error in single-part upload for file ${file.name}:`, error);
      throw error;
    }
  };

  const multiPartUpload = async (file: File) => {
    try {
      const createRes = await axios.post('/api/s3-upload/multi-part/create', {
        fileInfo: { name: file.name, type: file.type }
      });
      const { uploadId, key } = createRes.data;

      const numChunks = Math.ceil(file.size / CHUNK_SIZE);
      const parts: UploadPart[] = [];
      let totalUploaded = 0;

      for (let i = 0; i < numChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const chunkSize = chunk.size;

        const partRes = await axios.post('/api/s3-upload/multi-part/part', {
          sendBackData: { key, uploadId },
          partNumber: i + 1,
          contentLength: chunkSize,
        });

        const uploadResult = await axios.put(partRes.data.url, chunk, {
          headers: { 'Content-Type': file.type },
          onUploadProgress: (progressEvent) => {
            const chunkLoaded = progressEvent.loaded;
            totalUploaded = i * CHUNK_SIZE + chunkLoaded;
            const overallProgress = (totalUploaded / file.size) * 100;
            updateUploadProgress(file.name, Math.min(overallProgress, 99));
          }
        });

        parts.push({
          ETag: uploadResult.headers['etag'],
          PartNumber: i + 1
        });
      }

      const sortedParts = parts.sort((a, b) => a.PartNumber - b.PartNumber);
      await axios.post('/api/s3-upload/multi-part/complete', {
        sendBackData: { key, uploadId },
        parts: sortedParts
      });

      return;
    } catch (error) {
      console.error(`Error in multipart upload for file ${file.name}:`, error);
      throw error;
    }
  };

  const handleFileOrFolderUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setUploadingFiles(files.map(file => ({ name: file.name, size: file.size })));
    files.forEach(file => {
      updateUploadProgress(file.name, 0);
      uploadedBytesRef.current[file.name] = 0;
    });

    for (const file of files) {
      try {
        if (file.size <= SINGLE_PART_UPLOAD_LIMIT) {
          await singlePartUpload(file);
        } else {
          await multiPartUpload(file);
        }
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        toast.error(`Error uploading ${file.name}`);
        updateUploadProgress(file.name, 0);
      }
    }

    uploadedBytesRef.current = {};
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    handleFileOrFolderUpload(acceptedFiles)
  }, [])

  const isRemoteLegal = session?.user?.organizationName.toLowerCase() === 'remotelegal'

  return (
    <div className='bg-primary flex flex-col p-[12px] items-center justify-center rounded-[12px] border shadow-sm text-white'>
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
                  Drop files or folders here
                </p>
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center gap-4 sm:px-5'>
                <div className='flex gap-3 text-base font-medium leading-6'>
                  <FileUp />
                  <FolderUp />
                  <div>Upload files or folders</div>
                </div>
                <div className='text-xs self-stretch mt-3.5 leading-5 text-center max-md:mr-1 max-md:max-w-full'>
                  Drag & drop files or folders here or use the options below.
                  <br />
                  <span className='text-xs'>
                    mp3, wav, wma, wmv, avi, flv, mpeg, m4a supported.
                  </span>
                </div>
                <div className='flex gap-4 mt-4 font-semibold text-indigo-600 leading-[133%]'>
                  {!isRemoteLegal && (
                    <>
                      <input
                        id='fileInput'
                        type='file'
                        multiple
                        hidden
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          event.target.files &&
                          handleFileOrFolderUpload(Array.from(event.target.files))
                        }
                        accept={FILE_TYPES.join(',')}
                      />
                      <label
                        data-testid='file-uploader'
                        htmlFor='fileInput'
                        className='justify-center px-5 py-2 bg-white rounded-[32px] cursor-pointer hover:bg-gray-200'
                      >
                        Choose Files
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
                      handleFileOrFolderUpload(Array.from(event.target.files))
                    }
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
    </div>
  )
}

export default FileAndFolderUploader