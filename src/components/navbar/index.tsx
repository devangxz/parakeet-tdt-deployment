'use client'

import {
  Menu,
  X,
  Upload,
  LogIn,
  UserPlus,
  Settings,
  FileText,
  FileQuestion,
  Mail,
  LogOut,
  Wallet,
  CircleDollarSign,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Session } from 'next-auth'
import { signOut, useSession } from 'next-auth/react'
import React, { useState, useEffect, useCallback } from 'react'

import TranscriberProfile from '@/app/transcribe/components/transcriberProfiles'
import Profile from '@/components/navbar/profile'
import { ThemeSwitcher } from '@/components/theme-switcher'

const MobileMenu = ({
  isOpen,
  onClose,
  session,
  isActiveLink,
  isCustomerOrAdmin,
}: {
  isOpen: boolean
  onClose: () => void
  session: Session | null
  isActiveLink: (href: string) => boolean
  isCustomerOrAdmin: boolean
}) => {
  const [mounted, setMounted] = useState(false)
  const [animationState, setAnimationState] = useState<
    'closed' | 'opening' | 'open' | 'closing'
  >('closed')

  useEffect(() => {
    if (isOpen && !mounted) {
      setMounted(true)
      setAnimationState('closed')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimationState('opening')
        })
      })
    } else if (!isOpen && mounted) {
      setAnimationState('closing')
      const timer = setTimeout(() => {
        setMounted(false)
        setAnimationState('closed')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, mounted])

  useEffect(() => {
    if (animationState === 'opening') {
      const timer = setTimeout(() => {
        setAnimationState('open')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [animationState])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  if (!mounted) return null

  const MenuItem = ({
    href,
    icon: Icon,
    children,
    onClick = handleClose,
  }: {
    href: string
    icon: React.ElementType
    children: React.ReactNode
    onClick?: () => void
  }) => (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
        isActiveLink(href)
          ? 'text-primary bg-primary/10'
          : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
      }`}
    >
      <Icon className='w-5 h-5' />
      {children}
    </Link>
  )

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          animationState === 'closed' || animationState === 'closing'
            ? 'opacity-0'
            : 'opacity-100'
        }`}
        style={{ zIndex: 99999 }}
        onClick={handleClose}
      />

      <div
        className={`fixed inset-y-0 right-0 w-full max-w-sm bg-background shadow-xl transform transition-transform duration-300 ease-out ${
          animationState === 'closed' || animationState === 'closing'
            ? 'translate-x-full'
            : 'translate-x-0'
        }`}
        style={{ zIndex: 99999 }}
      >
        <div className='flex h-full flex-col'>
          <div className='flex items-center justify-between p-4 border-b'>
            <Link href='/' onClick={handleClose}>
              <div className='flex items-center'>
                <Image
                  className='h-8 w-8'
                  src='/assets/images/logo.svg'
                  alt='scribie.ai'
                  width={32}
                  height={32}
                />
                <span className='ml-2 text-lg font-semibold text-primary'>
                  scribie.ai
                </span>
              </div>
            </Link>
            <button onClick={handleClose}>
              <X className='h-5 w-5' />
            </button>
          </div>

          <div className='flex-1 overflow-y-auto'>
            <div className='p-3'>
              {session && (
                <div className='mb-4 p-3 text-foreground bg-secondary rounded-lg'>
                  <div className='text-sm font-medium'>
                    {session.user?.name}
                  </div>
                  <div className='text-xs mt-1'>{session.user?.email}</div>
                </div>
              )}

              <div className='space-y-1 mb-1'>
                {!session && (
                  <>
                    <MenuItem href='/#pricing' icon={CircleDollarSign}>
                      Pricing
                    </MenuItem>
                    <MenuItem href='/contact' icon={Mail}>
                      Contact
                    </MenuItem>
                    <MenuItem href='/signin' icon={LogIn}>
                      Sign In
                    </MenuItem>
                    <MenuItem href='/register' icon={UserPlus}>
                      Sign Up
                    </MenuItem>
                  </>
                )}
              </div>

              {session && (
                <div className='space-y-1 mb-1'>
                  <MenuItem href='/#pricing' icon={CircleDollarSign}>
                    Pricing
                  </MenuItem>
                </div>
              )}

              {session && (
                <div className='space-y-1 mb-4'>
                  {isCustomerOrAdmin ? (
                    <>
                      {session.user?.role === 'ADMIN' && (
                        <MenuItem href='/admin/dashboard' icon={FileText}>
                          Dashboard
                        </MenuItem>
                      )}
                      <MenuItem href='/files/upload' icon={Upload}>
                        Upload File
                      </MenuItem>
                      <MenuItem href='/files/all-files' icon={FileText}>
                        Files
                      </MenuItem>
                      <MenuItem href='/payments/pending' icon={Wallet}>
                        Payments
                      </MenuItem>
                    </>
                  ) : (
                    <MenuItem href='/transcribe/qc' icon={FileText}>
                      Dashboard
                    </MenuItem>
                  )}
                  <MenuItem href='/settings/personal-info' icon={Settings}>
                    Settings
                  </MenuItem>
                </div>
              )}

              {session && (
                <div className='space-y-1 pt-4 border-t border-customBorder'>
                  <MenuItem href='/faq' icon={FileQuestion}>
                    FAQs
                  </MenuItem>
                  <MenuItem href='/customer-guide' icon={FileQuestion}>
                    Guide
                  </MenuItem>
                  <MenuItem href='/contact' icon={Mail}>
                    Contact Support
                  </MenuItem>
                  <button
                    onClick={() => {
                      signOut({ callbackUrl: process.env.NEXT_PUBLIC_SITE_URL })
                      handleClose()
                    }}
                    className='flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 rounded-lg w-full'
                  >
                    <LogOut className='w-5 h-5' />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

const Navbar = () => {
  const { data: session } = useSession()
  const [isScrolled, setIsScrolled] = useState(false)
  const [showBanner, setShowBanner] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
      setShowBanner(window.scrollY <= 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const isActiveLink = (href: string): boolean => {
    if (typeof window === 'undefined') return false

    return (
      pathname !== null &&
      (pathname === href ||
        pathname.startsWith(href) ||
        (href === '#pricing' &&
          pathname === '/' &&
          window.location.hash === '#pricing'))
    )
  }

  const isCustomerOrAdmin =
    session?.user?.role === 'CUSTOMER' || session?.user?.role === 'ADMIN'

  return (
    <>
      <div
        className={`fixed top-0 inset-x-0 z-50 transform transition-all duration-300 ease-out bg-primary/80 text-left ${
          showBanner ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{ zIndex: 100 }}
      >
        <div className='mx-auto px-4 sm:px-10 py-2 flex items-start sm:items-center justify-start sm:justify-center'>
          <span className='text-white text-center text-xs sm:text-base'>
            Scribie.com and scribie.ai are managed by the same trusted team.
            Enjoy the same seamless, human-verified transcripts, now enhanced by
            smarter AI tools and services. Contact us on support@scribie.ai for
            any assistance.
          </span>
        </div>
      </div>
      <div className={`h-20 ${showBanner ? 'mt-10' : ''} w-full`} />

      <nav
        className={`fixed ${
          showBanner ? 'top-20 md:top-12' : 'top-0'
        } left-0 right-0 h-20 w-full transition-all duration-300`}
        style={{ zIndex: 50 }}
      >
        <div
          className={`w-full h-full ${
            isScrolled
              ? 'bg-background/80 backdrop-blur-md shadow-sm'
              : 'bg-background'
          }`}
        >
          <div className='max-w-7xl h-full mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex items-center justify-between h-full'>
              <div
                className='flex items-center cursor-pointer'
                onClick={() => (window.location.href = '/')}
              >
                <Image
                  className='h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12'
                  src='/assets/images/logo.svg'
                  alt='scribie.ai'
                  width={48}
                  height={48}
                />
                <span className='ml-2 sm:ml-3 text-xl sm:text-2xl md:text-3xl font-semibold text-primary'>
                  scribie.ai
                </span>
              </div>

              <div className='flex items-center space-x-8'>
                <div className='hidden md:flex items-center space-x-8'>
                  <Link
                    href='/#pricing'
                    className={`font-medium relative group ${
                      isActiveLink('#pricing')
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-primary'
                    }`}
                  >
                    Pricing
                    <span className='absolute -bottom-1 left-1/2 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full group-hover:left-0' />
                  </Link>

                  <Link
                    href='/contact'
                    className={`font-medium relative group ${
                      isActiveLink('/contact')
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-primary'
                    }`}
                  >
                    Contact
                    <span className='absolute -bottom-1 left-1/2 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full group-hover:left-0' />
                  </Link>

                  {session ? (
                    <div className='flex items-center space-x-8'>
                      {isCustomerOrAdmin && (
                        <span className='flex items-center border-primary border-2 justify-center px-3.5 py-2 text-sm font-medium text-primary rounded-[32px] cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-[1.02]'>
                          <Link
                            href='/files/upload'
                            className='flex items-center gap-2'
                          >
                            <Upload className='w-4 h-4' />
                            Upload File
                          </Link>
                        </span>
                      )}
                      {isCustomerOrAdmin ? <Profile /> : <TranscriberProfile />}
                    </div>
                  ) : (
                    <div className='flex items-center space-x-8'>
                      <span className='flex items-center border-primary border-2 justify-center px-3.5 py-2 text-sm font-medium text-primary rounded-[32px] cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-[1.02]'>
                        <Link
                          href='/signin'
                          className='flex items-center gap-2'
                        >
                          <LogIn className='w-4 h-4' />
                          Sign In
                        </Link>
                      </span>
                      <span className='flex items-center h-fit px-3.5 py-2 text-sm text-primary-foreground bg-primary rounded-[32px] cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-[1.02]'>
                        <Link
                          href='/register'
                          className='flex items-center gap-2'
                        >
                          <UserPlus className='w-4 h-4' />
                          Sign Up
                        </Link>
                      </span>
                    </div>
                  )}
                </div>

                <ThemeSwitcher />

                <button
                  className='md:hidden rounded-md'
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <Menu className='h-6 w-6' />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        session={session}
        isActiveLink={isActiveLink}
        isCustomerOrAdmin={isCustomerOrAdmin}
      />
    </>
  )
}

export default Navbar
