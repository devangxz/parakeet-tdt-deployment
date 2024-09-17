import Image from 'next/image'
import React, { useEffect, useState } from 'react'

const services = [
  { image: '/assets/images/home/hammer.svg', title: 'Legal' },
  { image: '/assets/images/home/hammer.svg', title: 'Academic' },
  { image: '/assets/images/home/hammer.svg', title: 'Video' },
  { image: '/assets/images/home/hammer.svg', title: 'Sermon' },
  { image: '/assets/images/home/hammer.svg', title: 'Podcast' },
  { image: '/assets/images/home/hammer.svg', title: 'Marketing' },
]

const SideImage = () => {
  const [currentService, setCurrentService] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentService(
        (currentService) => (currentService + 1) % services.length
      )
    }, 2000)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className='hidden bg-[#322078] lg:block p-[5rem] space-y-[2rem]'>
      <span className='text-white text-[1.5rem]'>
        Transcription & Formatting made easy for :
      </span>
      <span className='text-[#36F0C3] text-[2rem] flex items-center gap-2 animate-flip-along-x repeat-infinite'>
        {services[currentService]?.title}{' '}
        <i>
          <Image
            src={services[currentService]?.image}
            className='bg-[#36F0C3] rounded-[50%] p-1'
            alt='Legal'
            width={38}
            height={38}
          />
        </i>
      </span>
      <div>
        <Image
          src='/assets/images/upload.png'
          alt='upload area'
          width={990}
          height={622}
          className='mx-auto'
        />
      </div>
      <div className='flex items-center gap-2'>
        <Image
          alt='AAERT'
          src='/assets/images/aaert.webp'
          width={120}
          height={55}
          className='rounded-[16px] bg-white'
        />
        <div className='text-white'>
          <p className='font-semibold text-[16px]'>
            We are now official sponsors of AAERT
          </p>
          <p className='text-[14px]'>
            American Association of Electronic Reporters And Transcribers
          </p>
        </div>
      </div>
    </div>
  )
}

export default SideImage
