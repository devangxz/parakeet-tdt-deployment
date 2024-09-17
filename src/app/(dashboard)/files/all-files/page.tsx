'use client'
import { useSearchParams } from 'next/navigation'
import React, { Suspense } from 'react'

import AllFiles from './AllFiles'

const Dashboard = () => {
  const searchParamsComponent = (
    <Suspense fallback={<div>Loading...</div>}>
      <AlluploadsComponent />
    </Suspense>
  )
  return (
    <main className='flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40'>
      {searchParamsComponent}
    </main>
  )
}

export default Dashboard

function AlluploadsComponent() {
  const searchParams = useSearchParams()
  const folderId = searchParams?.get('folderId') ?? null
  return <AllFiles folderId={folderId} />
}
