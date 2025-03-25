'use client'

import { useState } from 'react'

import { TestFileTable } from '@/components/transcriber-test/test-file-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type {
  TestFile,
  TestAttempt,
} from '@/app/actions/transcriber/get-test-files'

interface TestFileTabsProps {
  availableFiles: TestFile[]
  assignedFiles: TestFile[]
  historyFiles: TestAttempt[]
  userId: number
}

export function TestFileTabs({
  availableFiles,
  assignedFiles,
  historyFiles,
  userId,
}: TestFileTabsProps) {
  const [activeTab, setActiveTab] = useState('available')

  const formattedHistoryFiles = historyFiles.map((attempt) => ({
    id: attempt.id,
    fileId: attempt.fileId,
    filename: attempt.filename,
    duration: attempt.duration,
    filesize: attempt.filesize,
    createdAt: attempt.createdAt,
    passed: attempt.passed,
    score: attempt.score,
    completedAt: attempt.completedAt,
    orderTs: attempt.orderTs,
  }))

  console.log(formattedHistoryFiles)

  return (
    <Tabs
      defaultValue='available'
      value={activeTab}
      onValueChange={setActiveTab}
    >
      <TabsList className='grid w-[400px] grid-cols-3 mb-4'>
        <TabsTrigger value='available'>Available</TabsTrigger>
        <TabsTrigger value='assigned'>Assigned</TabsTrigger>
        <TabsTrigger value='history'>History</TabsTrigger>
      </TabsList>
      <TabsContent value='available'>
        <TestFileTable
          files={availableFiles}
          userId={userId}
          type='available'
          onTestStarted={() => setActiveTab('assigned')}
        />
      </TabsContent>
      <TabsContent value='assigned'>
        <TestFileTable files={assignedFiles} userId={userId} type='assigned' />
      </TabsContent>
      <TabsContent value='history'>
        <TestFileTable
          files={formattedHistoryFiles}
          userId={userId}
          type='history'
        />
      </TabsContent>
    </Tabs>
  )
}
