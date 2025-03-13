'use client'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

import AssignedFilesPage from '../components/assigned-files'
import AvailableFilesPage from '../components/available-files'
import HistoryFilesPage from '../components/history-files'
import Motd from '@/components/transcriber-motd/review-with-gemini'
import AgreementNotice from '@/components/transcriber-notice/aggrement'
import LlmProcessingNotice from '@/components/transcriber-notice/llm-processing'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function LegalQCPage() {
  const [activeTab, setActiveTab] = useState('available')
  const { data: session, status } = useSession()
  const router = useRouter()
  const allowedRoles = ['QC', 'REVIEWER']

  if (
    session?.user &&
    status === 'authenticated' &&
    !allowedRoles.includes(session?.user?.role)
  ) {
    router.replace('/transcribe/transcriber')
  }

  const changeTab = async (tab: string) => {
    setActiveTab(tab)
  }

  return (
    <div className='h-full flex-1 flex-col p-4 md:flex space-y-3'>
      <Motd />
      <AgreementNotice />
      <LlmProcessingNotice />

      <div>
        <Tabs
          key={activeTab}
          defaultValue={activeTab}
          onValueChange={(value) => {
            setActiveTab(value)
          }}
          className='mt-1'
        >
          <TabsList className='rounded-md'>
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
