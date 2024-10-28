'use client'

import DevTools from './components/dev-tools'

export default function DevDashboard() {
  return (
    <>
      <div className='h-full flex-1 flex-col space-y-8 p-5 md:flex bg-muted/40'>
        <DevTools />
      </div>
    </>
  )
}
