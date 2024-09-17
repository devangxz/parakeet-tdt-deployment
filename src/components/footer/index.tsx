import Image from 'next/image'
import Link from 'next/link'

function Footer() {
  return (
    <div className='flex justify-center items-center px-7 xl:px-[10%] self-stretch w-full bg-indigo-900'>
      <div className='flex flex-col my-8'>
        <div className='flex flex-col lg:flex-row gap-x-[6rem] gap-y-[20px] md:gap-y-[40px] md:mt-10 max-md:max-w-full'>
          <div>
            <Link href='/' className='w-[20%]'>
              <div className='flex gap-[10px] my-auto'>
                <Image
                  loading='lazy'
                  src='/assets/images/logo-white-variant.svg'
                  className='aspect-rectangle'
                  alt='Scribie'
                  width={36}
                  height={36}
                />
                <span className='text-white font-bold text-3xl'>scribie</span>
              </div>
            </Link>
            <div className='flex gap-5 justify-between mt-5 max-md:flex-wrap max-md:max-w-full'>
              <div className='flex flex-col text-sm text-white'>
                <div className='text-lg font-semibold'>
                  <Link href='/'>Contact us</Link>
                </div>
                <div className='flex gap-2.5 justify-between mt-4 leading-6 whitespace-nowrap'>
                  <Image
                    loading='lazy'
                    src='/assets/images/home/location.svg'
                    className='my-auto w-4 aspect-square'
                    alt='44 Tehama St, San Francisco'
                    width={16}
                    height={16}
                  />
                  <div className='grow text-slate-400'>
                    44 Tehama St, San Francisco
                  </div>
                </div>
                <div className='flex gap-2.5 justify-between mt-4 leading-6'>
                  <Image
                    loading='lazy'
                    src='/assets/images/home/call.svg'
                    className='my-auto w-4 aspect-square text-white'
                    alt='+1 (866) 941 - 4131'
                    width={16}
                    height={16}
                  />
                  <div className='flex-auto text-slate-400'>
                    +1 (866) 941 - 4131
                  </div>
                </div>
                {/* <div className='hidden md:flex gap-2.5 justify-between mt-4 leading-6'>
                  <Image
                    loading='lazy'
                    src='/assets/images/home/chat.svg'
                    className='my-auto w-4 aspect-square'
                    alt='+1 (866) 941 - 4131'
                    width={16}
                    height={16}
                  />
                  <div className='flex-auto text-slate-400'>Live Chat</div>
                </div> */}
              </div>
            </div>
          </div>
          <div className='grid grid-cols-2 md:flex max-md:flex-col max-md:gap-0 w-[80%]'>
            <div className='flex flex-col w-3/12 max-md:ml-0 max-md:w-full'>
              <div className='flex flex-col grow self-stretch whitespace-nowrap max-md:mt-10'>
                <div className='text-lg font-semibold text-white'>Company</div>
                <div className='mt-4 text-lg leading-6 text-slate-400'>
                  <Link href='/about-us'>About Us</Link>
                </div>
                {/* <div className='flex mt-4 w-fit gap-4'>
                  <div className='grow text-lg leading-6 text-slate-400'>
                    <Link href='/'>Careers</Link>
                  </div>
                  <div className='px-2 py-1 my-auto text-[.5rem] font-semibold text-indigo-900 bg-teal-400 rounded-r-xl rounded-t-xl aspect-[3.44]'>
                    <Link href='/'>We’re hiring</Link>
                  </div>
                </div> */}
                <div className='mt-4 text-lg leading-6 text-slate-400'>
                  <Link href='/'>Blog</Link>
                </div>
                <div className='mt-4 text-lg leading-6 text-slate-400'>
                  <Link href='/get-quote'>Get a Quote</Link>
                </div>
              </div>
            </div>
            <div className='flex flex-col ml-5 w-3/12 max-md:ml-0 max-md:w-full'>
              <div className='flex flex-col grow self-stretch text-lg text-white whitespace-nowrap max-md:mt-10'>
                <div className='font-semibold'>Account</div>
                {/* <div className='mt-4 leading-[150%] text-slate-400'>
                  <Link href='/register'>Register</Link>
                </div> */}
                <div className='mt-4 leading-[150%] text-slate-400'>
                  <Link href='/signin'>Log In</Link>
                </div>
                <div className='mt-4 leading-[150%] text-slate-400'>
                  <Link href='/files/all-files'>Files</Link>
                </div>
                {/* <div className='mt-4 leading-[150%] text-slate-400'>
                  <Link href='/settings/personal-info'>Settings</Link>
                </div> */}
              </div>
            </div>
            <div className='flex flex-col ml-5 w-3/12 max-md:ml-0 max-md:w-full'>
              <div className='flex flex-col grow self-stretch text-lg text-white whitespace-nowrap max-md:mt-10'>
                <div className='font-semibold'>Resources</div>
                {/* <div className='mt-4 leading-[150%] text-slate-400'>
                  <Link href='/'>API Reference</Link>
                </div> */}
                <div className='mt-4 leading-[150%] text-slate-400'>
                  <Link href='/faq'>FAQ</Link>
                </div>
                <div className='mt-4 leading-[150%] text-slate-400'>
                  <Link href='/contact'>Support</Link>
                </div>
              </div>
            </div>
            <div className='flex flex-col ml-5 w-3/12 max-md:ml-0 max-md:w-full'>
              <div className='flex flex-col text-lg text-white max-md:mt-10'>
                <div className='font-semibold'>Comparison</div>
                <div className='mt-4 whitespace-nowrap leading-[150%] text-slate-400'>
                  <Link href='https://scribie.com/blog/2019/06/rev-scribie-comparison/'>
                    Compare with Rev
                  </Link>
                </div>
                <div className='mt-4 leading-6 text-slate-400'>
                  <Link href='https://scribie.com/blog/2019/09/scribie-gotranscript-business-transcription/'>
                    Compare with GoTranscript
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='shrink-0 md:mt-10 h-0.5 bg-white-[20%] max-md:max-w-full' />

        <div className='shrink-0 mt-10 h-0.5 bg-slate-500 opacity-5 max-md:max-w-full' />

        <div className='flex justify-between items-center mt-4 gap-x-8'>
          <div className='text-sm leading-6 text-slate-400 whitespace-nowrap'>
            <Link href='/privacy-policy'>Privacy & Policy</Link> /{' '}
            <Link href='/terms'>Terms</Link>
          </div>
          <div className='flex gap-5 justify-between self-end max-w-full w-[120px]'>
            <Link href='https://twitter.com/scribie_com?ref_src=twsrc%5Egoogle%7Ctwcamp%5Eserp%7Ctwgr%5Eauthor'>
              <Image
                alt='Twitter'
                loading='lazy'
                src='/assets/images/home/X.svg'
                className='flex-1 shrink-0 w-full aspect-square'
                width={24}
                height={24}
              />
            </Link>
            <Link href='https://www.linkedin.com/company/scribie'>
              <Image
                alt='Linkedin'
                loading='lazy'
                src='./assets/images/home/linkedin.svg'
                className='flex-1 shrink-0 w-full aspect-square'
                width={24}
                height={24}
              />
            </Link>
            <Link href='https://www.facebook.com/scribie.transcription/'>
              <Image
                alt='Facebook'
                loading='lazy'
                src='./assets/images/home/facebook.svg'
                className='flex-1 shrink-0 w-full aspect-square'
                width={24}
                height={24}
              />
            </Link>
          </div>
        </div>
        <div className='self-center mt-10 text-sm leading-6 text-center text-white max-w-full md:max-w-[75%]'>
          © scribie. 2008-{new Date().getFullYear()} CGBiz Corporation. All
          rights reserved.
          <br />
          When you visit or interact with our sites, services or tools, we or
          our authorised service providers may use cookies for storing
          information to help provide you with a better, faster and safer
          experience and for marketing purposes.
        </div>
      </div>
    </div>
  )
}

export default Footer
