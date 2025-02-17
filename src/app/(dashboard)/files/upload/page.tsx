'use client'

import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

import BoxImporter from './components/BoxImporter'
import DropboxImporter from './components/DropboxImporter'
import FileAndFolderUploader from './components/FileAndFolderUploader'
import GoogleDriveImporter from './components/GoogleDriveImporter'
import LinkImporter from './components/LinkImporter'
import OneDriveImporter from './components/OneDriveImporter'
import YouTubeImporter from './components/YouTubeImporter'
import AllUploads from './list'
import { Badge } from '@/components/ui/badge'
import { ORG_REMOTELEGAL } from '@/constants'
import { cn } from '@/lib/utils'
import { getAllowedFileExtensions } from '@/utils/validateFileType'

interface UploadType {
  id: string
  icon: string
  title: string
}

const FileFormatDisplay = ({ formats }: { formats: string[] }) => (
  <div className='flex flex-wrap items-center gap-2'>
    <span className='text-muted-foreground font-medium text-sm'>
      Supported File Formats:
    </span>
    {formats.map((format, index) => (
      <Badge
        key={index}
        variant='outline'
        className='px-1.5 pt-0 pb-[2px] text-xs bg-primary/10 border-primary/20 text-primary'
      >
        {format}
      </Badge>
    ))}
  </div>
)

const Dashboard = () => {
  const { data: session } = useSession()
  const [selectedTab, setSelectedTab] = useState('local')
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const isRemoteLegal =
    session?.user?.organizationName.toLocaleLowerCase() ===
    ORG_REMOTELEGAL.toLocaleLowerCase()

  const uploadTypes: UploadType[] = isRemoteLegal
    ? [
        {
          id: 'local',
          icon: '/assets/images/upload/computer.svg',
          title: 'Upload Files Via Computer',
        },
      ]
    : [
        {
          id: 'local',
          icon: '/assets/images/upload/computer.svg',
          title: 'Upload Files Via Computer',
        },
        {
          id: 'youtube',
          icon: '/assets/images/upload/youtube.svg',
          title: 'Upload Files Via YouTube',
        },
        {
          id: 'link',
          icon: '/assets/images/upload/link.svg',
          title: 'Upload Files Via Link',
        },
        {
          id: 'dropbox',
          icon: '/assets/images/upload/dropbox.svg',
          title: 'Upload Files Via Dropbox',
        },
        {
          id: 'box',
          icon: '/assets/images/upload/box.svg',
          title: 'Upload Files Via Box',
        },
        {
          id: 'one-drive',
          icon: '/assets/images/upload/one-drive.svg',
          title: 'Upload Files Via OneDrive',
        },
        {
          id: 'google-drive',
          icon: '/assets/images/upload/google-drive.svg',
          title: 'Upload Files Via Google Drive',
        },
      ]

  const getPageTitle = () => {
    const selectedType = uploadTypes.find((type) => type.id === selectedTab)
    return selectedType ? selectedType.title : 'Upload files'
  }

  const renderContent = () => {
    if (isRemoteLegal) {
      return (
        <FileAndFolderUploader
          onUploadSuccess={setUploadSuccess}
          isRemoteLegal={isRemoteLegal}
        />
      )
    }

    switch (selectedTab) {
      case 'local':
        return (
          <FileAndFolderUploader
            onUploadSuccess={setUploadSuccess}
            isRemoteLegal={isRemoteLegal}
          />
        )
      case 'youtube':
        return <YouTubeImporter onUploadSuccess={setUploadSuccess} />
      case 'link':
        return <LinkImporter onUploadSuccess={setUploadSuccess} />
      case 'dropbox':
        return <DropboxImporter onUploadSuccess={setUploadSuccess} />
      case 'box':
        return <BoxImporter onUploadSuccess={setUploadSuccess} />
      case 'one-drive':
        return <OneDriveImporter onUploadSuccess={setUploadSuccess} />
      case 'google-drive':
        return <GoogleDriveImporter onUploadSuccess={setUploadSuccess} />
      default:
        return null
    }
  }

  return (
    <div className='flex flex-1 flex-col p-4 gap-10'>
      <div className='flex flex-col gap-3'>
        <div className='flex items-start justify-between'>
          <h1 className='text-lg font-semibold md:text-xl'>{getPageTitle()}</h1>

          <div className='bg-primary/10 rounded-md p-1'>
            <ul className='flex items-center justify-center gap-3 max-w-3xl mx-auto'>
              {uploadTypes.map((type) => (
                <li key={type.id}>
                  <button
                    onClick={() => setSelectedTab(type.id)}
                    className={cn(
                      'w-11 h-11 rounded-md flex items-center justify-center outline-none',
                      selectedTab === type.id
                        ? 'bg-white shadow-md'
                        : 'hover:bg-white'
                    )}
                  >
                    <div className='relative w-11 h-11'>
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
    </div>
  )
}

export default Dashboard
