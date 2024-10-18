'use client'

import { useState } from 'react'

import FileAndFolderUploader from './components/FileAndFolderUploader'
import AllUploads from './list'
import GooglePicker from '@/components/google-picker'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const Dashboard = () => {
  const [uploadSuccess, setUploadSuccess] = useState(false)

  return (
    <main className='flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40'>
      <div className='flex items-center justify-between'>
        <Tabs defaultValue='hard-drive' className='w-full mt-4'>
          <div className='flex items-center justify-between mb-4'>
            <h1 className='text-lg font-semibold md:text-lg'>File Uploader</h1>
            <TabsList className='bg-transparent'>
              <TabsTrigger value='hard-drive'>Local</TabsTrigger>
              <TabsTrigger value='drive'>Google Drive</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='hard-drive'>
            <FileAndFolderUploader onUploadSuccess={setUploadSuccess} />
          </TabsContent>
          <TabsContent
            value='drive'
            className='flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm'
          >
            <GooglePicker />
          </TabsContent>
        </Tabs>
      </div>

      <AllUploads
        setUploadSuccess={setUploadSuccess}
        uploadSuccess={uploadSuccess}
      />
    </main>
  )
}

export default Dashboard