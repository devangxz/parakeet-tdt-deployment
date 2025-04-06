import Link from 'next/link'

function AlreadyQCNotice() {
  return (
    <div className='border-l-4 flex items-start p-4 my-1 bg-green-500/10 border border-green-500 rounded-md shadow-sm'>
      <div className='flex-shrink-0'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-6 w-6 text-green-500'
          viewBox='0 0 20 20'
          fill='currentColor'
        >
          <path
            fillRule='evenodd'
            d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
            clipRule='evenodd'
          />
        </svg>
      </div>
      <div className='ml-3'>
        <h3 className='text-sm font-medium text-green-700'>
          You are already a QC
        </h3>
        <div className='mt-2 text-sm text-green-700/90'>
          <p>
            You have already passed the test and are a QC. You can now work on
            files in the QC section.
          </p>
        </div>
        <div className='mt-4'>
          <Link
            href='/transcribe/qc'
            className='inline-flex items-center rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100'
          >
            Go to QC Page
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 20 20'
              fill='currentColor'
              className='ml-2 h-4 w-4'
            >
              <path
                fillRule='evenodd'
                d='M5 10a.75.75 0 01.75-.75h6.638L10.23 7.29a.75.75 0 111.04-1.08l3.5 3.25a.75.75 0 010 1.08l-3.5 3.25a.75.75 0 11-1.04-1.08l2.158-1.96H5.75A.75.75 0 015 10z'
                clipRule='evenodd'
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AlreadyQCNotice
