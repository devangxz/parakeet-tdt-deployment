'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState, Suspense } from 'react'

import AssignedFilesPage from '../components/assigned-files'
import AvailableFilesPage from '../components/available-files'
import HistoryFilesPage from '../components/history-files'
import Motd from '@/components/transcriber-motd/review-with-gemini'
import LlmProcessingNotice from '@/components/transcriber-notice/llm-processing'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function LegalQCPageContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam || 'available')
  const { data: session, status } = useSession()
  const router = useRouter()
  const allowedRoles = ['QC', 'REVIEWER']

  useEffect(() => {
    if (tabParam && ['available', 'assigned', 'history'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [])

  if (
    session?.user &&
    status === 'authenticated' &&
    !allowedRoles.includes(session?.user?.role)
  ) {
    router.replace('/transcribe/transcriber')
  }

  const changeTab = async (tab: string) => {
    setActiveTab(tab)
    router.push(`/transcribe/legal-qc?tab=${tab}`, {
      scroll: false,
    })
  }

  return (
    <div className='h-full flex-1 flex-col p-4 md:flex space-y-3'>
      <Motd />
      <LlmProcessingNotice />

      <div>
        <Tabs
          key={activeTab}
          defaultValue={activeTab}
          onValueChange={(value) => {
            changeTab(value)
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

export default function LegalQCPage() {
  return (
    <Suspense
      fallback={
        <div className='flex items-center justify-center h-full'>
          Loading...
        </div>
      }
    >
      <LegalQCPageContent />
    </Suspense>
  )
}
