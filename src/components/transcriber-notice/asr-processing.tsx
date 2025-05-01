function ASRProcessingNotice() {
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
        <p className='text-sm text-primary font-medium mb-2'>
          <span className='font-semibold'>New feature:</span> We&apos;re
          introducing GPT-4o Transcribe to enhance your editing experience
        </p>
        <ul className='list-disc pl-5 text-sm font-medium text-primary space-y-1.5'>
          <li>
            Your first view will show a corrected transcript powered by GPT-4o
            Transcribe
          </li>
          <li>
            See the changes in the Diff tab — or use &quot;Restore Version&quot;
            in the dropdown to revert to the original AssemblyAI output if you
            prefer
          </li>
          <li>
            GPT-4o Transcribe is designed for higher contextual understanding
            and offers better speaker differentiation and improved
            punctuation/formatting
          </li>
        </ul>
      </div>
    </div>
  )
}
export default ASRProcessingNotice
