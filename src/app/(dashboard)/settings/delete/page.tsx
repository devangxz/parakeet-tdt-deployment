'use client'
import Image from 'next/image'
import React, { useState } from 'react'

import DeleteAccountDialog from './components/delete-modal'
import { Button } from '@/components/ui/button'

const Page = () => {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  return (
    <div className='py-[.75rem] w-[100%] h-[100%] flex flex-col justify-center items-center'>
      <div className='flex flex-col justify-center items-center space-y-[1.5rem] w-[50%]'>
        <Image
          src='/assets/images/delete.svg'
          alt='scribie'
          width={110}
          height={80}
        />
        <div className='text-gray-900 text-center text-lg not-italic font-semibold leading-5'>
          Delete account
        </div>
        <div className='text-gray-600 text-center text-sm not-italic font-normal leading-5'>
          Click on the button below to delete your account. All the data
          associated with your account will be removed forever. The account
          cannot be restored once deleted.
        </div>
        <Button
          onClick={() => setOpenDeleteDialog(true)}
          className='flex justify-center items-center text-red-600 text-sm not-italic font-medium leading-6 bg-transparent border-red-200 hover:bg-transparent'
        >
          Delete Account
        </Button>
      </div>
      <DeleteAccountDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      />
    </div>
  )
}

export default Page
