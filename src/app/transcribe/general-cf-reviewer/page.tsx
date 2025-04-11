'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState, Suspense } from 'react'

import AssignedFilesPage from '../components/assigned-reviewer-files'
import AvailableFilesPage from '../components/available-reviewer-files'
import HistoryFilesPage from '../components/history-reviewer-files'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function GeneralCFReviewerPageContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam || 'available')
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (tabParam && ['available', 'assigned', 'history'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  if (status === 'authenticated' && session?.user?.role !== 'REVIEWER') {
    router.replace('/transcribe/transcriber')
  }

  const changeTab = async (tab: string) => {
    setActiveTab(tab)
    router.push(`/transcribe/general-cf-reviewer?tab=${tab}`, { scroll: false })
  }

  return (
    <div className='h-full flex-1 flex-col p-4 md:flex space-y-3'>
      <div>
        <Tabs
          key={activeTab}
          defaultValue={activeTab}
          onValueChange={(value) => {
            changeTab(value)
          }}
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

export default function GeneralCFReviewerPage() {
  return (
    <Suspense
      fallback={
        <div className='flex items-center justify-center h-full'>
          Loading...
        </div>
      }
    >
      <GeneralCFReviewerPageContent />
    </Suspense>
  )
}
