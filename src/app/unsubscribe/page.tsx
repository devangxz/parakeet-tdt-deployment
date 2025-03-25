'use client'
import { Suspense } from 'react'

import { UnsubscribeContent } from './unsubscribe-content'
import SideImage from '@/components/side-image'

export default function UnsubscribePage() {
  return (
    <div className='w-full lg:grid lg:grid-cols-2'>
      <SideImage />
      <div className='flex items-center justify-center px-4 py-12 lg:px-8'>
        <div className='w-full max-w-sm space-y-5'>
          <div className='space-y-2.5 mb-6 text-center lg:text-left'>
            <div>
              <h1 className='text-2xl font-semibold tracking-tight text-center'>
                Unsubscribe from Newsletter
              </h1>
            </div>
            <div className='w-full max-w-md p-8 bg-white rounded-lg shadow-md'>
              <Suspense
                fallback={
                  <div className='text-center'>Processing your request...</div>
                }
              >
                <UnsubscribeContent />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
