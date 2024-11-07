'use client';

import Image from 'next/image';
import { useState } from 'react';

import FileAndFolderUploader from './components/FileAndFolderUploader';
import LinkImporter from './components/LinkImporter';
import AllUploads from './list';
import { cn } from '@/lib/utils';
import { getAllowedFileExtensions } from '@/utils/validateFileType';

interface UploadType {
  id: string;
  icon: string;
  title: string;
}

const Dashboard = () => {
  const [selectedTab, setSelectedTab] = useState('computer');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const uploadTypes: UploadType[] = [
    {
      id: 'computer',
      icon: '/assets/images/upload/computer.svg',
      title: 'Upload files via Computer'
    },
    // {
    //   id: 'youtube',
    //   icon: '/assets/images/upload/youtube.svg', 
    //   title: 'Upload files via YouTube'
    // },
    {
      id: 'link',
      icon: '/assets/images/upload/link.svg',
      title: 'Upload files via Link'
    },
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
  ];

  const getPageTitle = () => {
    const selectedType = uploadTypes.find(type => type.id === selectedTab);
    return selectedType ? selectedType.title : 'Upload files';
  };

  const renderContent = () => {
    switch (selectedTab) {
      case 'computer':
        return <FileAndFolderUploader onUploadSuccess={setUploadSuccess} />;
      case 'link':
        return <LinkImporter onUploadSuccess={setUploadSuccess} />;
    }
  };

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
                      selectedTab === type.id ? 'bg-white shadow-md' : 'hover:bg-white/40'
                    )}
                  >
                    <div className="relative w-12 h-12">
                      <Image
                        src={type.icon}
                        alt={type.title}
                        width={50}
                        height={50}
                        className="object-contain"
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

        <p className='self-start'>
          <span className='font-medium'>Supported File Formats:</span>{' '}
          <span className='text-gray-600'>
            {getAllowedFileExtensions().map(ext => ext.slice(1)).join(', ')}.
          </span>
        </p>
      </div>

      <AllUploads
        setUploadSuccess={setUploadSuccess}
        uploadSuccess={uploadSuccess}
      />
    </main>
  );
};

export default Dashboard;