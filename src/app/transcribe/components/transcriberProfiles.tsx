'use client'

import { ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'

const getInitials = (name: string) => {
  const nameParts = name.split(' ')
  let initials = nameParts[0].charAt(0)
  if (nameParts.length > 1) {
    initials += nameParts[1].charAt(0)
  } else {
    initials += nameParts[0].charAt(1)
  }

  return initials.toUpperCase()
}

const TranscriberProfile = () => {
  const router = useRouter()
  const { data: session } = useSession()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          className='relative flex items-center justify-center h-9 pl-1 pr-2 bg-primary/10 rounded-ful border border-primary'
        >
          <Avatar className='h-8 w-8 border-0'>
            <AvatarFallback className='text-sm font-medium bg-transparent border-0'>
              {getInitials(session?.user?.name ?? 'NA')}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className='h-4 w-4 text-gray-700' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56' align='end' forceMount>
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm font-medium leading-none'>
              {session?.user?.name}
            </p>
            <p className='text-xs leading-none text-muted-foreground'>
              {session?.user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push(`/transcribe/qc`)}>
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/settings/personal-info`)}
          >
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(`/faq`)}>
          FAQs
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/contact`)}>
          Contact Support
        </DropdownMenuItem>
        <DropdownMenuItem
          className='text-red-500 hover:text-red-500'
          onClick={() =>
            signOut({ callbackUrl: process.env.NEXT_PUBLIC_SITE_URL })
          }
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default TranscriberProfile
