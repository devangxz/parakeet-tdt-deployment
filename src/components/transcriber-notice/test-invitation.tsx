interface TestInvitationNoticeProps {
  message: string
}

function TestInvitationNotice({ message }: TestInvitationNoticeProps) {
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
            d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 100-2 1 1 0 000 2zm0-1a1 1 0 11-2 0 1 1 0 012 0z'
            clipRule='evenodd'
          />
        </svg>
      </div>
      <div className='ml-3'>
        <p className='text-sm font-medium text-primary'>{message}</p>
      </div>
    </div>
  )
}

export default TestInvitationNotice
