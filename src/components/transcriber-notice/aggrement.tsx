function AgreementNotice() {
  return (
    <div className='flex items-start p-4 my-4 bg-blue-50 border border-blue-200 rounded-md shadow-sm'>
      <div className='flex-shrink-0'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-6 w-6 text-blue-500'
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
        <p className='text-sm font-medium text-blue-800'>
          We are bringing down the terms and agreement since there were some
          questions about it. We will review and update the same. You will be
          requested to sign it again post that.
        </p>
      </div>
    </div>
  )
}

export default AgreementNotice
