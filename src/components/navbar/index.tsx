'use client'

import { Menu, X, Upload, LogIn, LogOut, UserPlus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Session } from 'next-auth'
import { signOut, useSession } from 'next-auth/react'
import React, { useState, useEffect, useCallback } from 'react'

const MobileMenu = ({
  isOpen,
  onClose,
  session,
  isActiveLink,
}: {
  isOpen: boolean
  onClose: () => void
  session: Session | null
  isActiveLink: (href: string) => boolean
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

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur transition-opacity duration-300 ${
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
                  className='h-10 w-10'
                  src='/assets/images/logo.svg'
                  alt='scribie.ai'
                  width={40}
                  height={40}
                />
                <span className='ml-2 text-xl font-semibold text-primary'>
                  scribie.ai
                </span>
              </div>
            </Link>
            <button
              onClick={handleClose}
              className='p-2 rounded-md hover:bg-gray-100'
            >
              <X className='h-6 w-6' />
            </button>
          </div>

          <div className='flex-1 overflow-y-auto'>
            <div className='flex flex-col p-6 space-y-6'>
              <Link
                href='/#pricing'
                onClick={handleClose}
                className={`flex items-center py-2 px-4 text-lg font-medium rounded-lg ${
                  isActiveLink('#pricing')
                    ? 'text-primary bg-primary/10'
                    : 'text-gray-700 hover:text-primary hover:bg-primary/5'
                }`}
              >
                Pricing
              </Link>
              <Link
                href='/contact'
                onClick={handleClose}
                className={`flex items-center py-2 px-4 text-lg font-medium rounded-lg ${
                  isActiveLink('/contact')
                    ? 'text-primary bg-primary/10'
                    : 'text-gray-700 hover:text-primary hover:bg-primary/5'
                }`}
              >
                Contact
              </Link>

              {session ? (
                <div className='flex flex-col space-y-4 pt-4 border-t'>
                  <Link
                    href='/files/upload'
                    onClick={handleClose}
                    className='flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary border-2 border-primary rounded-lg hover:bg-primary/5'
                  >
                    <Upload className='w-4 h-4' />
                    Upload File
                  </Link>
                  <button
                    onClick={() =>
                      signOut({ callbackUrl: process.env.NEXT_PUBLIC_SITE_URL })
                    }
                    className='flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:opacity-90'
                  >
                    <LogOut className='w-4 h-4' />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className='flex flex-col space-y-4 pt-4 border-t'>
                  <Link
                    href='/signin'
                    onClick={handleClose}
                    className='flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary border-2 border-primary rounded-lg hover:bg-primary/5'
                  >
                    <LogIn className='w-4 h-4' />
                    Sign In
                  </Link>
                  <Link
                    href='/register'
                    onClick={handleClose}
                    className='flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:opacity-90'
                  >
                    <UserPlus className='w-4 h-4' />
                    Sign Up
                  </Link>
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
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

  return (
    <>
      <div className='h-20 w-full' />

      <nav
        className='fixed top-0 left-0 right-0 h-20 w-full'
        style={{ zIndex: 50 }}
      >
        <div
          className={`w-full h-full ${
            isScrolled
              ? 'bg-background/80 backdrop-blur-md shadow-sm'
              : 'bg-background'
          }`}
        >
          <div className='max-w-[90rem] h-full mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex items-center justify-between h-full'>
              <Link href='/'>
                <div className='flex items-center'>
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
              </Link>

              <div className='hidden md:flex items-center space-x-8'>
                <Link
                  href='/#pricing'
                  className={`font-medium relative group ${
                    isActiveLink('#pricing')
                      ? 'text-primary'
                      : 'text-gray-700 hover:text-primary'
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
                      : 'text-gray-700 hover:text-primary'
                  }`}
                >
                  Contact
                  <span className='absolute -bottom-1 left-1/2 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full group-hover:left-0' />
                </Link>

                {session ? (
                  <div className='flex items-center space-x-6'>
                    <span className='flex items-center border-primary border-2 justify-center px-3.5 py-2 text-sm font-medium text-primary rounded-[32px] cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-[1.02]'>
                      <Link
                        href='/files/upload'
                        className='flex items-center gap-2'
                      >
                        <Upload className='w-4 h-4' />
                        Upload File
                      </Link>
                    </span>
                    <button
                      onClick={() =>
                        signOut({
                          callbackUrl: process.env.NEXT_PUBLIC_SITE_URL,
                        })
                      }
                      className='flex items-center gap-2 h-fit px-3.5 py-2 text-sm text-primary-foreground bg-primary rounded-[32px] cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-[1.02]'
                    >
                      <LogOut className='w-4 h-4' />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className='flex items-center space-x-6'>
                    <span className='flex items-center border-primary border-2 justify-center px-3.5 py-2 text-sm font-medium text-primary rounded-[32px] cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-[1.02]'>
                      <Link href='/signin' className='flex items-center gap-2'>
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

              <button
                className='md:hidden rounded-md hover:bg-gray-100'
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className='h-6 w-6' />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        session={session}
        isActiveLink={isActiveLink}
      />
    </>
  )
}

export default Navbar
