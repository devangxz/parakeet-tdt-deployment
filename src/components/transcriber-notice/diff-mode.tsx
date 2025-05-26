function DiffModeNotice() {
  return (
    <div className='border-l-4 border-primary flex items-start p-4 my-1 bg-primary/10 border rounded-md shadow-sm'>
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
        <p className='text-sm font-medium text-primary mb-2'>
          <span className='font-semibold'>New feature (beta):</span> We&apos;re
          introducing Diff Mode to help you compare and edit transcript versions
          more easily
        </p>
        <ul className='list-disc pl-5 text-sm font-medium text-primary space-y-1.5'>
          <li>Turn Diff Mode on/off using the toggle at the top</li>
          <li>
            Select which versions to compare using the dropdown at the bottom
          </li>
          <li>
            You can make edits directly while in Diff Mode, your changes will
            update live with visual cues
          </li>
          <li>
            When you exit Diff Mode, only the common text and inserted content
            will remain, any deleted text will be fully removed
          </li>
        </ul>
        <p className='mt-2 text-sm font-medium text-primary'>
          This is a beta feature. If you face any issues, avoid making edits and
          use it just to compare versions. Please provide feedback and report
          any issues so we can resolve them.
        </p>
      </div>
    </div>
  )
}

export default DiffModeNotice
