'use client'

import { UploadIcon } from '@radix-ui/react-icons'
import axios from 'axios'
import { FolderUp } from 'lucide-react'
import { useSession } from 'next-auth/react'
import React, { ChangeEvent, useEffect, useRef, useState } from 'react'
import Dropzone from 'react-dropzone'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

import { useUpload } from '@/app/context/UploadProvider'
import { SINGLE_PART_UPLOAD_LIMIT, MULTI_PART_UPLOAD_CHUNK_SIZE, ORG_REMOTELEGAL, ORG_REMOTELEGAL_FOLDER, UPLOAD_MAX_RETRIES, UPLOAD_RETRY_DELAY } from '@/constants'
import { cn } from '@/lib/utils'
import validateFileType, { getAllowedFileExtensions, getAllowedMimeTypes } from '@/utils/validateFileType'

interface UploadPart {
  ETag?: string;
  PartNumber: number;
}

interface UploadState {
  uploadId: string | null;
  key: string | null;
  completedParts: UploadPart[];
  totalUploaded: number;
  lastFailedPart: number | null;
}
interface FileWithId {
  name: string;
  size: number;
  type: string;
  fileId: string;
  file: File;
}

interface FileAndFolderUploaderProps {
  onUploadSuccess: (success: boolean) => void;
}

interface CustomInputAttributes extends React.InputHTMLAttributes<HTMLInputElement> {
  directory?: string;
  webkitdirectory?: string;
}

const FileAndFolderUploader: React.FC<FileAndFolderUploaderProps> = ({ onUploadSuccess }) => {
  const { data: session } = useSession();
  const { uploadingFiles, setUploadingFiles, updateUploadStatus } = useUpload();
  const [uploadStates, setUploadStates] = useState<{ [key: string]: UploadState }>({});

  const initializeUploadState = (): UploadState => ({
    uploadId: null,
    key: null,
    completedParts: [],
    totalUploaded: 0,
    lastFailedPart: null
  });
  const updateUploadState = (fileName: string, updates: Partial<UploadState>) => {
    setUploadStates(prev => ({
      ...prev,
      [fileName]: {
        ...prev[fileName] || initializeUploadState(),
        ...updates
      }
    }));
  };

  const abortControllersRef = useRef<{ [key: string]: AbortController }>({});
  const eventSourceRef = useRef<EventSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const isRemoteLegal = session?.user?.organizationName.toLocaleLowerCase() === ORG_REMOTELEGAL.toLocaleLowerCase();

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const isRetryableError = (error: unknown): boolean => {
    if (!axios.isAxiosError(error)) return false;

    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    return !error.response?.status || retryableStatusCodes.includes(error.response.status);
  };

  const handleRetryableError = async (error: unknown, retryCount: number): Promise<void> => {
    if (axios.isCancel(error)) {
      throw new Error('Upload cancelled');
    }

    if (!isRetryableError(error)) {
      throw error;
    }

    if (retryCount >= UPLOAD_MAX_RETRIES) {
      throw new Error(`File upload failed after ${UPLOAD_MAX_RETRIES} attempts`);
    }

    const delay = UPLOAD_RETRY_DELAY * Math.pow(2, retryCount);
    await sleep(delay);
  };

  const cleanupUpload = async (file: FileWithId, uploadState?: UploadState) => {
    if (abortControllersRef.current[file.name]) {
      delete abortControllersRef.current[file.name];
    }

    if (uploadState?.uploadId && uploadState?.key) {
      try {
        await axios.post('/api/s3-upload/multi-part/abort', {
          uploadId: uploadState.uploadId,
          key: uploadState.key
        });
      } catch (error) {
        toast.error(`Failed to abort multipart upload for file ${file.name}`);
      }
    }

    setUploadStates(prev => {
      const newState = { ...prev };
      delete newState[file.name];
      return newState;
    });
  };

  const singlePartUpload = async (file: FileWithId): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file.file);
    formData.append('fileId', file.fileId);

    const abortController = new AbortController();
    abortControllersRef.current[file.name] = abortController;

    let retryCount = -1;

    while (retryCount <= UPLOAD_MAX_RETRIES) {
      try {
        await axios.post('/api/s3-upload/single-part', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          signal: abortController.signal,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = (progressEvent.loaded / progressEvent.total) * 100;
              updateUploadStatus(file.name, {
                progress: Math.min(progress, 99),
                status: 'uploading'
              });
            }
          },
        });
        return;

      } catch (error) {
        retryCount++;
        await handleRetryableError(error, retryCount);
      }
    }
  };

  const multiPartUpload = async (file: FileWithId): Promise<void> => {
    let uploadState = uploadStates[file.name] || initializeUploadState();

    const abortController = new AbortController();
    abortControllersRef.current[file.name] = abortController;

    try {
      let retryCount = -1;
      while (retryCount <= UPLOAD_MAX_RETRIES && !uploadState.uploadId) {
        try {
          const createRes = await axios.post('/api/s3-upload/multi-part/create', {
            fileInfo: { type: file.type, originalName: file.name, fileId: file.fileId }
          });
          uploadState = {
            ...uploadState,
            uploadId: createRes.data.uploadId,
            key: createRes.data.key
          };
          updateUploadState(file.name, uploadState);
        } catch (error) {
          retryCount++;
          await handleRetryableError(error, retryCount);
        }
      }

      const numChunks = Math.ceil(file.size / MULTI_PART_UPLOAD_CHUNK_SIZE);
      const startPartNumber = uploadState.lastFailedPart || 1;

      for (let i = startPartNumber - 1; i < numChunks; i++) {
        const partNumber = i + 1;

        if (uploadState.completedParts.some(p => p.PartNumber === partNumber)) {
          continue;
        }

        retryCount = -1;

        while (retryCount <= UPLOAD_MAX_RETRIES) {
          try {
            const start = i * MULTI_PART_UPLOAD_CHUNK_SIZE;
            const end = Math.min(start + MULTI_PART_UPLOAD_CHUNK_SIZE, file.size);
            const chunk = file.file.slice(start, end);

            const partRes = await axios.post('/api/s3-upload/multi-part/part', {
              sendBackData: { key: uploadState.key, uploadId: uploadState.uploadId },
              partNumber,
              contentLength: chunk.size,
            });

            const uploadResult = await axios.put(partRes.data.url, chunk, {
              headers: { 'Content-Type': file.type },
              signal: abortController.signal,
              onUploadProgress: (progressEvent) => {
                if (!progressEvent.total) return;

                const completedSize = uploadState.completedParts.length * MULTI_PART_UPLOAD_CHUNK_SIZE;
                const currentProgress = (progressEvent.loaded / progressEvent.total) * MULTI_PART_UPLOAD_CHUNK_SIZE;
                const totalProgress = ((completedSize + currentProgress) / file.size) * 100;

                updateUploadStatus(file.name, {
                  progress: Math.min(totalProgress, 99),
                  status: 'uploading'
                });
              }
            });

            uploadState.completedParts.push({
              ETag: uploadResult.headers['etag'],
              PartNumber: partNumber
            });
            uploadState.totalUploaded = uploadState.completedParts.length * MULTI_PART_UPLOAD_CHUNK_SIZE;
            updateUploadState(file.name, uploadState);
            break;

          } catch (error) {
            retryCount++;
            await handleRetryableError(error, retryCount);

            uploadState.lastFailedPart = partNumber;
            continue;
          }
        }
      }

      retryCount = -1;
      const sortedParts = uploadState.completedParts.sort((a, b) => a.PartNumber - b.PartNumber);

      while (retryCount <= UPLOAD_MAX_RETRIES) {
        try {
          await axios.post('/api/s3-upload/multi-part/complete', {
            sendBackData: {
              key: uploadState.key,
              uploadId: uploadState.uploadId,
              fileName: file.name
            },
            parts: sortedParts
          });
          break;
        } catch (error) {
          retryCount++;
          await handleRetryableError(error, retryCount);
        }
      }

    } catch (error) {
      await cleanupUpload(file, uploadState);
      throw error;
    }
  };

  const uploadFile = async (file: FileWithId): Promise<void> => {
    try {
      updateUploadStatus(file.name, {
        progress: 0,
        status: 'uploading'
      });

      if (file.size <= SINGLE_PART_UPLOAD_LIMIT) {
        await singlePartUpload(file);
      } else {
        await multiPartUpload(file);
      }
      await cleanupUpload(file, uploadStates[file.name]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      updateUploadStatus(file.name, {
        progress: 0,
        status: 'failed',
        error: errorMessage
      });
      toast.error(`Error uploading ${file.name}: ${errorMessage}`);
      await cleanupUpload(file, uploadStates[file.name]);
    }
  };

  const handleFileOrFolderUpload = async (files: File[]) => {
    let filesToUpload: FileWithId[] = [];

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';

    setUploadStates({});
    setUploadingFiles([]);

    if (isRemoteLegal) {
      const remoteLegalFiles = files.filter(file => {
        const pathSegments = file.webkitRelativePath.split('/');
        return pathSegments.length > 1 && pathSegments[1].toLowerCase() === ORG_REMOTELEGAL_FOLDER.toLowerCase();
      });

      if (remoteLegalFiles.length === 0) {
        toast.error("No 'Scribie' folder found or the folder is empty.");
        return;
      }

      const mp3File = remoteLegalFiles.find(file => file.name.toLowerCase().endsWith('.mp3'));
      const docxFile = remoteLegalFiles.find(file => file.name.toLowerCase().endsWith('.docx'));

      if (!mp3File || !docxFile) {
        toast.error("Both MP3 and DOCX files are required in the 'Scribie' folder.");
        return;
      }

      const commonFileId = uuidv4();
      filesToUpload = [
        {
          name: mp3File.name,
          size: mp3File.size,
          type: mp3File.type,
          fileId: commonFileId,
          file: mp3File
        },
        {
          name: docxFile.name,
          size: docxFile.size,
          type: docxFile.type,
          fileId: `${commonFileId}_ris`,
          file: docxFile
        }
      ];

    } else {
      const allowedFiles = files.filter(validateFileType);
      const rejectedFiles = files.filter(file => !validateFileType(file));

      if (rejectedFiles.length > 0) {
        toast.error(`${rejectedFiles.length} ${rejectedFiles.length === 1 ? 'file was' : 'files were'} rejected due to unsupported file type.`);
      }

      if (allowedFiles.length === 0) return;

      filesToUpload = allowedFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        fileId: uuidv4(),
        file: file
      }));
    }

    setUploadingFiles(filesToUpload.map(file => ({ name: file.name, size: file.size })));

    for (const file of filesToUpload) {
      await uploadFile(file);
    }

    onUploadSuccess(true);
  };

  const onDrop = (acceptedFiles: File[]) => {
    handleFileOrFolderUpload(acceptedFiles);
  };

  useEffect(() => {
    eventSourceRef.current = new EventSource('/api/sse');

    eventSourceRef.current.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data?.type === 'METADATA_EXTRACTION') {
        if (data?.file?.status === 'success') {
          updateUploadStatus(data?.file?.fileNameWithExtension, {
            progress: 100,
            status: 'completed'
          });
          onUploadSuccess(true);
        } else {
          updateUploadStatus(data?.file?.fileNameWithExtension, {
            progress: 0,
            status: 'failed',
            error: 'Metadata extraction failed.'
          });
          toast.error(`Error uploading ${data?.file?.fileNameWithExtension}: An error occurred during file upload. Please try again.`);
        }
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
  }, [uploadingFiles]);

  return (
    <div className='bg-primary flex flex-col p-[12px] items-center justify-center rounded-[12px] border shadow-sm text-white'>
      <Dropzone
        onDrop={onDrop}
        multiple
        accept={Object.fromEntries(
          getAllowedMimeTypes().map(type => [
            type,
            getAllowedFileExtensions()
          ])
        )}
      >
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
                  <FolderUp />
                  <div>Upload {!isRemoteLegal && 'files or'} folders</div>
                </div>
                <div className='text-xs self-stretch mt-3.5 leading-5 text-center max-md:mr-1 max-md:max-w-full'>
                  Drag & drop {!isRemoteLegal && 'files or'} folders here or use the options below.
                  <br />
                  <span className='text-xs'>
                    Supported formats: {getAllowedFileExtensions().join(', ')}
                  </span>
                </div>
                <div className='flex gap-4 mt-4 font-semibold text-indigo-600 leading-[133%]'>
                  {!isRemoteLegal && (
                    <>
                      <input
                        ref={fileInputRef}
                        id='fileInput'
                        type='file'
                        multiple
                        hidden
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          event.target.files &&
                          handleFileOrFolderUpload(Array.from(event.target.files))
                        }
                        accept={getAllowedFileExtensions().join(',')}
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
                    ref={folderInputRef}
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

export default FileAndFolderUploader;