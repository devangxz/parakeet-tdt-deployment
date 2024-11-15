'use client'
import Image from 'next/image'
import Link from 'next/link'

import WaveformBackground from './waveform-background'

export default function Hero() {
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
    <div className='relative flex justify-center px-5 mt-[2.5rem] sm:mt-[4rem]'>
      <WaveformBackground />   
      <div className='flex flex-col items-start max-w-full font-semibold md:items-center'>
        <div>
          <div className='text-4xl md:text-5xl leading-6 text-center'>
            <div className='flex items-center flex-col mt-5'>
              <span className='leading-[55px] md:leading-[70px]'>Human-in-the-loop <span className="text-primary">transcription</span></span>
              <span className='leading-[55px] md:leading-[70px]'>and <span className="text-primary">formatting</span> service</span>
            </div>
          </div>
        </div>

        <Link
          href='/signin'
          className='flex items-center gap-4 px-10 py-5 mx-auto mt-6 text-lg font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full shadow-lg transform transition-transform hover:scale-105'
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="shrink-0"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div className='flex flex-col items-start'>
            <span className='font-medium'>Upload Files For Free</span>
            <span className='text-sm opacity-80'>Starting @ $0.80/min</span>
          </div>
        </Link>
        
        <div className='self-center flex flex-col md:flex-row gap-x-5 gap-y-4 mt-8 mb-12 max-w-full'>
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
