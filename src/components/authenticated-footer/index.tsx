'use client'
import { useRouter } from 'next/navigation'
import React from 'react'

import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'

export default function AuthenticatedFooter() {
  const router = useRouter();
  return (
    <footer className='flex items-center justify-between border-t-2 border-customBorder lg:h-[100px] lg:px-1'>
      <div className='flex flex-wrap items-center gap-2 font-semibold'>
        <Button variant='link' className='text-[#8A8A8A] font-normal' onClick={()=>router.push("/")}>
          Home
        </Button>
        <Button variant='link' className='text-[#8A8A8A] font-normal' onClick={()=>router.push("/")}>
          About
        </Button>
        <Button variant='link' className='text-[#8A8A8A] font-normal' onClick={()=>router.push("/#pricing")}>
          Pricing
        </Button>
        <Button variant='link' className='text-[#8A8A8A] font-normal' onClick={()=>router.push("/terms")}>
          Terms
        </Button>
        <Button variant='link' className='text-[#8A8A8A] font-normal' onClick={()=>router.push("/privacy-policy")}>
          Privacy
        </Button>
        <Button variant='link' className='text-[#8A8A8A] font-normal' onClick={()=>router.push("/contact")}>
          Contact
        </Button>
        <Button variant='link' className='text-[#8A8A8A] font-normal' onClick={()=>router.push("/faq")}>
          FAQ
        </Button>
      </div>
      <div className='hidden lg:flex items-center gap-6 font-semibold'>
        <Button variant='default' size='icon' className='h-6 w-6'>
          <Icons.twitter className='h-3 w-3' />
        </Button>
        <Button variant='default' size='icon' className='h-6 w-6'>
          <Icons.linkedin className='h-4 w-4' />
        </Button>
        <Button variant='default' size='icon' className='h-6 w-6'>
          <Icons.facebook className='h-4 w-4' />
        </Button>
      </div>
    </footer>
  )
}
