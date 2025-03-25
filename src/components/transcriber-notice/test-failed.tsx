function TestFailedNotice() {
  return (
    <div className='border-l-4 border-destructive flex items-start p-4 my-1 bg-destructive/10 border border-destructive rounded-md shadow-sm'>
      <div className='flex-shrink-0'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-6 w-6 text-destructive'
          viewBox='0 0 20 20'
          fill='currentColor'
        >
          <path
            fillRule='evenodd'
            d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
            clipRule='evenodd'
          />
        </svg>
      </div>
      <div className='ml-3'>
        <h3 className='text-sm font-medium text-destructive'>Test Failed</h3>
        <div className='mt-2 text-sm text-destructive/90'>
          <p>
            You have failed the test 3 times. You will need to wait 3 months
            before attempting the test again. We recommend reviewing our
            transcription guidelines and practicing in the meantime.
          </p>
        </div>
      </div>
    </div>
  )
}

export default TestFailedNotice
