'use client'

import Image from 'next/image'
import React from 'react'

interface Company {
  name: string
  image: string
  width: number
}

interface CompanyLogoProps {
  company: Company
}

const companies: Company[] = [
  { name: 'Cambridge', image: '/assets/images/home/cambridge.png', width: 180 },
  { name: 'Creu', image: '/assets/images/creu.jpeg', width: 100 },
  { name: 'Chicago', image: '/assets/images/home/chicago.png', width: 180 },
  { name: 'Cintron', image: '/assets/images/cintron.png', width: 160 },
  { name: 'ProTrainings', image: '/assets/images/home/xpro.png', width: 160 },
  { name: 'BeAmazed', image: '/assets/images/beamazed.png', width: 170 },
]

const CompanyLogo = ({ company }: CompanyLogoProps) => (
  <div className='flex-shrink-0 px-8 flex items-center justify-center h-32'>
    <div className='relative w-36 h-12 sm:w-48 sm:h-16 flex items-center justify-center'>
      <Image
        src={company.image}
        alt={`${company.name} logo`}
        className='object-contain max-w-full max-h-full'
        fill
        priority={true}
        style={{ objectFit: 'contain' }}
      />
    </div>
  </div>
)

const Partners = () => (
  <section className='mt-16 flex justify-center'>
    <div className='w-full xl:max-w-screen-xl space-y-8'>
      <div className='relative flex justify-center'>
        <div className='w-full relative'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full relative'>
              <div className='absolute w-full h-px -top-px opacity-20 bg-gradient-to-r from-transparent via-gray-300 to-transparent blur-sm' />
              <div className='w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent' />
              <div className='absolute w-full h-px top-px opacity-30 bg-gradient-to-r from-transparent via-gray-300 to-transparent blur-sm' />
            </div>
          </div>
          <div className='relative flex justify-center'>
            <span className='px-6 bg-background text-sm font-semibold text-gray-600'>
              TRUSTED BY LEADING COMPANIES
            </span>
          </div>
        </div>
      </div>

      <div className='relative w-full'>
        <div className='absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-background via-background to-transparent z-10' />
        <div className='absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-background via-background to-transparent z-10' />

        <div className='relative overflow-hidden'>
          <div className='flex animate-marquee'>
            {companies.map((company, idx) => (
              <CompanyLogo key={`${company.name}-1-${idx}`} company={company} />
            ))}
            {companies.map((company, idx) => (
              <CompanyLogo key={`${company.name}-2-${idx}`} company={company} />
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
)

export default Partners
