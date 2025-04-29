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
        <p className='text-sm font-semibold text-primary mb-2'>
          We&apos;ve enhanced our transcript processing with a two-step system:
        </p>
        <ol className='mb-3 pl-5 text-sm font-medium text-primary space-y-2 list-decimal'>
          <li>Initial processing by AssemblyAI</li>
          <li>Automatic correction by GPT-4o Transcribe</li>
        </ol>
        <p className='text-sm font-semibold text-primary mb-2'>
          What&apos;s New:
        </p>
        <ul className='list-disc pl-5 text-sm font-medium text-primary space-y-2'>
          <li>
            The transcript you first see in the editor is already the GPT-4o
            corrected version
          </li>
          <li>
            Not satisfied with the corrections? Use &quot;Restore Version&quot;
            in the dropdown to access the original AssemblyAI version
          </li>
          <li>Toggle to editable diff mode from the toolbar</li>
          <li>
            Easily compare and review changes between different transcript
            versions
          </li>
          <li>
            Changes made in diff mode are automatically saved to your current
            transcript
          </li>
        </ul>
      </div>
    </div>
  )
}
export default ASRProcessingNotice
