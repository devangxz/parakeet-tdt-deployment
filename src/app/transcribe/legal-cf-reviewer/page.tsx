'use client'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

import AssignedFilesPage from '../components/assigned-reviewer-files'
import AvailableFilesPage from '../components/available-reviewer-files'
import HistoryFilesPage from '../components/history-reviewer-files'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function LegalCFReviewerPage() {
  const [activeTab, setActiveTab] = useState('available')
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === 'authenticated' && session?.user?.role !== 'REVIEWER') {
    router.replace('/transcribe/transcriber')
  }

  const changeTab = async (tab: string) => {
    setActiveTab(tab)
  }

  return (
    <div className='bg-[#F7F5FF] h-screen'>
      <div className='mt-8 ml-8 w-4/5'>
        <Tabs
          key={activeTab}
          defaultValue={activeTab}
          onValueChange={(value) => {
            setActiveTab(value)
          }}
        >
          <TabsList>
            <TabsTrigger value='available'>Available</TabsTrigger>
            <TabsTrigger value='assigned'>Assigned</TabsTrigger>
            <TabsTrigger value='history'>History</TabsTrigger>
          </TabsList>
          <TabsContent value='available'>
            <AvailableFilesPage changeTab={changeTab} />
          </TabsContent>
          <TabsContent value='assigned'>
            <AssignedFilesPage changeTab={changeTab} />
          </TabsContent>
          <TabsContent value='history'>
            <HistoryFilesPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
