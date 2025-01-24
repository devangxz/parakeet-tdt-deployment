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
  return searchParamsComponent
}

export default Dashboard

function AlluploadsComponent() {
  const searchParams = useSearchParams()
  const folderId = searchParams?.get('folderId') ?? null
  return <AllFiles folderId={folderId} />
}
