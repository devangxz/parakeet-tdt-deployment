import Link from 'next/link'

import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div className='bg-white w-full h-screen flex justify-center items-center'>
        <div className='flex flex-col gap-4 w-full sm:w-96 p-4 sm:p-0'>
          <h2 className='text-xl leading-tight py-2'>Page Not Found</h2>
          <p className='py-2'>
            Sorry, the page you are looking for could not be found.
          </p>
          <div className='flex flex-row py-6 gap-2'>
            <Link
              href='/'
              className='bg-primary text-white px-4 py-2 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-[32px]'
            >
              Return to home
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
