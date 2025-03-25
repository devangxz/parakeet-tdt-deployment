import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'

import { checkTranscriberTestStatus } from '@/app/actions/transcriber/check-test-status'
import {
  getTestFiles,
  getAssignedTestFiles,
  getTestHistory,
  TestFile,
  TestAttempt,
} from '@/app/actions/transcriber/get-test-files'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import AlreadyQCNotice from '@/components/transcriber-notice/already-qc'
import TestFailedNotice from '@/components/transcriber-notice/test-failed'
import TestInvitationNotice from '@/components/transcriber-notice/test-invitation'
import { TestFileTabs } from '@/components/transcriber-test/test-file-tabs'

export default async function TranscriberPage() {
  const session = await getServerSession(authOptions)

  // Redirect if not authenticated
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const userId =
    typeof session.user.userId === 'number' ? session.user.userId : 0

  // Get test status
  const statusResponse = await checkTranscriberTestStatus(userId)

  // Default values if the server action fails
  const testStatus = statusResponse.success
    ? {
        isInvited: statusResponse.isInvited,
        isPassed: statusResponse.isPassed,
        failedAttempts: statusResponse.failedAttempts,
        isQC: statusResponse.isQC,
      }
    : {
        isInvited: false,
        isPassed: false,
        failedAttempts: 0,
        isQC: false,
      }

  // Initialize files arrays
  let availableFiles: TestFile[] = []
  let assignedFiles: TestFile[] = []
  let historyFiles: TestAttempt[] = []

  // Only load files if the user is invited and hasn't failed 3 times
  if (testStatus.isInvited && testStatus.failedAttempts < 3) {
    // Get available test files
    const filesResponse = await getTestFiles()
    if (filesResponse.success && filesResponse.data) {
      availableFiles = filesResponse.data
    }

    // Get assigned test files
    const assignedResponse = await getAssignedTestFiles(userId)
    if (assignedResponse.success && assignedResponse.data) {
      assignedFiles = assignedResponse.data
    }
  }

  // Get test history regardless of invitation status
  const historyResponse = await getTestHistory(userId)
  if (historyResponse.success && historyResponse.data) {
    historyFiles = historyResponse.data
  }

  let displayContent

  if (testStatus.isQC) {
    displayContent = (
      <div className='space-y-4'>
        <AlreadyQCNotice />
      </div>
    )
  } else if (testStatus.failedAttempts >= 3) {
    displayContent = (
      <div className='space-y-4'>
        <TestFailedNotice />
        <div className='mt-8'>
          <h2 className='text-xl font-bold mb-4'>Your Test History</h2>
          <TestFileTabs
            availableFiles={[]}
            assignedFiles={[]}
            historyFiles={historyFiles}
            userId={userId}
          />
        </div>
      </div>
    )
  } else if (testStatus.isInvited) {
    displayContent = (
      <div className='space-y-4'>
        <TestInvitationNotice message='You have been invited to take the transcription test. Select a file below to begin your test.' />

        <div className='mt-4'>
          <TestFileTabs
            availableFiles={availableFiles}
            assignedFiles={assignedFiles}
            historyFiles={historyFiles}
            userId={userId}
          />
        </div>
      </div>
    )
  } else {
    displayContent = (
      <div className='w-full'>
        <div className='border-l-4 border-primary flex items-start p-4 my-1 bg-primary/10 border border-primary rounded-md shadow-sm'>
          <div className='flex-shrink-0'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-6 w-6 text-primary'
              viewBox='0 0 20 20'
              fill='currentColor'
            >
              <path
                fillRule='evenodd'
                d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-9-4a1 1 0 112 0v2a1 1 0 01-2 0V6zm1 4a1 1 0 00-.993.883L9 11v2a1 1 0 001.993.117L11 13v-2a1 1 0 00-1-1z'
                clipRule='evenodd'
              />
            </svg>
          </div>
          <div className='ml-3'>
            <p className='text-sm font-medium text-primary'>
              You are currently not invited to take the transcriber test. Please
              check back later or contact support if you believe this is an
              error.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='h-full flex-1 flex-col p-4 md:flex space-y-3'>
      {displayContent}
    </div>
  )
}
