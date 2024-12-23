'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

export default function Page() {
  const router = useRouter()
  return (
    <div className='mx-auto flex flex-col items-center'>
      <h4 className='text-[1.2rem] my-[1rem]'>About us</h4>
      <h1 className='text-[3.5rem] text-center font-bold'>
        Making audio/video <br />
        <span className='text-primary'>
          Transcription & Custom formatting
        </span>{' '}
        <br />
        accurate & painless
      </h1>
      <div className='stats w-full flex justify-around my-[2rem]'>
        <div className='stat'>
          <h2 className='text-[2rem] font-semibold'>16+ years</h2>
          <p className='text-[1.2rem]'>Transcription experience</p>
        </div>
        <div className='stat'>
          <h2 className='text-[2rem] font-semibold'>50,000+</h2>
          <p className='text-[1.2rem]'>Quality Transcribers</p>
        </div>
        <div className='stat'>
          <h2 className='text-[2rem] font-semibold'>100%</h2>
          <p className='text-[1.2rem]'>Remote Employees</p>
        </div>
      </div>
      <div className='w-[80%] bg-[#322078] rounded-[2rem] px-[4rem] pt-[4rem] space-y-[2rem] my-[5rem]'>
        <h2 className='text-[2.75rem] text-white font-bold text-center w-3/4 mx-auto'>
          Transcription made easy with our refined product like no other!
        </h2>
        <Image
          src='/assets/images/upload.png'
          alt='upload area'
          width={990}
          height={622}
          className='mx-auto'
        />
      </div>
      {/* core team  */}
      <div className='w-full flex justify-center bg-primary/10'>
        {' '}
        <div className='w-[80%] py-[5rem]'>
          <h4 className='text-[1.2rem] text-center'>Core Team</h4>
          <h2 className='text-[2.75rem] text-center font-bold'>
            The wizards behind
          </h2>
          {/* team */}
          <div className='grid grid-cols-2 gap-[4rem] p-[2rem]'>
            <div className='w-full text-center mx-auto space-y-3'>
              <Image
                src='/assets/images/Rajiv.png'
                alt='Advisor to the board'
                width={132}
                height={132}
                className='mx-auto'
              />
              <p className='text-[1.2rem] font-bold'>Rajiv Poddar</p>
              <p className='text-[1.2rem] font-bold text-primary'>
                CHIEF TECHNOLOGY OFFICER
              </p>
              <p className='text-black/8 text-center'>
                Rajiv is an Electronics and Telecommunications graduate from NIT
                Silchar, India. He joined Tata Consultancy Services (TCS), Delhi
                as a IT Analyst in August 1999 and worked there till 2003. In
                March 2003, Rajiv moved to Bangalore, India and joined Lucent
                Technologies where he worked for another 3 years. In 2006 he
                left Lucent to start his own venture and founded Scribie.com in
                2008. Rajiv can be reached at rajiv@scribie.com.
              </p>
              <Link
                target='_blank'
                href='https://www.linkedin.com/in/rajivpoddar/'
              >
                <Image
                  src='/assets/images/Linkedin.svg'
                  alt='Linkedin'
                  width={32}
                  height={32}
                  className='mx-auto'
                />
              </Link>
            </div>
            <div className='w-full text-center mx-auto space-y-3'>
              <Image
                src='/assets/images/Yukti.png'
                alt='Advisor to the board'
                width={132}
                height={132}
                className='mx-auto'
              />
              <p className='text-[1.2rem] font-bold'>Yukti Yatish</p>
              <p className='text-[1.2rem] font-bold text-primary'>
                CHIEF EXECUTIVE OFFICER
              </p>
              <p className='text-black/8 text-center'>
                Yukti is an Electronics Engineering graduate from Visvesvaraya
                Technological University (VTU), India. She has worked at Nokia
                Siemens Networks, IBM and FInastra, Bangalore at various
                leadership positions. She has a strong background in Telecom and
                FInance domain and extensive hands-on expertise in software
                development as well customer support and escalation management.
                She can be reached at yukti@scribie.com.
              </p>
              <Link
                target='_blank'
                href='https://www.linkedin.com/in/yuktiyatish/'
              >
                <Image
                  src='/assets/images/Linkedin.svg'
                  alt='Linkedin'
                  width={32}
                  height={32}
                  className='mx-auto'
                />
              </Link>
            </div>
          </div>

          {/* <div className='w-[80%] bg-white mx-auto flex justify-between p-[2rem] rounded-lg items-center'>
          <p className='text-[1.2rem] font-bold'>
            Come work for us & build a world class transcription service
          </p>
          <Button>Apply Here</Button>
        </div> */}
        </div>
      </div>

      <div className='my-[5rem]'>
        <h2 className='text-[2.75rem] text-center font-bold'>
          Interested? <br />
          <span className='text-primary'>Reach out</span> to us or{' '}
          <span className='text-primary'>Request a demo</span>
        </h2>

        <div className='flex justify-center gap-4 mt-[2rem]'>
          <Button
            onClick={() => router.push('/contact')}
            className='bg-white text-black text-lg p-6'
          >
            Contact Us
          </Button>
          <Button
            onClick={() => router.push('/get-demo')}
            className='bg-primary text-white text-lg p-6'
          >
            Request Demo
          </Button>
        </div>
      </div>
    </div>
  )
}
