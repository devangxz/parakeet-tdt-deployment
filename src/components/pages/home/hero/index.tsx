'use client'

import { Upload, Tag, CheckCircle, Users, Network } from 'lucide-react'
import Link from 'next/link'

import WaveformBackground from './waveform-background'

export default function Hero() {
  const features = [
    {
      icon: <Tag size={26} className='text-primary' />,
      text: 'Best Industry Prices',
    },
    {
      icon: <CheckCircle size={26} className='text-primary' />,
      text: 'Human Verified',
    },
    {
      icon: <Users size={26} className='text-primary' />,
      text: '50K+ Verified Transcribers',
    },
    {
      icon: <Network size={26} className='text-primary' />,
      text: 'Team Collaboration',
    },
  ]

  return (
    <main className='relative mt-16 sm:mt-20 md:mt-24 lg:mt-32 flex justify-center px-4 sm:px-6 lg:px-8'>
      <div className='hidden lg:block'>
        <WaveformBackground />
      </div>
      <div className='max-w-[90rem] flex flex-col items-start font-semibold md:items-center'>
        <header className='mb-12 text-center'>
          <h1 className='text-4xl md:text-5xl lg:text-6xl font-bold text-foreground max-w-3xl lg:max-w-5xl mx-auto leading-tight md:leading-[1.3] lg:leading-[1.1]'>
            Human-in-the-loop{' '}
            <span className='text-primary'>transcription</span> and{' '}
            <span className='text-primary'>formatting</span> service
          </h1>
        </header>

        <Link
          href='/signin'
          className='flex items-center gap-4 px-10 py-5 mx-auto mb-8 text-lg font-semibold text-primary-foreground bg-primary rounded-full shadow-lg transform transition-transform hover:scale-105'
        >
          <Upload size={24} />
          <div className='flex flex-col items-start'>
            <span className='font-medium'>Upload Files For Free</span>
            <span className='text-sm opacity-90'>Starting @ $0.80/min</span>
          </div>
        </Link>

        <div className='self-center flex flex-col md:grid md:grid-cols-2 lg:flex lg:flex-row gap-x-8 gap-y-6 mt-8 mb-16 max-w-5xl'>
          {features.map((feature, index) => (
            <div
              key={index}
              className='flex gap-x-2 items-center md:justify-center lg:justify-start'
            >
              {feature.icon}
              <span className='font-medium text-foreground'>
                {feature.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
