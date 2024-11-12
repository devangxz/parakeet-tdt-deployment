'use client';

import { UploadIcon } from '@radix-ui/react-icons';
import axios from 'axios';
import { FileUp } from 'lucide-react';
import { useSession } from 'next-auth/react';
import React, { ChangeEvent, useRef, useState } from 'react';
import Dropzone from 'react-dropzone';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { useUpload } from '@/app/context/UploadProvider';
import { SINGLE_PART_UPLOAD_LIMIT, MULTI_PART_UPLOAD_CHUNK_SIZE, ORG_REMOTELEGAL, ORG_REMOTELEGAL_FOLDER, UPLOAD_MAX_RETRIES } from '@/constants';
import { cn } from '@/lib/utils';
import { BaseUploadState, FileWithId, CustomInputAttributes, UploaderProps } from '@/types/upload';
import { handleRetryableError } from '@/utils/uploadUtils';
import validateFileType, { getAllowedFileExtensions, getAllowedMimeTypes } from '@/utils/validateFileType';

const FileAndFolderUploader: React.FC<UploaderProps> = ({ onUploadSuccess }) => {
  const { data: session } = useSession();
  const { setUploadingFiles, updateUploadStatus, initializeSSEConnection, isUploading, setIsUploading } = useUpload();
  const [uploadStates, setUploadStates] = useState<{ [key: string]: BaseUploadState }>({});

  const initializeUploadState = (): BaseUploadState => ({
    uploadId: null,
    key: null,
    completedParts: [],
    totalUploaded: 0,
    lastFailedPart: null
  });
  const updateUploadState = (fileName: string, updates: Partial<BaseUploadState>) => {
    setUploadStates(prev => ({
      ...prev,
      [fileName]: {
        ...prev[fileName] || initializeUploadState(),
        ...updates
      }
    }));
  };

  const abortControllersRef = useRef<{ [key: string]: AbortController }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const isRemoteLegal = session?.user?.organizationName.toLocaleLowerCase() === ORG_REMOTELEGAL.toLocaleLowerCase();

  const cleanupUpload = async (fileName: string, uploadState?: BaseUploadState) => {
    if (abortControllersRef.current[fileName]) {
      delete abortControllersRef.current[fileName];
    }

    if (uploadState?.uploadId && uploadState?.key) {
      try {
        await axios.post('/api/s3-upload/multi-part/abort', {
          uploadId: uploadState.uploadId,
          key: uploadState.key
        });
      } catch (error) {
        toast.error(`Failed to abort multipart upload for file ${fileName}`);
      }
    }

    setUploadStates(prev => {
      const newState = { ...prev };
      delete newState[fileName];
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
      await cleanupUpload(file.name, uploadState);
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

      updateUploadStatus(file.name, {
        progress: 99,
        status: 'processing'
      });

      await cleanupUpload(file.name, uploadStates[file.name]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      updateUploadStatus(file.name, {
        progress: 0,
        status: 'failed',
        error: errorMessage
      });
      toast.error(`Error uploading ${file.name}: ${errorMessage}`);
      await cleanupUpload(file.name, uploadStates[file.name]);
    }
  };

  const handleFileOrFolderUpload = async (files: File[]) => {
    console.log('Files to be uploaded:', files.map(f => ({ name: f.name, size: f.size })));

    if (isUploading) {
      toast.error("Please wait for current uploads to complete before starting new uploads");
      return;
    }

    let filesToUpload: FileWithId[] = [];

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';

    setUploadStates({});
    setUploadingFiles([]);
    setIsUploading(true);

    try {
      if (isRemoteLegal) {
        const remoteLegalFiles = files.filter(file => {
          const pathSegments = file.webkitRelativePath.split('/');
          if (pathSegments.length > 1) {
            console.log('Selected folder:', pathSegments[0]);
            return pathSegments[1].toLowerCase() === ORG_REMOTELEGAL_FOLDER.toLowerCase();
          }
          return false;
        });

        if (remoteLegalFiles.length === 0) {
          setIsUploading(false);
          toast.error("No 'Scribie' folder found or the folder is empty.");
          return;
        }

        const mp3File = remoteLegalFiles.find(file => file.name.toLowerCase().endsWith('.mp3'));
        const docxFile = remoteLegalFiles.find(file => file.name.toLowerCase().endsWith('.docx'));

        if (!mp3File || !docxFile) {
          setIsUploading(false);
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
            file: mp3File,
            isRLDocx: false
          },
          {
            name: docxFile.name,
            size: docxFile.size,
            type: docxFile.type,
            fileId: `${commonFileId}_ris`,
            file: docxFile,
            isRLDocx: true
          }
        ];

      } else {
        const allowedFiles = files.filter(validateFileType);
        const rejectedFiles = files.filter(file => !validateFileType(file));

        if (rejectedFiles.length > 0) {
          toast.error(`${rejectedFiles.length} ${rejectedFiles.length === 1 ? 'file was' : 'files were'} rejected due to unsupported file type.`);
        }

        if (allowedFiles.length === 0) {
          setIsUploading(false);
          return;
        }

        filesToUpload = allowedFiles.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          fileId: uuidv4(),
          file: file,
          isRLDocx: false
        }));
      }

      setUploadingFiles(filesToUpload.map(file => ({ name: file.name, size: file.size, fileId: file.fileId })));

      initializeSSEConnection(
        () => onUploadSuccess(true),
        () => setIsUploading(false)
      );

      for (const file of filesToUpload) {
        await uploadFile(file);

        if (file.isRLDocx) {
          updateUploadStatus(file.name, {
            progress: 100,
            status: 'completed'
          });
        }
      }
    } catch (error) {
      toast.error('Upload failed');
      setIsUploading(false);
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (isUploading) {
      toast.error("Please wait for current uploads to complete before starting new uploads");
      return;
    }
    handleFileOrFolderUpload(acceptedFiles);
  };

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
              isDragActive && 'border-white/50',
            )}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <div className='self-center flex flex-col items-center justify-center gap-4 sm:px-5'>
                <div className='rounded-full border border-dashed border-white p-3'>
                  <UploadIcon
                    className='size-7 text-white'
                    aria-hidden='true'
                  />
                </div>
                <p className='font-medium text-white'>Drop files or folders here</p>
              </div>
            ) : (
              <div className='self-center flex flex-col items-center justify-center gap-4 sm:px-5'>
                <div className='flex gap-3 text-base font-medium leading-6'>
                  <FileUp />
                  <h4>Upload {!isRemoteLegal && 'Files or'} Folders</h4>
                </div>
                <div className='text-xs self-stretch mt-4 leading-5 text-center max-md:mr-1 max-md:max-w-full'>
                  {`Drag & drop ${!isRemoteLegal ? 'files or' : ''} folders here or use the options below.`}
                </div>
                <div className='flex gap-4 mt-4 font-semibold text-indigo-600'>
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