'use client'
import CloseIcon from '@mui/icons-material/Close'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import MenuIcon from '@mui/icons-material/Menu'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

function Navbar() {
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY
      if (offset > 0) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const handleMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isMobileMenuOpen])

  return (
    <div className={`flex justify-between px-7 lg:px-[10%] py-6 lg:py-8 sticky top-0 bg-white z-10 transition-all duration-300 ${
      scrolled ? 'border-b border-gray-200 shadow-sm' : ''
    }`}>
      <Link href='/'>
        <div className='flex items-center gap-3'>
          <Image
            loading='lazy'
            src='/assets/images/logo.svg'
            alt='Scribie'
            width={36}
            height={36}
          />
          <span className='inline font-semibold text-4xl under'>scribie.ai</span>
        </div>
      </Link>

      {/* Desktop Menu */}
      <div className='hidden md:flex md:gap-8 md:font-semibold'>
        <div className='self-stretch my-auto text-neutral-800 border-3'>
          <Link href='/#pricing'>Pricing</Link>
        </div>
        <div className='flex-auto self-stretch my-auto text-neutral-800 border-3'>
          <Link href='/contact'>Contact</Link>
        </div>
        <div className='flex items-center gap-4 self-stretch text-sm border-3'>
          <span className='flex items-center h-fit px-5 py-2 text-white bg-indigo-600 rounded-[32px] cursor-pointer'>
            <Link href='/signin'>Upload File</Link>
          </span>
          {session ? (
            <div className='flex items-center gap-4'>
              <Link
                href='/files/upload'
                className='flex items-center border-[#EEEAFF] border-2 justify-center px-5 py-2 text-indigo-600 bg-white rounded-[32px]'
              >
                <span className='cursor-pointer'>My Files</span>
              </Link>
            </div>
          ) : (
            <div>
              <span className='flex items-center border-[#EEEAFF] border-2 justify-center px-5 py-2 text-indigo-600 bg-white rounded-[32px]'>
                {/* <Link href='/register' className='mr-1'>
                  Register
                </Link>
                / */}
                <Link href='/signin' className='ml-1'>
                  Log In
                </Link>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Icon */}
      <div className='md:hidden flex items-center'>
        <MenuIcon className='cursor-pointer' fontSize='large' onClick={handleMenuToggle} />
      </div>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 flex flex-col px-7 py-6 justify-between bg-white shadow-lg transition-transform duration-500 ease-in-out transform ${isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'} md:hidden`}>
        <div className='flex flex-col gap-y-12'>
          <div className='flex justify-between items-center'>
            <Link href='/' onClick={handleMenuToggle}>
              <div className='flex items-center gap-3'>
                <Image
                  loading='lazy'
                  src='/assets/images/logo.svg'
                  alt='Scribie'
                  width={36}
                  height={36}
                />
                <span className='font-semibold text-4xl'>scribie.ai</span>
              </div>
            </Link>
            <CloseIcon className='cursor-pointer' fontSize='large' onClick={handleMenuToggle} />
          </div>
          <div className='flex flex-col'>
            <Link href='/#pricing' onClick={handleMenuToggle} className='flex items-center justify-between border-b-[1.5px] border-gray-200 py-5'>
              <span className='text-lg font-semibold'>Pricing</span>
              <KeyboardArrowRightIcon />
            </Link>
            <Link href='/contact' onClick={handleMenuToggle} className='flex items-center justify-between py-5'>
              <span className='text-lg font-semibold'>Contact</span>
              <KeyboardArrowRightIcon />
            </Link>
          </div>
        </div>
        <div className='flex flex-col gap-y-5'>
          <Link href='/signin' onClick={handleMenuToggle} className='text-lg font-semibold text-white bg-indigo-600 rounded-full px-4 py-2 text-center'>Upload File</Link>
          {!session ? (
            <Link href='/signin' onClick={handleMenuToggle} className='text-lg font-semibold text-indigo-600 border border-indigo-600 rounded-full px-4 py-2 text-center'>Log In</Link>
          ) : (
            <Link href='/files/upload' onClick={handleMenuToggle} className='text-lg font-semibold text-indigo-600 border border-indigo-600 rounded-full px-4 py-2 text-center'>My Files</Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default Navbar
