'use client'
import { useRouter } from 'next/navigation'
import React from 'react'

import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'

export default function AuthenticatedFooter() {
  const router = useRouter()
  return (
    <footer className='flex items-center justify-between border-t-2 border-customBorder px-2 lg:px-4 py-4'>
      <div className='flex flex-wrap items-center gap-x-8 font-semibold'>
        <Button
          variant='link'
          className='text-muted-foreground hover:text-primary hover:border-primary font-normal p-0 h-fit'
          onClick={() => router.push('/')}
        >
          Home
        </Button>
        <Button
          variant='link'
          className='text-muted-foreground hover:text-primary hover:border-primary font-normal p-0 h-fit'
          onClick={() => router.push('/about-us')}
        >
          About
        </Button>
        <Button
          variant='link'
          className='text-muted-foreground hover:text-primary hover:border-primary font-normal p-0 h-fit'
          onClick={() => router.push('/#pricing')}
        >
          Pricing
        </Button>
        <Button
          variant='link'
          className='text-muted-foreground hover:text-primary hover:border-primary font-normal p-0 h-fit'
          onClick={() => router.push('/terms')}
        >
          Terms
        </Button>
        <Button
          variant='link'
          className='text-muted-foreground hover:text-primary hover:border-primary font-normal p-0 h-fit'
          onClick={() => router.push('/privacy-policy')}
        >
          Privacy
        </Button>
        <Button
          variant='link'
          className='text-muted-foreground hover:text-primary hover:border-primary font-normal p-0 h-fit'
          onClick={() => router.push('/contact')}
        >
          Contact
        </Button>
        <Button
          variant='link'
          className='text-muted-foreground hover:text-primary hover:border-primary font-normal p-0 h-fit'
          onClick={() => router.push('/faq')}
        >
          FAQs
        </Button>
      </div>
      <div className='hidden lg:flex items-center gap-x-8 font-semibold'>
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
