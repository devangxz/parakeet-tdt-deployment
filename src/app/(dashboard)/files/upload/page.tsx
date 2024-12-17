'use client'

import Image from 'next/image'
import { useState } from 'react'

// import BoxImporter from './components/BoxImporter';
// import DropboxImporter from './components/DropboxImporter';
import FileAndFolderUploader from './components/FileAndFolderUploader'
// import GoogleDriveImporter from './components/GoogleDriveImporter';
// import LinkImporter from './components/LinkImporter';
// import OneDriveImporter from './components/OneDriveImporter';
// import YouTubeImporter from './components/YouTubeImporter';
import AllUploads from './list'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getAllowedFileExtensions } from '@/utils/validateFileType'

interface UploadType {
  id: string
  icon: string
  title: string
}

const FileFormatDisplay = ({ formats }: { formats: string[] }) => (
  <div className='flex flex-wrap items-center gap-2'>
    <span className='font-medium text-sm'>Supported File Formats:</span>
    {formats.map((format, index) => (
      <Badge
        key={index}
        variant='outline'
        className='px-2 py-0.5 text-xs bg-[#F3F0FF] border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors'
      >
        {format}
      </Badge>
    ))}
  </div>
)

const Dashboard = () => {
  const [selectedTab, setSelectedTab] = useState('local');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const uploadTypes: UploadType[] = [
    {
      id: 'local',
      icon: '/assets/images/upload/computer.svg',
      title: 'Upload files via Computer',
    },
    // {
    //   id: 'youtube',
    //   icon: '/assets/images/upload/youtube.svg',
    //   title: 'Upload files via YouTube'
    // },
    // {
    //   id: 'link',
    //   icon: '/assets/images/upload/link.svg',
    //   title: 'Upload files via Link'
    // },
    // {
    //   id: 'dropbox',
    //   icon: '/assets/images/upload/dropbox.svg',
    //   title: 'Upload files via Dropbox'
    // },
    // {
    //   id: 'vimeo',
    //   icon: '/assets/images/upload/vimeo.svg',
    //   title: 'Upload files via Vimeo'
    // },
    // {
    //   id: 'box',
    //   icon: '/assets/images/upload/box.svg',
    //   title: 'Upload files via Box'
    // },
    // {
    //   id: 'one-drive',
    //   icon: '/assets/images/upload/one-drive.svg',
    //   title: 'Upload files via OneDrive'
    // },
    // {
    //   id: 'google-drive',
    //   icon: '/assets/images/upload/google-drive.svg',
    //   title: 'Upload files via Google Drive'
    // },
    // {
    //   id: 'frame-io',
    //   icon: '/assets/images/upload/frame-io.svg',
    //   title: 'Upload files via Frame.io'
    // }
  ]

  const getPageTitle = () => {
    const selectedType = uploadTypes.find((type) => type.id === selectedTab)
    return selectedType ? selectedType.title : 'Upload files'
  }

  const renderContent = () => {
    switch (selectedTab) {
      case 'local':
        return <FileAndFolderUploader onUploadSuccess={setUploadSuccess} />;
      // case 'youtube':
      //   return <YouTubeImporter onUploadSuccess={setUploadSuccess} />;
      // case 'link':
      //   return <LinkImporter onUploadSuccess={setUploadSuccess} />;
      // case 'dropbox':
      //   return <DropboxImporter onUploadSuccess={setUploadSuccess} />;
      // case 'box':
      //   return <BoxImporter onUploadSuccess={setUploadSuccess} />;
      // case 'one-drive':
      //   return <OneDriveImporter onUploadSuccess={setUploadSuccess} />;
      // case 'google-drive':
      //   return <GoogleDriveImporter onUploadSuccess={setUploadSuccess} />;
      default:
        return null
    }
  }

  return (
    <main className='flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40'>
      <div className='flex flex-col gap-4'>
        <div className='flex items-center justify-between mb-1'>
          <h1 className='text-lg font-semibold md:text-lg'>{getPageTitle()}</h1>

          <div className='bg-[#F3F0FF] rounded-2xl p-1'>
            <ul className='flex items-center justify-center gap-3 max-w-3xl mx-auto'>
              {uploadTypes.map((type) => (
                <li key={type.id}>
                  <button
                    onClick={() => setSelectedTab(type.id)}
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center outline-none',
                      selectedTab === type.id
                        ? 'bg-white shadow-md'
                        : 'hover:bg-white/40'
                    )}
                  >
                    <div className='relative w-12 h-12'>
                      <Image
                        src={type.icon}
                        alt={type.title}
                        width={50}
                        height={50}
                        className='object-contain'
                        priority
                      />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {renderContent()}

        <FileFormatDisplay
          formats={getAllowedFileExtensions().map((ext) => ext.slice(1))}
        />
      </div>

      <AllUploads
        setUploadSuccess={setUploadSuccess}
        uploadSuccess={uploadSuccess}
      />
    </main>
  )
}

export default Dashboard
