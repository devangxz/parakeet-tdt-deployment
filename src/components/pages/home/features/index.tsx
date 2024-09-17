'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
// import { useEffect, useState } from 'react'
export default function Features() {
  const router = useRouter()
  // const [currentWordIndex, setCurrentWordIndex] = useState(0)
  // const [isFlipping, setIsFlipping] = useState(false)
  // const contentArray = ['custom formats', 'custom formats', 'custom formats']
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setIsFlipping(true)
  //     setTimeout(() => {
  //       setCurrentWordIndex(
  //         (prevIndex) => (prevIndex + 1) % contentArray.length
  //       )
  //       setIsFlipping(false)
  //     }, 500)
  //   }, 1000)

  //   return () => clearInterval(interval)
  // }, [contentArray.length])
  const features = [
    {
      img: '/assets/images/home/tag.svg',
      text: 'Best industry prices',
      size: 32,
    },
    {
      img: '/assets/images/home/human.svg',
      text: 'Human verified',
      size: 32,
    },
    {
      img: '/assets/images/home/verified.svg',
      text: '50K+ verified transcribers',
      size: 26,
    },
    {
      img: '/assets/images/home/team.svg',
      text: 'Team Collaboration',
      size: 26,
    },
  ]

  return (
    <div className='flex justify-center px-5 mt-[2.5rem] sm:mt-[4rem]'>
      <div className='flex flex-col items-start max-w-full font-semibold md:items-center space-y-[3rem]'>
        <div>
          <div className='text-4xl md:text-5xl leading-6 text-center'>
            {/* Accurate{' '}
            <span
              className='text-[#6442ED] animate-fade duration-2000 ease-in-out inline-block'
              key={0}
            >
              <div
                className={`flex items-center justify-center backface-hidden transition-transform duration-2000 ${
                  isFlipping ? 'animate-flip-out' : 'animate-flip-in'
                }`}
              >
                {contentArray[currentWordIndex]}
              </div>
            </span>{' '}
            delivered
            <br />
            starting at $0.80 */}
            <div className='text-primary flex items-center flex-col'>
              <span className='leading-[55px] md:leading-[70px]'>Transcription services and Formatting</span>
              <span className='leading-[55px] md:leading-[70px] max-w-[450px] sm:max-w-full'>
                Tailored to your needs.
                <span className='ml-3 text-sm text-black h-fit'>Starting @ $0.80/min</span>
              </span>
            </div>
          </div>
        </div>

        <Link
          href='/signin'
          className='flex gap-2.5 justify-center px-6 py-4 mt-0 mx-auto text-md leading-5 text-white bg-indigo-600 rounded-[32px]'
        >
          <Image
            loading='lazy'
            src='/assets/images/home/upload.svg'
            className='w-5 aspect-square text-md'
            alt='upload'
            width={20}
            height={20}
            onClick={() => router.push('/files/upload')}
          />
          Upload Files For Free
        </Link>
        <div className='self-center flex flex-col md:flex-row gap-x-5 gap-y-4 mt-[2rem] max-w-full'>
          {features.map((feature, index) => (
            <div
              key={index}
              className={`flex gap-x-[2px] items-center ${(index === 2 || index === 3) && 'ml-1 gap-x-[5px] md:gap-x-[3px]'}`}
            >
              <Image
                loading='lazy'
                src={feature.img}
                alt={`${feature?.text}`}
                width={feature?.size}
                height={feature?.size}
              />
              <span className='text-base md:text-sm lg:text-base font-normal'>
                {feature.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
