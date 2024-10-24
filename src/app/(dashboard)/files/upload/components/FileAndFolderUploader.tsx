'use client'

import { UploadIcon } from '@radix-ui/react-icons'
import axios from 'axios'
import { FolderUp } from 'lucide-react'
import { useSession } from 'next-auth/react'
import React, { ChangeEvent, useEffect, useRef } from 'react'
import Dropzone from 'react-dropzone'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

import { useUpload } from '@/app/context/UploadProvider'
import { SINGLE_PART_UPLOAD_LIMIT, MULTI_PART_UPLOAD_CHUNK_SIZE, ORG_REMOTELEGAL, ORG_REMOTELEGAL_FOLDER } from '@/constants'
import { cn } from '@/lib/utils'

const ALLOWED_FILE_TYPES = [
  'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/x-ms-wma',
  'video/x-ms-wmv', 'video/x-msvideo', 'video/x-flv', 'video/mpeg',
  'video/mp4', 'audio/mp4', 'video/x-m4v', 'video/quicktime',
  'audio/ogg', 'video/ogg', 'video/webm', 'audio/aiff',
  'audio/x-aiff', 'audio/amr', 'video/3gpp', 'audio/3gpp',
  'video/mp2t', 'audio/aac', 'video/x-matroska', 'video/mxf',
  'audio/opus', 'audio/flac'
];

const FILE_EXTENSIONS = [
  '.mp3', '.wav', '.wma', '.wmv', '.avi', '.flv', '.mpg', '.mpeg',
  '.mp4', '.m4a', '.m4v', '.mov', '.ogg', '.webm', '.aif', '.aiff',
  '.amr', '.3gp', '.3ga', '.mts', '.ogv', '.aac', '.mkv', '.mxf',
  '.opus', '.flac'
];

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

interface FileWithId {
  name: string;
  size: number;
  type: string;
  fileId: string;
  file: File;
}

const FileAndFolderUploader: React.FC<FileAndFolderUploaderProps> = ({ onUploadSuccess }) => {
  const { data: session } = useSession()
  const { uploadingFiles, setUploadingFiles, updateUploadStatus } = useUpload();

  const uploadedBytesRef = useRef<{ [key: string]: number }>({});
  const eventSourceRef = useRef<EventSource | null>(null);

  const isRemoteLegal = session?.user?.organizationName.toLocaleLowerCase() === ORG_REMOTELEGAL.toLocaleLowerCase();

  useEffect(() => {
    eventSourceRef.current = new EventSource('/api/sse');

    eventSourceRef.current.onmessage = (event) => {
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

  const singlePartUpload = async (file: FileWithId) => {
    const formData = new FormData();
    formData.append('file', file.file);
    formData.append('fileId', file.fileId);

    try {
      await axios.post('/api/s3-upload/single-part', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
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
    } catch (error) {
      throw new Error('An error occurred during file upload. Please try again.');
    }
  };

  const multiPartUpload = async (file: FileWithId) => {
    try {
      const createRes = await axios.post('/api/s3-upload/multi-part/create', {
        fileInfo: { type: file.type, originalName: file.name, fileId: file.fileId }
      });
      const { uploadId, key } = createRes.data;

      const numChunks = Math.ceil(file.size / MULTI_PART_UPLOAD_CHUNK_SIZE);
      const parts: UploadPart[] = [];
      let totalUploaded = 0;

      for (let i = 0; i < numChunks; i++) {
        const start = i * MULTI_PART_UPLOAD_CHUNK_SIZE;
        const end = Math.min(start + MULTI_PART_UPLOAD_CHUNK_SIZE, file.size);
        const chunk = file.file.slice(start, end);
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
            totalUploaded = i * MULTI_PART_UPLOAD_CHUNK_SIZE + chunkLoaded;
            const overallProgress = (totalUploaded / file.size) * 100;
            updateUploadStatus(file.name, {
              progress: Math.min(overallProgress, 99),
              status: 'uploading'
            });
          }
        });

        parts.push({
          ETag: uploadResult.headers['etag'],
          PartNumber: i + 1
        });
      }

      const sortedParts = parts.sort((a, b) => a.PartNumber - b.PartNumber);
      await axios.post('/api/s3-upload/multi-part/complete', {
        sendBackData: { key, uploadId, fileName: file.name },
        parts: sortedParts
      });

      return;
    } catch (error) {
      throw new Error('An error occurred during file upload. Please try again.');
    }
  };

  const uploadFile = async (file: FileWithId) => {
    updateUploadStatus(file.name, { progress: 0, status: 'uploading' });
    uploadedBytesRef.current[file.name] = 0;

    try {
      if (file.size <= SINGLE_PART_UPLOAD_LIMIT) {
        await singlePartUpload(file);
      } else {
        await multiPartUpload(file);
      }

      if (isRemoteLegal && file.name.toLowerCase().endsWith('.docx')) {
        updateUploadStatus(file.name, { progress: 100, status: 'completed' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      updateUploadStatus(file.name, {
        progress: 0,
        status: 'failed',
        error: errorMessage
      });
      toast.error(`Error uploading ${file.name}: ${errorMessage}`);
    }
  };

  const isFileAllowed = (file: File): boolean => {
    const fileType = file.type.toLowerCase();
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (isRemoteLegal && fileExtension === '.docx') {
      return true;
    }

    return ALLOWED_FILE_TYPES.includes(fileType) || FILE_EXTENSIONS.includes(fileExtension);
  };

  const handleFileOrFolderUpload = async (files: File[]) => {
    let filesToUpload: FileWithId[] = [];

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
      const allowedFiles = files.filter(isFileAllowed);
      const rejectedFiles = files.filter(file => !isFileAllowed(file));

      if (rejectedFiles.length > 0) {
        toast.error(`${rejectedFiles.length} file(s) were rejected due to unsupported file type.`);
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

    uploadedBytesRef.current = {};
    onUploadSuccess(true);
  };

  const onDrop = (acceptedFiles: File[]) => {
    handleFileOrFolderUpload(acceptedFiles);
  };

  return (
    <div className='bg-primary flex flex-col p-[12px] items-center justify-center rounded-[12px] border shadow-sm text-white'>
      <Dropzone
        onDrop={onDrop}
        multiple
        accept={Object.fromEntries(ALLOWED_FILE_TYPES.map(type => [type, FILE_EXTENSIONS]))}
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
                    Supported formats: {FILE_EXTENSIONS.join(', ')}
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
                        accept={FILE_EXTENSIONS.join(',')}
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