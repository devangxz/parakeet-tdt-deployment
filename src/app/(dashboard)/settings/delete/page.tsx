'use client'

import React, { useState } from 'react'

import DeleteAccountDialog from './components/delete-modal'
import HeadingDescription from '@/components/heading-description'
import { Button } from '@/components/ui/button'

const Page = () => {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  return (
    <>
      <div className='lg:w-[70%] flex flex-1 flex-col p-4 gap-5'>
        <HeadingDescription
          heading='Delete Account'
          description='Click on the button below to delete your account. All the data
          associated with your account will be removed forever. The account
          cannot be restored once deleted.'
        />

        <div className='pt-2'>
          <Button
            onClick={() => setOpenDeleteDialog(true)}
            variant='destructive'
          >
            Delete Account
          </Button>
        </div>
      </div>
      <DeleteAccountDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      />
    </>
  )
}

export default Page
