function AgreementNotice() {
  return (
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
          We have temporarily taken down our Terms and Agreement to address
          certain queries and ensure clarity. After a thorough review and
          necessary updates, we will request you to sign the revised version.
          Thank you for your patience and cooperation.
        </p>
      </div>
    </div>
  )
}

export default AgreementNotice
