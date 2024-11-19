'use client'
import Link from 'next/link'

import WaveformBackground from './waveform-background'

export default function Hero() {
  const features = [
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2.66669L2.66666 9.33335L16 16L29.3333 9.33335L16 2.66669Z" stroke="#6442ED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2.66666 22.6667L16 29.3333L29.3333 22.6667" stroke="#6442ED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2.66666 16L16 22.6667L29.3333 16" stroke="#6442ED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      text: 'Best industry prices'
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M26.6667 28V25.3333C26.6667 23.9188 26.1048 22.5623 25.1046 21.5621C24.1044 20.5619 22.7479 20 21.3333 20H10.6667C9.25217 20 7.89562 20.5619 6.89543 21.5621C5.89523 22.5623 5.33333 23.9188 5.33333 25.3333V28" stroke="#6442ED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 14.6667C18.9455 14.6667 21.3333 12.2789 21.3333 9.33333C21.3333 6.38781 18.9455 4 16 4C13.0545 4 10.6667 6.38781 10.6667 9.33333C10.6667 12.2789 13.0545 14.6667 16 14.6667Z" stroke="#6442ED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      text: 'Human verified'
    },
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24.7 12.1877V13.0002C24.6988 15.2714 24.0216 17.4884 22.7597 19.3834C21.4978 21.2783 19.7078 22.7672 17.6252 23.6636C15.5426 24.56 13.2518 24.8239 11.0318 24.4237C8.81187 24.0235 6.75897 22.9765 5.12624 21.4111C3.49351 19.8458 2.35814 17.8312 1.86595 15.6211C1.37377 13.411 1.54831 11.1022 2.36635 8.9748C3.18439 6.84738 4.60805 5.0874 6.45251 3.84137C8.29697 2.59535 10.4803 1.92292 12.725 1.91685" stroke="#6442ED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M24.7 4.33353L13 16.0435L9.75 12.7935" stroke="#6442ED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      text: '50K+ verified transcribers'
    },
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.4167 22.75V20.5833C18.4167 19.4674 17.9732 18.3976 17.1855 17.6099C16.3978 16.8222 15.328 16.3787 14.2121 16.3787H5.80371C4.68782 16.3787 3.61802 16.8222 2.83033 17.6099C2.04264 18.3976 1.59913 19.4674 1.59913 20.5833V22.75" stroke="#6442ED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10.0079 12.1667C12.3353 12.1667 14.2125 10.2895 14.2125 7.96208C14.2125 5.63464 12.3353 3.75745 10.0079 3.75745C7.68045 3.75745 5.80325 5.63464 5.80325 7.96208C5.80325 10.2895 7.68045 12.1667 10.0079 12.1667Z" stroke="#6442ED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M24.4009 22.7498V20.5831C24.4001 19.6488 24.0846 18.7405 23.5001 17.9873C22.9156 17.2341 22.0947 16.6762 21.1634 16.3955" stroke="#6442ED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16.9588 3.77417C17.8937 4.05288 18.7185 4.61056 19.3061 5.36526C19.8937 6.11995 20.2112 7.03099 20.2112 7.96796C20.2112 8.90493 19.8937 9.81596 19.3061 10.5707C18.7185 11.3254 17.8937 11.883 16.9588 12.1617" stroke="#6442ED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      text: 'Team Collaboration'
    }
  ]

  return (
    <section className='relative flex justify-center px-5 mt-[2.5rem] sm:mt-[4rem]'>
      <WaveformBackground />   
      <div className='flex flex-col items-start max-w-full font-semibold md:items-center'>
        {/* Hero Heading */}
        <header className='mb-12'>
          <h1 className='text-4xl md:text-5xl leading-6 text-center'>
            <div className='flex items-center flex-col mt-5'>
              <span className='leading-[55px] md:leading-[70px]'>Human-in-the-loop <span className="text-primary">transcription</span></span>
              <span className='leading-[55px] md:leading-[70px]'>and <span className="text-primary">formatting</span> service</span>
            </div>
          </h1>
        </header>

        {/* CTA Button */}
        <Link
          href='/signin'
          className='flex items-center gap-4 px-10 py-5 mx-auto mb-8 text-lg font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full shadow-lg transform transition-transform hover:scale-105'
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
        
        {/* Features List */}
        <div className='self-center flex flex-col md:flex-row gap-x-8 gap-y-6 mt-8 mb-16 max-w-full'>
          {features.map((feature, index) => (
            <div
              key={index}
              className={`flex gap-x-3 items-center ${(index === 2 || index === 3) && 'ml-1'}`}
            >
              {feature.icon}
              <span className='text-base md:text-sm lg:text-base font-normal'>
                {feature.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
